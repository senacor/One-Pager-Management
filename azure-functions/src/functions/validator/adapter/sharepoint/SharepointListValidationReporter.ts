import { Client } from '@microsoft/microsoft-graph-client';
import { List, ListItem, Site } from '@microsoft/microsoft-graph-types';
import { FORCE_REFRESH } from '../../../configuration/CachingHandler';
import { EmployeeID, Logger, OnePager, ValidationError, ValidationReporter } from '../../DomainTypes';

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
        logger: Logger = console,
    ): Promise<SharepointListValidationReporter> {
        const maInfoSite = (await client.api(`/sites/${siteAlias}`).get()) as Site | undefined;
        if (!maInfoSite || !maInfoSite.id) {
            logger.error(
                `(SharepointListValidationReporter.ts: getInstance) Cannot find site with alias "${siteAlias}" !`,
            );
            throw new Error(
                `(SharepointListValidationReporter.ts: getInstance) Cannot find site with alias "${siteAlias}" !`,
            );
        }

        const { value: lists } = (await client.api(`/sites/${maInfoSite.id}/lists`).get()) as {
            value?: List[];
        };
        if (!lists) {
            logger.error(
                `(SharepointListValidationReporter.ts: getInstance) Cannot fetch lists for site with alias "${siteAlias}" !`,
            );
            throw new Error(
                `(SharepointListValidationReporter.ts: getInstance) Cannot fetch lists for site with alias "${siteAlias}" !`,
            );
        }

        const [{ id: listId }] = lists.filter(list => list.displayName === listDisplayName);
        if (!listId) {
            logger.error(
                `(SharepointListValidationReporter.ts: getInstance) Cannot find list with name "${listDisplayName}" on site "${siteAlias}" !`,
            );
            throw new Error(
                `(SharepointListValidationReporter.ts: getInstance) Cannot find list with name "${listDisplayName}" on site "${siteAlias}" !`,
            );
        }
        return new SharepointListValidationReporter(client, listId, maInfoSite.id, logger);
    }

    /**
     * This function reports that an employee has valid one-pagers by removing any existing validation reports for that employee if they exist.
     * @param id The employee ID for which the one-pager is valid.
     */
    async reportValid(id: EmployeeID): Promise<void> {
        const itemId = await this.getItemIdOfEmployee(id);

        if (itemId !== undefined) {
            this.logger.log(
                `(SharepointListValidationReporter.ts: reportValid) Reporting valid one-pager for employee with ID "${id}"!`,
            );
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`).delete();
        }
    }

    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which a given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors An array of validation errors found in the one-pager.
     */
    async reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void> {
        const itemId = await this.getItemIdOfEmployee(id);

        this.logger.log(
            `(SharepointListValidationReporter.ts: reportErrors) Reporting the following errors for employee with id "${id}" and onePager ${JSON.stringify(onePager)}: ${JSON.stringify(errors)}`,
        );

        const onePagerUrl = onePager?.webLocation ? onePager.webLocation.toString() : '';
        if (itemId === undefined) {
            this.logger.log(
                `(SharepointListValidationReporter.ts: reportErrors) Creating a new list entry for employee with ID "${id}"!`,
            );
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
                fields: {
                    MitarbeiterID: id,
                    Festgestellte_Fehler: errors.join('\n'),
                    Location: onePagerUrl,
                },
            });
        } else {
            this.logger.log(
                `(SharepointListValidationReporter.ts: reportErrors) Updating existing list entry for employee with ID "${id}"!`,
            );
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}/fields`).patch({
                Festgestellte_Fehler: errors.join('\n'),
                Location: onePagerUrl,
            });
        }
    }

    /**
     * This function retrieves the validation results for a given employee ID.
     * @param id The employee ID for which to get the validation results.
     * @returns An array of validation errors for the specified employee.
     */
    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
        this.logger.log(
            `(SharepointListValidationReporter.ts: getResultFor) Getting results for employee with id "${id}"!`,
        );

        const itemId = await this.getItemIdOfEmployee(id);

        if (!itemId) {
            return [];
        }

        const item = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`)
            .headers(FORCE_REFRESH)
            .select('fields')
            .get()) as ListItem;
        if (!item.fields) {
            return [];
        } else {
            //TODO: runtime type check
            return (item.fields as Record<string, string>).Festgestellte_Fehler.split('\n') as ValidationError[];
        }
    }

    /**
     * This auxiliary function retrieves the item ID of an employee based on their employee ID.
     * @param id The employee ID to search for in the SharePoint list.
     * @returns The ID of the list entry corresponding to the employee, or undefined if not found.
     */
    private async getItemIdOfEmployee(id: EmployeeID): Promise<string | undefined> {
        this.logger.log(
            `(SharepointListValidationReporter.ts: getItemIdOfEmployee) Getting item ID for employee with ID "${id}"!`,
        );

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
            `(SharepointListValidationReporter.ts: clearList) Clearing SharePoint list with ID "${this.listId}" on site "${this.siteId}"!`,
        );

        const { value: items } = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
            .headers(FORCE_REFRESH)
            .get()) as { value?: ListItem[] };

        if (items) {
            await Promise.all(
                items.map(item =>
                    this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${item.id}`).delete(),
                ),
            );
        }
    }
}
