import {
    EmployeeID,
    Logger,
    MailPort,
    ValidationError,
    ValidationReporter,
} from './DomainTypes';

export type QueueSaveFunction = (item: object) => void;


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

    async notifyEmployee(employeeId: EmployeeID) : Promise<void> {

        const subject = 'Please update your One-Pagers!';

        // TODO: get email of employee
        const emailAddress = '';

        const validationErrorArr: ValidationError[] = await this.reporter.getResultFor(employeeId);

        // TODO: Template formulieren
        const eMailTemplate = `
            Your errors are the following:
            - ${validationErrorArr.join('\n- ')}
        `;

        await this.mailAdapter.sendMail(emailAddress, subject, eMailTemplate);
    }
}
