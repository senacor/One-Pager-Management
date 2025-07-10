import { Client } from '@microsoft/microsoft-graph-client';
import { List, ListItem, Site } from '@microsoft/microsoft-graph-types';
import { FORCE_REFRESH } from '../../../configuration/CachingHandler';
import {
    dateToString,
    Employee,
    EmployeeID,
    Local,
    LocalEnum,
    LocalToValidatedOnePager,
    Logger,
    stringToDate,
    ValidatedOnePager,
    ValidationError,
    ValidationReporter,
} from '../../DomainTypes';
import moment from 'moment';

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
    FILENAME = 'Filename', // text field, 1-line, file name of the one-pager
    FOLDER_URL = 'Folder_URL', // text field, 1-line, URL to the folder containing the one-pager
}

type ListItemWithFields = {
    [ListItemColumnNames.MA_ID]: string | number;
    [ListItemColumnNames.VALIDATION_ERRORS]?: string;
    [ListItemColumnNames.URL]: string;
    [ListItemColumnNames.MA_NAME]: string;
    [ListItemColumnNames.MA_EMAIL]: string;
    [ListItemColumnNames.MA_CURR_POSITION]: string; // 'NO_POSITION' if no value since '' and ' ' do not work well with sharepoint
    [ListItemColumnNames.VALIDATION_DATE]: string;
    [ListItemColumnNames.LAST_MODIFIED_DATE]: string; // 'NO_DATE' if no value since '' and ' ' do not work well with sharepoint
    [ListItemColumnNames.ONE_PAGER_LANGUAGE]: string; // 'DE' or 'EN'
    [ListItemColumnNames.FILENAME]?: string; // optional, file name of the one-pager
    [ListItemColumnNames.FOLDER_URL]?: string; // optional, URL to the folder containing the one-pager
};
function isListItemWithFields(item: unknown): item is ListItemWithFields {
    if (item === null || typeof item !== 'object') {
        return false;
    }
    const record = item as { [key: string]: unknown };
    return (
        ListItemColumnNames.MA_ID in record &&
        ['string', 'number'].includes(typeof record[ListItemColumnNames.MA_ID]) &&
        (!(ListItemColumnNames.VALIDATION_ERRORS in record) ||
        typeof record[ListItemColumnNames.VALIDATION_ERRORS] === 'string') &&
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
        ['string'].includes(typeof record[ListItemColumnNames.ONE_PAGER_LANGUAGE]) &&
        (!(ListItemColumnNames.FILENAME in record) ||
        typeof record[ListItemColumnNames.FILENAME] === 'string') &&
        (!(ListItemColumnNames.FOLDER_URL in record) ||
        typeof record[ListItemColumnNames.FOLDER_URL] === 'string')
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
    async reportValid(id: EmployeeID, validatedOnePager: ValidatedOnePager, local: Local, employee: Employee): Promise<void> {
        // const itemId = await this.getItemIdOfEmployee(id, local);

        // if (itemId !== undefined) {
        //     this.logger.log(`Reporting valid one-pager for employee with ID "${id}"!`);
        //     // await this.client
        //     //     .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`)
        //     //     .delete();
        // } else {

        // }
        await this.reportErrors(id, validatedOnePager, local, employee);
    }


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
                    [ListItemColumnNames.VALIDATION_DATE]: dateToString(new Date()),
                    [ListItemColumnNames.LAST_MODIFIED_DATE]:
                        dateToString(validatedOnePager.onePager?.lastUpdateByEmployee) || 'NO_DATE',
                    [ListItemColumnNames.ONE_PAGER_LANGUAGE]: local,
                    [ListItemColumnNames.FILENAME]: validatedOnePager.onePager?.fileName || 'NO_FILENAME',
                    [ListItemColumnNames.FOLDER_URL]: validatedOnePager.folderURL ? validatedOnePager.folderURL.toString() : 'NO_FOLDER_URL',
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
                    [ListItemColumnNames.VALIDATION_DATE]: dateToString(new Date()) || 'NO_DATE',
                    [ListItemColumnNames.LAST_MODIFIED_DATE]:
                        dateToString(validatedOnePager.onePager?.lastUpdateByEmployee) || 'NO_DATE',
                    [ListItemColumnNames.ONE_PAGER_LANGUAGE]: local,
                    [ListItemColumnNames.FILENAME]: validatedOnePager.onePager?.fileName || 'NO_FILENAME',
                    [ListItemColumnNames.FOLDER_URL]: validatedOnePager.folderURL ? validatedOnePager.folderURL.toString() : 'NO_FOLDER_URL',
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
            [LocalEnum.DE]: { onePager: undefined, errors: [], folderURL: undefined },
            [LocalEnum.EN]: { onePager: undefined, errors: [], folderURL: undefined },
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
                `Retrieved item fields for employee with ID "${id}" in language "${local}": ${JSON.stringify(item.fields)}`
            );

            if (!item.fields || !isListItemWithFields(item.fields)) {
                this.logger.error(
                    `Item with ID "${itemIds[local]}" does not have the expected fields structure!`
                );
                continue;
            }

            const itemFields: ListItemWithFields = item.fields;

            let folderURL: URL | undefined = undefined;
            try {
                if (itemFields[ListItemColumnNames.FOLDER_URL] && itemFields[ListItemColumnNames.FOLDER_URL] !== '') {
                    folderURL = new URL(itemFields[ListItemColumnNames.FOLDER_URL]);
                }
            } catch {
                this.logger.log(
                    `Invalid URL "${itemFields[ListItemColumnNames.FOLDER_URL]}" for employee with ID "${id}"!`
                );
            }

            result[local] = {
                onePager:
                    itemFields[ListItemColumnNames.URL] !== 'NO_URL'
                    && itemFields[ListItemColumnNames.LAST_MODIFIED_DATE]
                    ? {
                        webLocation: new URL(itemFields[ListItemColumnNames.URL]),
                        fileName: itemFields[ListItemColumnNames.FILENAME] || 'NO_FILENAME',
                        lastUpdateByEmployee: moment(itemFields[ListItemColumnNames.LAST_MODIFIED_DATE], "MM/DD/YYYY", true).isValid() ? stringToDate(itemFields[ListItemColumnNames.LAST_MODIFIED_DATE]) as Date : new Date(),
                        local: local,
                        data: async () => Buffer.from(''), // Placeholder, as we don't have the actual data here
                    } : undefined,
                errors: itemFields[ListItemColumnNames.VALIDATION_ERRORS]
                    ? itemFields[ListItemColumnNames.VALIDATION_ERRORS].split(', ') as ValidationError[]
                    : [],
                folderURL,
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

        this.logger.log(`Retrieved entries for employee with ID "${id}" and local "${local}": ${entries.map(e => e.id).join(', ')}`);


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
                items.map(async item =>
                    await this.client
                        .api(`/sites/${this.siteId}/lists/${this.listId}/items/${item.id}`)
                        .delete()
                )
            );
        }
    }

    async cleanUpValidationList(validEmployees: EmployeeID[]): Promise<void> {
        this.logger.log(`Cleaning up validation list!`);

        // get all items
        const { value: items } = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
            .headers(FORCE_REFRESH)
            .get()) as { value?: ListItem[] };

        if (!items) {
            this.logger.log('No items found in the validation list to clean up.');
            return;
        }


        const itemsToDelete = (await Promise.all(items.map(async item => {
            const itemWithFields = (await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${item.id}`)
                .headers(FORCE_REFRESH)
                .select('fields')
                .get()) as ListItem;

            const fields = itemWithFields.fields as ListItemWithFields;
            return [fields === undefined || !validEmployees.includes(`${fields[ListItemColumnNames.MA_ID]}` as EmployeeID), item.id];
        }))).filter((item => item[0]));

        if (itemsToDelete.length === 0) {
            this.logger.log('No items to delete in the validation list.');
            return;
        }

        await Promise.all(
            itemsToDelete.map(async ([, itemID]) =>
                await this.client
                    .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemID}`)
                    .delete()
            )
        );

        this.logger.log(`Deleted ${itemsToDelete.length} items from the validation list.`);
    }
}
