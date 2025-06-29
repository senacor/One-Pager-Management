import { Client } from '@microsoft/microsoft-graph-client';
import { List, ListItem, Site } from '@microsoft/microsoft-graph-types';
import { FORCE_REFRESH } from '../../../configuration/CachingHandler';
import {
    Employee,
    EmployeeID,
    Local,
    LocalEnum,
    LocalToValidatedOnePager,
    Logger,
    ValidatedOnePager,
    ValidationError,
    ValidationReporter,
} from '../../DomainTypes';

const enum ListItemColumnNames {
    MA_ID = 'Employee_ID', // number
    MA_NAME = 'Name', // text field, 1-line
    MA_CURR_POSITION = 'Current_Position', // text field, 1-line
    MA_EMAIL = 'E_Mail_Address', // text field, multiline, richtext
    VALIDATION_ERRORS = 'Errors', // text field, multiline, richtext
    VALIDATION_DATE = 'Validation_Date', // text field, 1-line, date format MM/DD/YYYY
    LAST_MODIFIED_DATE = 'Date_of_Last_Change', // text field, 1-line, date format MM/DD/YYYY
    URL = 'Links', // text field, 1-line, URL
    ONE_PAGER_LANGUAGE = 'Language_of_Version',
}

type ListItemWithFields = {
    [ListItemColumnNames.MA_ID]: string | number;
    [ListItemColumnNames.VALIDATION_ERRORS]: string;
    [ListItemColumnNames.URL]: string;
    [ListItemColumnNames.MA_NAME]: string;
    [ListItemColumnNames.MA_EMAIL]: string;
    [ListItemColumnNames.MA_CURR_POSITION]: string; // 'NO_POSITION' if no value since '' and ' ' do not work well with sharepoint
    [ListItemColumnNames.VALIDATION_DATE]: string;
    [ListItemColumnNames.LAST_MODIFIED_DATE]: string; // 'NO_DATE' if no value since '' and ' ' do not work well with sharepoint
    [ListItemColumnNames.ONE_PAGER_LANGUAGE]: string; // 'DE' or 'EN'
};
function isListItemWithFields(item: unknown): item is ListItemWithFields {
    if (item === null || typeof item !== 'object') {
        return false;
    }
    const record = item as { [key: string]: unknown };
    return (
        ListItemColumnNames.MA_ID in record &&
        ['string', 'number'].includes(typeof record[ListItemColumnNames.MA_ID]) &&
        ListItemColumnNames.VALIDATION_ERRORS in record &&
        typeof record[ListItemColumnNames.VALIDATION_ERRORS] === 'string' &&
        ListItemColumnNames.URL in record &&
        typeof record[ListItemColumnNames.URL] === 'string' &&
        ListItemColumnNames.MA_NAME in record &&
        typeof record[ListItemColumnNames.MA_NAME] === 'string' &&
        ListItemColumnNames.MA_EMAIL in record &&
        typeof record[ListItemColumnNames.MA_EMAIL] === 'string' &&
        ListItemColumnNames.MA_CURR_POSITION in record &&
        ['string'].includes(typeof record[ListItemColumnNames.MA_CURR_POSITION]) &&
        ListItemColumnNames.VALIDATION_DATE in record &&
        typeof record[ListItemColumnNames.VALIDATION_DATE] === 'string' &&
        ListItemColumnNames.LAST_MODIFIED_DATE in record &&
        ['string'].includes(typeof record[ListItemColumnNames.LAST_MODIFIED_DATE]) &&
        ListItemColumnNames.ONE_PAGER_LANGUAGE in record &&
        ['string'].includes(typeof record[ListItemColumnNames.ONE_PAGER_LANGUAGE])
    );
}

/**
 * A class that implements the ValidationReporter interface for reporting validation results to a SharePoint list.
 * It allows reporting valid one-pagers, errors found during validation, and retrieving validation results for specific employees.
 */
export class SharepointListValidationReporter implements ValidationReporter {
    private readonly listId: string;
    private readonly client: Client;
    private readonly siteId: string;
    private readonly logger: Logger;

