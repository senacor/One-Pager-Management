import { Client } from '@microsoft/microsoft-graph-client';
import { List, ListItem, Site } from '@microsoft/microsoft-graph-types';
import { FORCE_REFRESH } from '../../../configuration/CachingHandler';
import {
    Employee,
    EmployeeID,
    Logger,
    OnePager,
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
    // URL = 'Links', // text field, 1-line, URL
}

type ListItemWithFields = {
    [ListItemColumnNames.MA_ID]: string | number;
    [ListItemColumnNames.VALIDATION_ERRORS]: string;
    // [ListItemColumnNames.URL]: string;
    [ListItemColumnNames.MA_NAME]: string;
    [ListItemColumnNames.MA_EMAIL]: string;
    [ListItemColumnNames.MA_CURR_POSITION]: string; // 'NO_POSITION' if no value since '' and ' ' do not work well with sharepoint
    [ListItemColumnNames.VALIDATION_DATE]: string;
    [ListItemColumnNames.LAST_MODIFIED_DATE]: string; // 'NO_DATE' if no value since '' and ' ' do not work well with sharepoint
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
        // ListItemColumnNames.URL in record &&
        // typeof record[ListItemColumnNames.URL] === 'string' &&
        ListItemColumnNames.MA_NAME in record &&
        typeof record[ListItemColumnNames.MA_NAME] === 'string' &&
        ListItemColumnNames.MA_EMAIL in record &&
        typeof record[ListItemColumnNames.MA_EMAIL] === 'string' &&
        ListItemColumnNames.MA_CURR_POSITION in record &&
        ['string'].includes(typeof record[ListItemColumnNames.MA_CURR_POSITION]) &&
        ListItemColumnNames.VALIDATION_DATE in record &&
        typeof record[ListItemColumnNames.VALIDATION_DATE] === 'string' &&
        ListItemColumnNames.LAST_MODIFIED_DATE in record &&
        ['string'].includes(typeof record[ListItemColumnNames.LAST_MODIFIED_DATE])
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
    async reportValid(id: EmployeeID): Promise<void> {
        const itemId = await this.getItemIdOfEmployee(id);

        if (itemId !== undefined) {
            this.logger.log(`Reporting valid one-pager for employee with ID "${id}"!`);
            await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`)
                .delete();
        }
    }


    private formatOnePagerErrorOutput(validatedOnePagers: ValidatedOnePager[]): string {
        const onePagers: (ValidatedOnePager & {onePager: OnePager})[] = validatedOnePagers.filter((op: ValidatedOnePager) => op.onePager !== undefined) as (ValidatedOnePager & {onePager: OnePager})[];
        const generalErrors: string = validatedOnePagers.filter((op: ValidatedOnePager) => op.onePager === undefined).map((op) => op.errors.join('<br>')).join('<br>');

        const onePagerErrors: string = onePagers.map((op: ValidatedOnePager & {onePager: OnePager}) => {
                return `<a href="${op.onePager.webLocation}">${op.onePager.name}</a>: ${op.errors.join(', ')}`;
            }).join('<br>')
        const output: string =
            `${generalErrors}${onePagerErrors !== '' ? `<br>${onePagerErrors}` : ''}`;

        return output;
    }

    private parseOnePagerErrorOutput(
        output: string
    ): ValidatedOnePager[] {
        const onePagers: ValidatedOnePager[] = [];
        const contentMatch = output.match(/<div class="[^"]+">(.+)<\/div>/);

        if (!contentMatch || contentMatch.length < 2) {
            return onePagers; // Return empty array if no content found
        }

        const lines = contentMatch[1].split('<br>');
        for (const line of lines) {
            const match = line.match(/<div class="[^"]+"><a href="([^"]+)">([^<]+)<\/a>: (.+)<\/div>/);
            if (match) {
                const [, url, name, errors] = match;
                onePagers.push({
                    onePager: {
                        webLocation: new URL(url),
                        name,
                        lastUpdateByEmployee: new Date(), // Placeholder, as we don't have the actual date here
                        local: undefined, // Placeholder, as we don't have the actual language here
                        data: async () => Buffer.from(''), // Placeholder, as we don't have the actual data here
                    },
                    errors: errors.split(', ') as ValidationError[],
                });
            } else if (line.trim() !== '') {
                // Handle general errors without a one-pager link
                onePagers.push({ onePager: undefined, errors: [line as ValidationError] });
            }
        }
        return onePagers;
    }


    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which a given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors An array of validation errors found in the one-pager.
     */
    async reportErrors(
        id: EmployeeID,
        validatedOnePagers: ValidatedOnePager[],
        employee: Employee
    ): Promise<void> {
        const itemId = await this.getItemIdOfEmployee(id);

        this.logger.log(
            `Reporting the following errors for employee with id "${id}" and onePager ${JSON.stringify(validatedOnePagers)}: ${JSON.stringify(validatedOnePagers.flatMap((op) => op.errors))}`
        );

        const loadedOnePagers: (ValidatedOnePager & {onePager: OnePager})[] = validatedOnePagers.filter((op: ValidatedOnePager) => op.onePager !== undefined) as (ValidatedOnePager & {onePager: OnePager})[];
        const newestLoadedOnePager: ValidatedOnePager | undefined = loadedOnePagers.reduce((prev: ValidatedOnePager, curr: ValidatedOnePager & {onePager: OnePager}) => {
            if (!prev.onePager) {
                return curr;
            }
            return curr.onePager.lastUpdateByEmployee > prev.onePager.lastUpdateByEmployee ? curr : prev;
        }, {onePager: undefined, errors: []} as ValidatedOnePager);

        // const onePagerUrls: string[] = onePagers.map((op: ValidatedOnePager & {onePager: OnePager}) => op.onePager?.webLocation.toString());
        if (itemId === undefined) {
            this.logger.log(`Creating a new list entry for employee with ID "${id}"!`);
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
                fields: {
                    [ListItemColumnNames.MA_ID]: id,
                    [ListItemColumnNames.VALIDATION_ERRORS]: this.formatOnePagerErrorOutput(validatedOnePagers),
                    // [ListItemColumnNames.URL]: onePagerUrls.map((opURL: string) => `<a href="${opURL}">Link zum OnePager</a>`).join('\n'),
                    [ListItemColumnNames.MA_NAME]: employee.name,
                    [ListItemColumnNames.MA_EMAIL]: `<a href="mailto: ${employee.email}">${employee.email}</a>`,
                    [ListItemColumnNames.MA_CURR_POSITION]: employee.position_current || 'NO_POSITION',
                    [ListItemColumnNames.VALIDATION_DATE]: this.dateToEnglishFormat(new Date()),
                    [ListItemColumnNames.LAST_MODIFIED_DATE]:
                        this.dateToEnglishFormat(newestLoadedOnePager.onePager?.lastUpdateByEmployee) || 'NO_DATE',
                },
            });
        } else {
            this.logger.log(`Updating existing list entry for employee with ID "${id}"!`);
            await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}/fields`)
                .patch({
                    [ListItemColumnNames.VALIDATION_ERRORS]: this.formatOnePagerErrorOutput(validatedOnePagers),
                    // [ListItemColumnNames.URL]: onePagerUrls.map((opURL: string) => `<a href="${opURL}">Link zum OnePager</a>`).join('\n'),
                    [ListItemColumnNames.MA_NAME]: employee.name,
                    [ListItemColumnNames.MA_EMAIL]: `<a href="mailto: ${employee.email}">${employee.email}</a>`,
                    [ListItemColumnNames.MA_CURR_POSITION]: employee.position_current || 'NO_POSITION',
                    [ListItemColumnNames.VALIDATION_DATE]: this.dateToEnglishFormat(new Date()),
                    [ListItemColumnNames.LAST_MODIFIED_DATE]:
                        this.dateToEnglishFormat(newestLoadedOnePager.onePager?.lastUpdateByEmployee) || 'NO_DATE',
                });
        }
    }

    /**
     * This function retrieves the validation results for a given employee ID.
     * @param id The employee ID for which to get the validation results.
     * @returns An array of validation errors for the specified employee.
     */
    async getResultFor(id: EmployeeID): Promise<ValidatedOnePager[]> {
        this.logger.log(`Getting results for employee with id "${id}"!`);

        const itemId = await this.getItemIdOfEmployee(id);

        if (!itemId) {
            return [];
        }

        const item = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`)
            .headers(FORCE_REFRESH)
            .select('fields')
            .get()) as ListItem;

        this.logger.log(
            `Retrieved item fields for employee with ID "${id}": ${JSON.stringify(item.fields)}`
        );

        if (!item.fields || !isListItemWithFields(item.fields)) {
            this.logger.error(
                `Item with ID "${itemId}" does not have the expected fields structure!`
            );
            return [];
        }
        const itemFields: ListItemWithFields = item.fields;

        this.logger.log(
            `Parsed item fields for employee with ID "${id}": ${JSON.stringify(this.parseOnePagerErrorOutput(itemFields[ListItemColumnNames.VALIDATION_ERRORS]))}`
        );

        return this.parseOnePagerErrorOutput(itemFields[ListItemColumnNames.VALIDATION_ERRORS]);
    }

    /**
     * This auxiliary function retrieves the item ID of an employee based on their employee ID.
     * @param id The employee ID to search for in the SharePoint list.
     * @returns The ID of the list entry corresponding to the employee, or undefined if not found.
     */
    private async getItemIdOfEmployee(id: EmployeeID): Promise<string | undefined> {
        this.logger.log(`Getting item ID for employee with ID "${id}"!`);

        const { value: entries } = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
            .headers(FORCE_REFRESH)
            .filter(`fields/${ListItemColumnNames.MA_ID} eq '${id}'`)
            .get()) as { value?: ListItem[] };
        const [entry] = entries || [];
        return entry?.id;
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
