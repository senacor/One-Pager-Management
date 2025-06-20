import { MailPort, EmailAddress } from "../../DomainTypes";

export type MailItem = {emailAddress: string, subject: string, content: string};

export class InMemoryMailAdapter implements MailPort {
    private readonly _mails: Array<MailItem> = [];

    async sendMail(emailAddress: EmailAddress, subject: string, content: string): Promise<void> {
        this._mails.push({
            emailAddress,
            subject,
            content
        });
    }

    get mails() {
        return [...this._mails];
    }
}


