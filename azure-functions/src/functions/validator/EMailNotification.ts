import {
    EmployeeID,
    EmployeeRepository,
    Logger,
    MailPort,
    ValidationReporter,
    ValidationError,
    LocalEnum,
    Local,
    Employee,
    listOfGeneralErrors,
    isEmailAddress
} from './DomainTypes';
import fs from 'node:fs';
import * as config from '../../../app_config/config.json';
// import { render } from 'template-file';
import pug from 'pug';
import NodeCache from 'node-cache';

export type MailTemplate = {
    subject: string;
    content: string;
    errors: Record<ValidationError, {title: string; description: string}>;
    faqURL: string;
    guideBookURL: string;
};

const cache = new NodeCache({
    stdTTL: 10 * 60, // 10 minutes
    useClones: false,
});

/**
 * Validates one-pagers of employees based on a given validation rule.
 */
export class EMailNotification {
    private readonly logger: Logger;
    private readonly reporter: ValidationReporter;
    private readonly mailAdapter: MailPort;
    private readonly employeeRepo: EmployeeRepository;

    /**
     * Creates an instance of EMailNotification.
     * @param mailAdapter The MailPort used for sending mails.
     * @param reporter The reporter where validation results are stored.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(
        mailAdapter: MailPort,
        employeeRepo: EmployeeRepository,
        reporter: ValidationReporter,
        logger: Logger = console
    ) {
        this.logger = logger;
        this.reporter = reporter;
        this.mailAdapter = mailAdapter;
        this.employeeRepo = employeeRepo;
    }

    async notifyEmployee(employeeId: EmployeeID): Promise<void> {
        const employee: Employee | undefined = await this.employeeRepo.getEmployee(employeeId);
        if (!employee) {
            this.logger.error(`Employee ${employeeId} does not exist.`);
            return;
        }



        const validationErrorArr = await this.reporter.getResultFor(employeeId);

        // check if employee needs to be notified
        const allErrors = Object.values(validationErrorArr).map((op) => op.errors).flat();
        if (
            allErrors.length === 0 // has no errors
        ) {
            this.logger.log(`No errors found for employee ${employeeId}. No email will be sent.`);
            return;
        }
        if (
            employee.email === null || employee.email === '' || !isEmailAddress(employee.email) // has no email or invalid email
        ) {
            this.logger.error(`Employee ${employeeId} has no valid email address. No email will be sent.`);
            return;
        }



        let local: Local = LocalEnum.EN; // default to English
        if (employee.isGerman) {
            local = LocalEnum.DE; // use German if employee is German
        }


        const mailTemplate = await this.loadEMailTemplate(local);


        const curDate = new Date();
        const deadline = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate()+7);

        // const checkedOnePagers = Object.entries(validationErrorArr).filter(([, op]) => op.onePager !== undefined);


        const generalErrors = Object.values(validationErrorArr)
            .filter((validationOP) => validationOP.onePager === undefined)
            .map((validationOP) => {
                return validationOP.errors.filter((error) => Object.keys(mailTemplate.errors).includes(error)).map((error) => (mailTemplate.errors[error]));
            })
            .flat();

        const onePagerErrors = Object.entries(validationErrorArr)
            .filter(([,validationOP]) => validationOP.onePager !== undefined)
            .map(([lang,validationOP]) => {
                return {
                    name: validationOP.onePager?.fileName ? validationOP.onePager.fileName.toString() : '',
                    url: validationOP.onePager?.webLocation ? validationOP.onePager.webLocation.toString() : '',
                    lang: lang,
                    errors: validationOP.errors.filter((error) => Object.keys(mailTemplate.errors).includes(error)).map((error) => mailTemplate.errors[error])
                };
            }).filter((op) => op.errors.length > 0);

        if (generalErrors.length === 0 && onePagerErrors.length === 0) {
            this.logger.log(`No errors found for employee ${employeeId} that are in the current e-mail template. No email will be sent.`);
            return;
        }

        const errorData = {
            faqURL: mailTemplate.faqURL,
            guideBookURL: mailTemplate.guideBookURL,
        };

        const templateData = {
            ...errorData,
            checkedOnePagers: onePagerErrors,
            deadline: `${deadline.getDate()}.${deadline.getMonth() + 1}.${deadline.getFullYear()}`,
            firstname: employee.name.split(',')[1]?.trim(),
            generalErrors: generalErrors.map((error) => ({ title: pug.render(`| ${error.title}}`, errorData), description: pug.render(`| ${error.description}`, errorData) })),
            onePagerErrors: onePagerErrors.map((validationOP) => {
                validationOP.errors = validationOP.errors.map((error) => {
                    return { title: pug.render(`| ${error.title}}`, errorData), description: pug.render(`| ${error.description}`, errorData) }
                });
                return validationOP;
            }),
            folderURL: validationErrorArr[LocalEnum.EN]?.folderURL?.toString() || '',
        };

        const mailSubject = pug.render(`| ${mailTemplate.subject}`, templateData); // '| ' is needed for pug to interpret the string as plain text
        const mailContent = pug.render(mailTemplate.content, templateData);

        //this.logger.log(employee.email, mailSubject, mailContent);

        await this.mailAdapter.sendMail("artjom.konschin@senacor.com", mailSubject, mailContent);
        //await this.mailAdapter.sendMail(employee.email, mailSubject, mailContent);
    }

    private async loadEMailTemplate(local: Local): Promise<MailTemplate> {
        if (cache.has(local)) {
            this.logger.log('Using cached mail template.');
            return cache.get<MailTemplate>(local)!;
        }

        if (!config.mailTemplatePaths || !config.mailTemplatePaths[local]) {
            throw new Error(`Mail template path for local "${local}" is not defined in the configuration.`);
        }


        const templateString = fs.readFileSync(`${config.mailTemplatePaths[local]}`, {
            encoding: 'utf8',
            flag: 'r',
        });
        // readFile can cause an error. But it should be fine to not catch it because we would not add any new information to the error

        const template = JSON.parse(templateString);

        if (!template.subject || !template.contentPath || !template.errors) {
            throw new Error('Invalid email template format. Subject, content, and errors are required.');
        }
        if (!fs.existsSync(`${template.contentPath}`)) {
            throw new Error(`Mail template: Content path is invalid: ${template.contentPath}`);
        }

        const templateContent = fs.readFileSync(`${template.contentPath}`, {
            encoding: 'utf8',
            flag: 'r',
        });



        const mailTemplate: MailTemplate = {
            subject: template.subject,
            content: templateContent,
            errors: template.errors,
            faqURL: template.faqURL || '',
            guideBookURL: template.guideBookURL || ''
        };


        // check if mail template contains all general errors
        if (listOfGeneralErrors.some((error) => !Object.keys(mailTemplate.errors).includes(error))) {
            throw new Error(`The E-Mail template needs to include all general errors. Missing: ${listOfGeneralErrors.filter((error) => !Object.keys(mailTemplate.errors).includes(error)).join(', ')}`);
        }

        cache.set(local, mailTemplate);

        return mailTemplate;
    }
}
