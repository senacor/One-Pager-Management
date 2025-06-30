import { Client } from '@microsoft/microsoft-graph-client';
import { Logger, MailPort, EmailAddress } from '../../DomainTypes';

export class MSMailAdapter implements MailPort {
    private readonly client: Client | undefined;
    private readonly logger: Logger;

    constructor(client: Client, logger: Logger = console) {
        this.client = client;
        this.logger = logger;
    }

    async sendMail(emailAddress: EmailAddress, subject: string, content: string): Promise<void> {
        if (!this.client) {
            throw new Error(
                'Mail client is not initialized. Please provide a valid Microsoft Graph client.'
            );
        }

        const sendMailObject = {
            message: {
                subject: subject,
                body: {
                    contentType: 'HTML', // e.g. Text or HTML
                    content: content,
                },
                toRecipients: [
                    {
                        emailAddress: {
                            address: emailAddress,
                        }
                    }
                ],
                // ccRecipients: [
                    // {
                    //     emailAddress: {
                    //         address: 'email'
                    //     }
                    // }
                // ],
                // saveToSentItems: 'false'
            },
        };

        // The primary sending limit when using the Microsoft Graph API to send emails is 30 messages per minute, imposed by Exchange Online,
        // even though the Graph API itself can handle higher request volumes. Additionally, there's a limit of 4 concurrent requests per application per tenant
        // and 10,000 requests per 10 minutes per application for all tenants.


        const sendMailResp = await this.client
            .api('/users/staffing@senacor.com/sendMail')
            .post(sendMailObject);
        this.logger.log('Mail sent successfully:', sendMailResp);
    }
}
