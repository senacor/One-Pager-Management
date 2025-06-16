import { Client } from "@microsoft/microsoft-graph-client";
import { Logger, MailAdapter, EmailAddress, isEmailAddress } from "../../DomainTypes";
import { createSharepointClient, SharepointClientOptions } from "../../../configuration/AppConfiguration";


export class MSMailAdapter implements MailAdapter {
    private readonly client: Client | undefined;
    private readonly logger: Logger;

    constructor(client: Client | undefined = undefined, logger: Logger = console) {
        this.client = client;
        this.logger = logger;
    }

    async sendMail(to: EmailAddress[], subject: string, body: string): Promise<void> {
        if (!this.client) {
            throw new Error('Mail client is not initialized. Please provide a valid Microsoft Graph client.');
        }

        if (to.length === 0) {
            this.logger.log('No recipients provided, skipping email sending.');
            return;
        }
        if (to.some(email => !isEmailAddress(email))) {
            throw new Error('Invalid email address provided in recipients list.');
        }

        const sendMailObject = {
            message: {
                subject: subject,
                body: {
                    contentType: 'HTML', // e.g. Text or HTML
                    content: body
                },
                toRecipients: to.map(email => {
                    return {
                        emailAddress: {
                            address: email
                        }
                    };
                }),
                // ccRecipients: [
                //     {
                //         emailAddress: {
                //             address: 'email'
                //         }
                //     }
                // ],
                // saveToSentItems: 'false'
            }
        };

        const sendMailResp = await this.client.api('/users/staffing@senacor.com/sendMail').post(sendMailObject);
        this.logger.log('Mail sent successfully:', sendMailResp);
    }
}



// (async function () {

//     const client = await createSharepointClient({
//         SHAREPOINT_TENANT_ID: process.env.SHAREPOINT_TENANT_ID,
//         SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID,
//         SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET,
//         SHAREPOINT_API_LOGGING: 'true',
//         SHAREPOINT_API_CACHING: 'false'
//     } as SharepointClientOptions);

//     const mailSender = new MSMailAdapter(client, console);
//     await mailSender.sendMail(['artjom.konschin@senacor.com'], 'Test Subject', 'This is a <b>test</b> email body.');


// })();
