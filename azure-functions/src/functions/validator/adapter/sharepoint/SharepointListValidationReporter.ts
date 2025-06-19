import { Client } from '@microsoft/microsoft-graph-client';
import { List, ListItem, Site } from '@microsoft/microsoft-graph-types';
import { FORCE_REFRESH } from '../../../configuration/CachingHandler';
import {
    EmployeeData,
    EmployeeID,
    Logger,
    OnePager,
    ValidationError,
    ValidationReporter,
} from '../../DomainTypes';

/**
 * The name of the SharePoint list field that stores the employee ID.
 */
const COLUMN_MA_ID: string = 'MitarbeiterID';
/**
 * The name of the SharePoint list field that stores the validation errors.
 */
const COLUMN_VALIDATION_ERRORS: string = 'Festgestellte_Fehler';
/**
 * The name of the SharePoint list field that stores the URL of the one-pager.
 */
const COLUMN_URL: string = 'Location';

const COLUMN_MA_NAME: string = 'Name';

const COLUMN_MA_OFFICE: string = 'Office';

const COLUMN_MA_EMAIL: string = 'EMail_Adresse';

const COLUMN_MA_CURR_POSITION: string = 'Derzeitige_Position';

type ListItemWithFields = {
    [COLUMN_MA_ID]: string;
    [COLUMN_VALIDATION_ERRORS]: string;
    [COLUMN_URL]: string;
    [COLUMN_MA_NAME]: string;
    [COLUMN_MA_OFFICE]: string;
    [COLUMN_MA_EMAIL]: string;
    [COLUMN_MA_CURR_POSITION]: string | null;
};
function isListItemWithFields(item: unknown): item is ListItemWithFields {
    if (item === null || typeof item !== 'object') {
        return false;
    }
    const record = item as { [key: string]: unknown };
    return (
        COLUMN_MA_ID in record &&
        typeof record[COLUMN_MA_ID] === 'string' &&
        COLUMN_VALIDATION_ERRORS in record &&
        typeof record[COLUMN_VALIDATION_ERRORS] === 'string' &&
        COLUMN_URL in record &&
        typeof record[COLUMN_URL] === 'string' &&
        COLUMN_MA_NAME in record &&
        typeof record[COLUMN_MA_NAME] === 'string' &&
        COLUMN_MA_OFFICE in record &&
        typeof record[COLUMN_MA_OFFICE] === 'string' &&
        COLUMN_MA_EMAIL in record &&
        typeof record[COLUMN_MA_EMAIL] === 'string' &&
        COLUMN_MA_CURR_POSITION in record &&
        ['string', 'null'].includes(typeof record[COLUMN_MA_CURR_POSITION])
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
        if (listItems.length === 0 || listItems[0]["id"] === undefined || typeof listItems[0]["id"] !== "string") {
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

    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which a given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors An array of validation errors found in the one-pager.
     */
    async reportErrors(
        id: EmployeeID,
        onePager: OnePager | undefined,
        errors: ValidationError[],
        employee: EmployeeData
    ): Promise<void> {
        const itemId = await this.getItemIdOfEmployee(id);

        this.logger.log(
            `Reporting the following errors for employee with id "${id}" and onePager ${JSON.stringify(onePager)}: ${JSON.stringify(errors)}`
        );

        const onePagerUrl = onePager?.webLocation ? onePager.webLocation.toString() : '';
        if (itemId === undefined) {
            this.logger.log(`Creating a new list entry for employee with ID "${id}"!`);
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
                fields: {
                    [COLUMN_MA_ID]: id,
                    [COLUMN_VALIDATION_ERRORS]: errors.join('\n'),
                    [COLUMN_URL]: onePagerUrl,
                    [COLUMN_MA_NAME]: employee.name,
                    [COLUMN_MA_OFFICE]: employee.office,
                    [COLUMN_MA_EMAIL]: employee.email,
                    [COLUMN_MA_CURR_POSITION]: employee.position_current || ''
                },
            });
        } else {
            this.logger.log(`Updating existing list entry for employee with ID "${id}"!`);
            await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}/fields`)
                .patch({
                    [COLUMN_VALIDATION_ERRORS]: errors.join('\n'),
                    [COLUMN_URL]: onePagerUrl,
                });
        }
    }

    /**
     * This function retrieves the validation results for a given employee ID.
     * @param id The employee ID for which to get the validation results.
     * @returns An array of validation errors for the specified employee.
     */
    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
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



        if (!item.fields || !isListItemWithFields(item.fields)) {
            this.logger.error(
                `Item with ID "${itemId}" does not have the expected fields structure!`
            );
            return [];
        }
        const itemFields: ListItemWithFields = item.fields;

        return itemFields[COLUMN_VALIDATION_ERRORS]!.split('\n') as ValidationError[];

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
            .filter(`fields/MitarbeiterID eq '${id}'`)
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
