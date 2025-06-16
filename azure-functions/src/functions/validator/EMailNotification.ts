import {
    EmployeeID,
    Logger,
    MailAdapter,
    ValidationReporter,
} from './DomainTypes';

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

    async notifyEmployee(employeeId: EmployeeID) : Promise<void> {
        // TODO: Template formulieren
        const eMailTemplate = `
            Dies ist das E-Mail-Template
        `;

        let subject = 'Please update your One-Pagers!';

        // TODO: get email of employee
        let emailAdress = '';

        await this.mailAdapter.sendMail([emailAdress], subject, eMailTemplate);
    }
}