    /**
     * Creates an instance of SharepointListValidationReporter.
     * This constructor is private to enforce the use of the static `getInstance` method for instantiation.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param listId The ID of the SharePoint list where validation results will be stored.
     * @param siteId The ID of the SharePoint site where the list is located.
     * @param logger The logger to use for logging messages (default is console).
     */
    private constructor(client: Client, listId: string, siteId: string, logger: Logger = console) {
        this.client = client;
        this.listId = listId;
        this.siteId = siteId;
        this.logger = logger;
    }

    private dateToEnglishFormat(date: Date | undefined): string | undefined {
        if (date === undefined) {
            return undefined;
        }

        return `${(date.getUTCMonth()+1).toString().padStart(2, '0')}/${date.getUTCDate().toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
    }

    /**
     * This static method creates an instance of the SharepointListValidationReporter.
     * It fetches the site and list information from SharePoint using the provided client and site alias.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param siteAlias The name/alias of the SharePoint site where the list is located.
     * @param listDisplayName The name of the SharePoint list where validation results will be stored.
     * @param logger The logger to use for logging messages (default is console).
     * @returns A promise that resolves to an instance of SharepointListValidationReporter.
     */
    public static async getInstance(
        client: Client,
        siteAlias: string,
        listDisplayName: string,
        logger: Logger = console
    ): Promise<SharepointListValidationReporter> {
        const maInfoSite = (await client.api(`/sites/${siteAlias}`).get()) as Site | undefined;
        if (!maInfoSite || !maInfoSite.id) {
            throw new Error(`Cannot find site with alias "${siteAlias}" !`);
        }

        const { value: lists } = (await client.api(`/sites/${maInfoSite.id}/lists`).get()) as {
            value?: List[];
        };
        if (!lists) {
            throw new Error(`Cannot fetch lists for site with alias "${siteAlias}" !`);
        }

        const listItems = lists.filter(list => list.displayName === listDisplayName);
        if (
            listItems.length === 0 ||
            listItems[0].id === undefined ||
            typeof listItems[0].id !== 'string'
        ) {
            throw new Error(
                `Cannot find list with name "${listDisplayName}" on site "${siteAlias}" !`
            );
        }

        return new SharepointListValidationReporter(client, listItems[0].id, maInfoSite.id, logger);
    }

    /**
     * This function reports that an employee has valid one-pagers by removing any existing validation reports for that employee if they exist.
     * @param id The employee ID for which the one-pager is valid.
     */
    async reportValid(id: EmployeeID, local: Local): Promise<void> {
        const itemId = await this.getItemIdOfEmployee(id, local);

        if (itemId !== undefined) {
            this.logger.log(`Reporting valid one-pager for employee with ID "${id}"!`);
            await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`)
                .delete();
        }
    }


    // private formatOnePagerErrorOutput(validatedOnePagers: ValidatedOnePager[]): string {
    //     const onePagers: (ValidatedOnePager & {onePager: OnePager})[] = validatedOnePagers.filter((op: ValidatedOnePager) => op.onePager !== undefined) as (ValidatedOnePager & {onePager: OnePager})[];
    //     const generalErrors: string = validatedOnePagers.filter((op: ValidatedOnePager) => op.onePager === undefined).map((op) => op.errors.join('<br>')).join('<br>');

    //     const onePagerErrors: string = onePagers.map((op: ValidatedOnePager & {onePager: OnePager}) => {
    //             return `<a href="${op.onePager.webLocation}">${op.onePager.name}</a>: ${op.errors.join(', ')}`;
    //         }).join('<br>')
    //     const output: string =
    //         `${generalErrors}${onePagerErrors !== '' ? `<br>${onePagerErrors}` : ''}`;

    //     return output;
    // }

    // private parseOnePagerErrorOutput(
    //     output: string
    // ): ValidatedOnePager[] {
    //     const onePagers: ValidatedOnePager[] = [];
    //     const contentMatch = output.match(/<div class="[^"]+">(.+)<\/div>/);

    //     if (!contentMatch || contentMatch.length < 2) {
    //         return onePagers; // Return empty array if no content found
    //     }

    //     const lines = contentMatch[1].split('<br>');
    //     for (const line of lines) {
    //         const match = line.match(/<div class="[^"]+"><a href="([^"]+)">([^<]+)<\/a>: (.+)<\/div>/);
    //         if (match) {
    //             const [, url, name, errors] = match;
    //             onePagers.push({
    //                 onePager: {
    //                     webLocation: new URL(url),
    //                     name,
    //                     lastUpdateByEmployee: new Date(), // Placeholder, as we don't have the actual date here
    //                     local: undefined, // Placeholder, as we don't have the actual language here
    //                     data: async () => Buffer.from(''), // Placeholder, as we don't have the actual data here
    //                 },
    //                 errors: errors.split(', ') as ValidationError[],
    //             });
    //         } else if (line.trim() !== '') {
    //             // Handle general errors without a one-pager link
    //             onePagers.push({ onePager: undefined, errors: [line as ValidationError] });
    //         }
    //     }
    //     return onePagers;
    // }


    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which a given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors An array of validation errors found in the one-pager.
     */
    async reportErrors(
        id: EmployeeID,
        validatedOnePager: ValidatedOnePager,
        local: Local,
        employee: Employee
    ): Promise<void> {
        const itemId: string | undefined = await this.getItemIdOfEmployee(id, local);

        this.logger.log(`Item ID for employee with ID "${id}": ${JSON.stringify(itemId)}`);

        this.logger.log(
            `Reporting the following errors for employee with id "${id}" and onePager ${JSON.stringify(validatedOnePager)}: ${JSON.stringify(validatedOnePager.errors)}`
        );

        if (itemId === undefined) {
            this.logger.log(`Creating a new list entry for employee with ID "${id}"!`);
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
                fields: {
                    [ListItemColumnNames.MA_ID]: id,
                    [ListItemColumnNames.VALIDATION_ERRORS]: validatedOnePager.errors.join(', '),
                    [ListItemColumnNames.URL]: validatedOnePager.onePager?.webLocation || 'NO_URL',
                    [ListItemColumnNames.MA_NAME]: employee.name,
                    [ListItemColumnNames.MA_EMAIL]: employee.email,
                    [ListItemColumnNames.MA_CURR_POSITION]: employee.position_current || 'NO_POSITION',
                    [ListItemColumnNames.VALIDATION_DATE]: this.dateToEnglishFormat(new Date()),
                    [ListItemColumnNames.LAST_MODIFIED_DATE]:
                        this.dateToEnglishFormat(validatedOnePager.onePager?.lastUpdateByEmployee) || 'NO_DATE',
                    [ListItemColumnNames.ONE_PAGER_LANGUAGE]: local,
                },
            });
        } else {
            this.logger.log(`Updating existing list entry for employee with ID "${id}"!`);
            await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}/fields`)
                .patch({
                    [ListItemColumnNames.VALIDATION_ERRORS]: validatedOnePager.errors.join(', '),
                    [ListItemColumnNames.URL]: validatedOnePager.onePager?.webLocation || 'NO_URL',
                    [ListItemColumnNames.MA_NAME]: employee.name,
                    [ListItemColumnNames.MA_EMAIL]: employee.email,
                    [ListItemColumnNames.MA_CURR_POSITION]: employee.position_current || 'NO_POSITION',
                    [ListItemColumnNames.VALIDATION_DATE]: this.dateToEnglishFormat(new Date()),
                    [ListItemColumnNames.LAST_MODIFIED_DATE]:
                        this.dateToEnglishFormat(validatedOnePager.onePager?.lastUpdateByEmployee) || 'NO_DATE',
                    [ListItemColumnNames.ONE_PAGER_LANGUAGE]: local,
                });
        }
    }

    /**
     * This function retrieves the validation results for a given employee ID.
     * @param id The employee ID for which to get the validation results.
     * @returns An array of validation errors for the specified employee.
     */
    async getResultFor(id: EmployeeID): Promise<LocalToValidatedOnePager> {
        this.logger.log(`Getting results for employee with id "${id}"!`);

        const itemIds: {[local in Local]: string | undefined} = Object.assign({}, ...(await Promise.all(Object.values(LocalEnum).map(async (local) => {
            return { [local]: await this.getItemIdOfEmployee(id, local) };
        }))));

        const result: LocalToValidatedOnePager = {
            [LocalEnum.DE]: { onePager: undefined, errors: [] },
            [LocalEnum.EN]: { onePager: undefined, errors: [] }
        };

        if (!itemIds.DE && !itemIds.EN) {
            return result;
        }

        let local: Local; // not defined in loop so that it has type Local

        for (local in itemIds) {
            if (itemIds[local] === undefined) {
                this.logger.log(`No item ID found for employee with ID "${id}" in language "${local}"!`);
                continue;
            }

            // eslint-disable-next-line no-await-in-loop
            const item = (await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemIds[local]}`)
                .headers(FORCE_REFRESH)
                .select('fields')
                .get()) as ListItem;

            this.logger.log(
                `Retrieved DE item fields for employee with ID "${id}" in language "${local}": ${JSON.stringify(item.fields)}`
            );

            if (!item.fields || !isListItemWithFields(item.fields)) {
                this.logger.error(
                    `Item with ID "${itemIds[local]}" does not have the expected fields structure!`
                );
                continue;
            }

            const itemFields: ListItemWithFields = item.fields;

            this.logger.log(
                `Parsed item fields for employee with ID "${id}" in language "${local}": ${JSON.stringify(itemFields[ListItemColumnNames.VALIDATION_ERRORS])}`
            );

            result[local] = {
                onePager: itemFields[ListItemColumnNames.URL] && itemFields[ListItemColumnNames.URL] !== 'NO_URL' ? {
                    webLocation: new URL(itemFields[ListItemColumnNames.URL]),
                    name: itemFields[ListItemColumnNames.MA_NAME],
                    lastUpdateByEmployee: new Date(itemFields[ListItemColumnNames.LAST_MODIFIED_DATE]),
                    local: local,
                    data: async () => Buffer.from(''), // Placeholder, as we don't have the actual data here
                } : undefined,
                errors: itemFields[ListItemColumnNames.VALIDATION_ERRORS].split(', ') as ValidationError[]
            };
        }

        return result;
    }

    /**
     * This auxiliary function retrieves the item ID of an employee based on their employee ID.
     * @param id The employee ID to search for in the SharePoint list.
     * @returns The ID of the list entry corresponding to the employee, or undefined if not found.
     */
    private async getItemIdOfEmployee(id: EmployeeID, local: Local): Promise<string | undefined> {
        this.logger.log(`Getting item ID for employee with ID "${id}"!`);

        const { value: entries } = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
            .headers(FORCE_REFRESH)
            .filter(`fields/${ListItemColumnNames.MA_ID} eq '${id}' and fields/${ListItemColumnNames.ONE_PAGER_LANGUAGE} eq '${local}'`)
            .get()) as { value?: ListItem[] };

        if (!entries) {
            return undefined;
        }

        this.logger.log(`Retrieved entries for employee with ID "${id}": ${JSON.stringify(entries)}`);


        return entries.length > 0
            ? entries[0].id
            : undefined;
    }

    /**
     * This function clears the SharePoint list by deleting all items in it.
     */
    async clearList(): Promise<void> {
        this.logger.log(
            `Clearing SharePoint list with ID "${this.listId}" on site "${this.siteId}"!`
        );

        const { value: items } = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
            .headers(FORCE_REFRESH)
            .get()) as { value?: ListItem[] };

        if (items) {
            await Promise.all(
                items.map(item =>
                    this.client
                        .api(`/sites/${this.siteId}/lists/${this.listId}/items/${item.id}`)
                        .delete()
                )
            );
        }
    }
}
