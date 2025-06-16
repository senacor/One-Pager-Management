import {
    EmployeeID,
    Logger,
    MailAdapter,
    ValidationError,
    ValidationReporter,
} from './DomainTypes';

export type QueueSaveFunction = (item: any) => void;

/**
 * Validates one-pagers of employees based on a given validation rule.
 */
export class EMailNotification {
    private readonly logger: Logger;
    private readonly reporter: ValidationReporter;
    private readonly mailAdapter: MailAdapter;

    /**
     * Creates an instance of EMailNotification.
     * @param mailAdapter The MailAdapter used for sending mails.
     * @param reporter The reporter where validation results are stored.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(
        mailAdapter: MailAdapter,
        reporter: ValidationReporter,
        logger: Logger = console
    ) {
        this.logger = logger;
        this.reporter = reporter;
        this.mailAdapter = mailAdapter
    }

    async notifyEmployee(employeeId: EmployeeID, saveItemToQueue: QueueSaveFunction) : Promise<void> {


        const subject = 'Please update your One-Pagers!';

        // TODO: get email of employee
        const emailAddress = '';

        const validationErrorArr: ValidationError[] = await this.reporter.getResultFor(employeeId);

        // TODO: Template formulieren
        const eMailTemplate = `
            Your errors are the following:
            - ${validationErrorArr.join('\n- ')}
        `;

        saveItemToQueue({
            email: emailAddress,
            subject: subject,
            content: eMailTemplate
        });

        await this.mailAdapter.sendMail([emailAddress], subject, eMailTemplate);
    }
}
