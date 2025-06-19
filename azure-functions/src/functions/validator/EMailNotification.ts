import {
    EmployeeID,
    Logger,
    MailPort,
    ValidationError,
    ValidationReporter,
} from './DomainTypes';

export type QueueSaveFunction = (item: object) => void;
export type MailTemplate = {subject: string, content: string};
import fs from "node:fs";
import * as config from "../../../app_config/config.json";
import { render } from 'template-file';

/**
 * Validates one-pagers of employees based on a given validation rule.
 */
export class EMailNotification {
    private readonly logger: Logger;
    private readonly reporter: ValidationReporter;
    private readonly mailAdapter: MailPort;


    /**
     * Creates an instance of EMailNotification.
     * @param mailAdapter The MailPort used for sending mails.
     * @param reporter The reporter where validation results are stored.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(
        mailAdapter: MailPort,
        reporter: ValidationReporter,
        logger: Logger = console
    ) {
        this.logger = logger;
        this.reporter = reporter;
        this.mailAdapter = mailAdapter
    }

    async loadEMailTemplate(): Promise<MailTemplate> {
        const templateString = fs.readFileSync(`${config.mailTemplatePath}`, { encoding: 'utf8', flag: 'r' });
        // readFile can cause an error. But it should be fine to not catch it because we would not add any new information to the error

        const template = JSON.parse(templateString);

        return {
            subject: template.subject,
            content: template.content
        };
    }

    async notifyEmployee(employeeId: EmployeeID) : Promise<void> {
        const mailTemplate: MailTemplate = await this.loadEMailTemplate();

        const validationErrorArr: ValidationError[] = await this.reporter.getResultFor(employeeId);


        const templateData = {
            errors: validationErrorArr.join('\n')
        };

        const mailContent = render(mailTemplate.content, templateData);

        // TODO: get email of employee
        const emailAddress = '';

        this.logger.log(mailTemplate.subject, mailContent);


        await this.mailAdapter.sendMail(emailAddress, mailTemplate.subject, mailContent);
    }
}
