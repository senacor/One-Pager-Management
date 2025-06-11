import { Client } from "@microsoft/microsoft-graph-client";
import { createSharepointClient, SharepointClientOptions } from "../../configuration/AppConfiguration";
import { Logger, MailAdapter, EmailAddress, isEmailAddress } from "../DomainTypes";


class MailSender implements MailAdapter {
    private readonly client: Client;
    private readonly logger: Logger;

    constructor(client: Client, logger: Logger = console) {
        this.client = client;
        this.logger = logger;
    }

    async sendMail(to: EmailAddress[], subject: string, body: string): Promise<void> {
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
                    contentType: 'Text',
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
                saveToSentItems: 'false'
            }
        };

        const sendMailResp = await this.client.api('/users/staffing@senacor.com/sendMail').post(sendMailObject);
        this.logger.log('Mail sent successfully:', sendMailResp);
    }
}



(async function () {

    const client = await createSharepointClient({
        SHAREPOINT_TENANT_ID: process.env.SHAREPOINT_TENANT_ID,
        SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID,
        SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET,
        SHAREPOINT_API_LOGGING: 'true',
        SHAREPOINT_API_CACHING: 'false'
    } as SharepointClientOptions);

    const mailSender = new MailSender(client, console);
    await mailSender.sendMail(['artjom.konschin@senacor.com'], 'Test Subject', 'This is a test email body.');


})();
