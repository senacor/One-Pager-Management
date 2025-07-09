import { Client } from '@microsoft/microsoft-graph-client';
import { List, ListItem, Site } from '@microsoft/microsoft-graph-types';
import { FORCE_REFRESH } from '../../../configuration/CachingHandler';
import {
    EmployeeID,
    EmployeeToken,
    Logger,
    UseOfOnePagerReporter,
} from '../../DomainTypes';
import { createHash }  from 'node:crypto';

const enum ListItemColumnNames {
    MA_ID = 'Employee_ID', // number
    TOKEN = 'Employee_Token', // text field, 1-line, alphanumeric
    CONFIRMATION_DATE = 'Date_of_Confirmation', // text field, 1-line, date format MM/DD/YYYY
}

type ListItemWithFields = {
    [ListItemColumnNames.MA_ID]: string | number;
    [ListItemColumnNames.CONFIRMATION_DATE]?: string | null;
    [ListItemColumnNames.TOKEN]: string;
};
function isListItemWithFields(item: unknown): item is ListItemWithFields {
    if (item === null || typeof item !== 'object') {
        return false;
    }
    const record = item as { [key: string]: unknown };
    return (
        ListItemColumnNames.MA_ID in record &&
        ['string', 'number'].includes(typeof record[ListItemColumnNames.MA_ID]) &&
        ListItemColumnNames.TOKEN in record &&
        typeof record[ListItemColumnNames.TOKEN] === 'string' && (
            !(ListItemColumnNames.CONFIRMATION_DATE in record)
            || ['string', 'null'].includes(typeof record[ListItemColumnNames.CONFIRMATION_DATE])
        )
    );
}


export class SharepointListAllowUseOfOnePagers implements UseOfOnePagerReporter {
    private readonly listId: string;
    private readonly client: Client;
    private readonly siteId: string;
    private readonly logger: Logger;


    private constructor(client: Client, listId: string, siteId: string, logger: Logger = console) {
        this.client = client;
        this.listId = listId;
        this.siteId = siteId;
        this.logger = logger;
    }


    async getTokenOfEmployee(id: EmployeeID): Promise<EmployeeToken> {
        const itemId: string | undefined = await this.getItemIdOfEmployeeByEmployeeID(id);

        if (!itemId) {
            throw new Error(`No item found for employee with ID "${id}"!`);
        }

        const item = (await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`)
                .headers(FORCE_REFRESH)
                .select('fields')
                .get()) as ListItem;

        if (!item.fields || !isListItemWithFields(item.fields)) {
            throw new Error(`Item with ID "${itemId}" does not have the expected fields structure!`);
        }

        const itemFields: ListItemWithFields = item.fields;

        this.logger.log(
            `Parsed item fields for employee with ID "${id}"": ${JSON.stringify(itemFields)}`
        );

        return itemFields[ListItemColumnNames.TOKEN];
    }





    private dateToEnglishFormat(date: Date | undefined): string | undefined {
        if (date === undefined) {
            return undefined;
        }

        return `${(date.getUTCMonth()+1).toString().padStart(2, '0')}/${date.getUTCDate().toString().padStart(2, '0')}/${date.getUTCFullYear()}`;
    }


    public static async getInstance(
        client: Client,
        siteAlias: string,
        listDisplayName: string,
        logger: Logger = console
    ): Promise<SharepointListAllowUseOfOnePagers> {
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

        return new SharepointListAllowUseOfOnePagers(client, listItems[0].id, maInfoSite.id, logger);
    }



    async reportNewEmployee(
        id: EmployeeID
    ) {
        this.logger.log(`Reporting new employee with ID "${id}" to SharePoint list "${this.listId}"!`);

        const itemId: string | undefined = await this.getItemIdOfEmployeeByEmployeeID(id);

        if (itemId !== undefined) {
            this.logger.log(`Item ID for employee with ID "${id}" already exists: ${itemId}`);
            return;
        }


        this.logger.log(`Creating a new list entry for employee with ID "${id}"!`);
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
                fields: {
                    [ListItemColumnNames.MA_ID]: id,
                    [ListItemColumnNames.TOKEN]: createHash('sha256').update(`${id}_${Date.now()}`).digest('hex'),
                    [ListItemColumnNames.CONFIRMATION_DATE]: null,
                },
            });
    }



    async confirmUseOfOnePagerForEmployee(employeeToken: string, employeeId: EmployeeID): Promise<void> {
        const itemIdByToken: string | undefined = await this.getItemIdOfEmployeeByToken(employeeToken);
        const itemIdById: string | undefined = await this.getItemIdOfEmployeeByEmployeeID(employeeId);

        if (!itemIdByToken || !itemIdById || itemIdByToken !== itemIdById) {
            throw new Error(`Employee with token "${employeeToken}" and ID "${employeeId}" does not match!`);
        }

        this.logger.log(`Item ID for employee with ID "${employeeId}": ${JSON.stringify(itemIdByToken)}`);


        if (itemIdByToken === undefined) {
            throw new Error(`Cannot find item for employee with token "${employeeToken}"!`);
        } else {
            this.logger.log(`Updating existing list entry for employee with ID "${employeeToken}"!`);
            await this.client
                .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemIdByToken}/fields`)
                .patch({
                    [ListItemColumnNames.CONFIRMATION_DATE]: this.dateToEnglishFormat(new Date()),
                });
        }
    }

    async didEmployeeAllowUseOfOnePager(id: EmployeeID): Promise<boolean> {
        const itemId: string | undefined = await this.getItemIdOfEmployeeByEmployeeID(id);
        if (!itemId) {
            this.logger.error(`No item found for employee with ID "${id}"!`);
            return false;
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
            return false;
        }

        const itemFields: ListItemWithFields = item.fields;

        this.logger.log(
            `Parsed item fields for employee with ID "${id}"": ${JSON.stringify(itemFields)}`
        );
        return itemFields[ListItemColumnNames.CONFIRMATION_DATE] !== undefined
            && itemFields[ListItemColumnNames.CONFIRMATION_DATE] !== null
            && itemFields[ListItemColumnNames.CONFIRMATION_DATE] !== '';
    }


    private async getItemIdOfEmployeeByToken(employeeToken: EmployeeToken): Promise<string | undefined> {
        this.logger.log(`Getting item ID for employee with token "${employeeToken}"!`);

        const { value: entries } = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
            .headers(FORCE_REFRESH)
            .filter(`fields/${ListItemColumnNames.TOKEN} eq '${employeeToken}'`)
            .get()) as { value?: ListItem[] };

        if (!entries) {
            return undefined;
        }

        this.logger.log(`Retrieved entries for employee with token "${employeeToken}": ${JSON.stringify(entries)}`);


        return entries.length > 0
            ? entries[0].id
            : undefined;
    }

    private async getItemIdOfEmployeeByEmployeeID(employeeId: EmployeeID): Promise<string | undefined> {
        this.logger.log(`Getting item ID for employee with ID "${employeeId}"!`);

        const { value: entries } = (await this.client
            .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
            .headers(FORCE_REFRESH)
            .filter(`fields/${ListItemColumnNames.MA_ID} eq '${employeeId}'`)
            .get()) as { value?: ListItem[] };

        if (!entries) {
            return undefined;
        }

        this.logger.log(`Retrieved entries for employee with ID "${employeeId}": ${JSON.stringify(entries)}`);


        return entries.length > 0
            ? entries[0].id
            : undefined;
    }

}

