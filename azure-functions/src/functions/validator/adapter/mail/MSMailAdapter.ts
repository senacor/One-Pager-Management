import { Client } from "@microsoft/microsoft-graph-client";
import { Logger, MailPort, EmailAddress } from "../../DomainTypes";

export class MSMailAdapter implements MailPort {
    private readonly client: Client | undefined;
    private readonly logger: Logger;

    constructor(client: Client, logger: Logger = console) {
        this.client = client;
        this.logger = logger;
    }

    async sendMail(emailAddress: EmailAddress, subject: string, content: string): Promise<void> {
        if (!this.client) {
            throw new Error('Mail client is not initialized. Please provide a valid Microsoft Graph client.');
        }

        const sendMailObject = {
            message: {
                subject: subject,
                body: {
                    contentType: 'HTML', // e.g. Text or HTML
                    content: content
                },
                toRecipients: {
                    emailAddress: {
                        address: emailAddress
                    }

                },
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


