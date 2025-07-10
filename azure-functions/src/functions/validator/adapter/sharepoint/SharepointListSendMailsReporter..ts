import { Client } from '@microsoft/microsoft-graph-client';
import {
    List,
    // ListItem,
    Site
} from '@microsoft/microsoft-graph-types';
// import { FORCE_REFRESH } from '../../../configuration/CachingHandler';
import {
    EmployeeID,
    Local,
    Logger,
    ValidatedOnePager,
    MailReporter,
    dateToString,
} from '../../DomainTypes';

const enum ListItemColumnNames {
    MA_ID = 'Employee_ID', // number
    VALIDATION_ERRORS = 'Errors', // text field, multiline, richtext
    SEND_DATE = 'Date', // text field, 1-line, date format MM/DD/YYYY
    ONE_PAGER_LANGUAGE = 'Language_of_Version',
}


export class SharepointListSendMailsReporter implements MailReporter {
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


    public static async getInstance(
        client: Client,
        siteAlias: string,
        listDisplayName: string,
        logger: Logger = console
    ): Promise<SharepointListSendMailsReporter> {
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

        return new SharepointListSendMailsReporter(client, listItems[0].id, maInfoSite.id, logger);
    }





    async reportMail(
        id: EmployeeID,
        validatedOnePager: ValidatedOnePager,
        local: Local,
    ): Promise<void> {
        // const itemId: string | undefined = await this.getItemIdOfEmployee(id, local);

        // this.logger.log(`Item ID for employee with ID "${id}": ${JSON.stringify(itemId)}`);

        this.logger.log(
            `Reporting the following errors for employee with id "${id}" and onePager ${JSON.stringify(validatedOnePager)}: ${JSON.stringify(validatedOnePager.errors)}`
        );

        // if (itemId === undefined) {
        this.logger.log(`Creating a new list entry for employee with ID "${id}"!`);
        await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
            fields: {
                [ListItemColumnNames.MA_ID]: id,
                [ListItemColumnNames.VALIDATION_ERRORS]: validatedOnePager.errors.join(', '),
                [ListItemColumnNames.SEND_DATE]: dateToString(new Date()),
                [ListItemColumnNames.ONE_PAGER_LANGUAGE]: local,
            },
        });
        // } else {
        //     this.logger.log(`Updating existing list entry for employee with ID "${id}"!`);
        //     await this.client
        //         .api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}/fields`)
        //         .patch({
        //             [ListItemColumnNames.VALIDATION_ERRORS]: validatedOnePager.errors.join(', '),
        //             [ListItemColumnNames.SEND_DATE]: dateToString(new Date()),
        //         });
        // }
    }


    // private async getItemIdOfEmployee(id: EmployeeID, local: Local): Promise<string | undefined> {
    //     this.logger.log(`Getting item ID for employee with ID "${id}"!`);

    //     const { value: entries } = (await this.client
    //         .api(`/sites/${this.siteId}/lists/${this.listId}/items`)
    //         .headers(FORCE_REFRESH)
    //         .filter(`fields/${ListItemColumnNames.MA_ID} eq '${id}' and fields/${ListItemColumnNames.ONE_PAGER_LANGUAGE} eq '${local}' and fields/${ListItemColumnNames.SEND_DATE} eq '${this.dateToEnglishFormat(new Date())}'`)
    //         .get()) as { value?: ListItem[] };

    //     if (!entries) {
    //         return undefined;
    //     }

    //     this.logger.log(`Retrieved entries for employee with ID "${id}": ${JSON.stringify(entries)}`);


    //     return entries.length > 0
    //         ? entries[0].id
    //         : undefined;
    // }

}
