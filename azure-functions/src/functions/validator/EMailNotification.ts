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
    isEmailAddress,
    MailReporter,
    UseOfOnePagerReporter
} from './DomainTypes';
import fs from 'node:fs';
import * as config from '../../../app_config/config.json';
// import { render } from 'template-file';
import pug from 'pug';
import NodeCache from 'node-cache';

export type MailTemplate = {
    subject: string;
    content: string;
    activeErrors: ValidationError[];
    // errors: Record<ValidationError, {title: string; description: string}>;
    // faqURL: string;
    // guideBookURL: string;
};

type OnePagerError = {
    name: string;
    url: string;
    lang: Local;
    errors: ValidationError[];
}

const cache = new NodeCache({
    stdTTL: 10 * 60, // 10 minutes
    useClones: false,
});

/**
 * Validates one-pagers of employees based on a given validation rule.
 */
export class EMailNotification {
    private readonly logger: Logger;
    private readonly validationReporter: ValidationReporter;
    private readonly mailAdapter: MailPort;
    private readonly employeeRepo: EmployeeRepository;
    private readonly mailReporter: MailReporter;
    private readonly useOfOnePagerRepo: UseOfOnePagerReporter;
    private readonly hostname: string;

    /**
     * Creates an instance of EMailNotification.
     * @param mailAdapter The MailPort used for sending mails.
     * @param validationReporter The reporter where validation results are stored.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(
        mailAdapter: MailPort,
        employeeRepo: EmployeeRepository,
        validationReporter: ValidationReporter,
        mailReporter: MailReporter,
        useOfOnePagerRepo: UseOfOnePagerReporter,
        hostname: string,
        logger: Logger = console
    ) {
        this.logger = logger;
        this.validationReporter = validationReporter;
        this.mailAdapter = mailAdapter;
        this.employeeRepo = employeeRepo;
        this.mailReporter = mailReporter;
        this.useOfOnePagerRepo = useOfOnePagerRepo;
        this.hostname = hostname;
    }

    async notifyEmployee(employeeId: EmployeeID): Promise<void> {
        const employee: Employee | undefined = await this.employeeRepo.getEmployee(employeeId);
        if (!employee) {
            this.logger.error(`Employee ${employeeId} does not exist.`);
            return;
        }



        const localToValidatedOnePager = await this.validationReporter.getResultFor(employeeId);

        // check if employee needs to be notified
        const allErrors = Object.values(localToValidatedOnePager).map((op) => op.errors).flat();
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


        const mailTemplate: MailTemplate = await this.loadEMailTemplate(local);


        const curDate: Date = new Date();
        const deadline: Date = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate()+7);

        // const checkedOnePagers = Object.entries(localToValidatedOnePager).filter(([, op]) => op.onePager !== undefined);


        const generalErrors: ValidationError[] = Object.values(localToValidatedOnePager)
            .filter((validationOP) => validationOP.onePager === undefined)
            .map((validationOP) => {
                return validationOP.errors.filter((error) => {
                    return mailTemplate.activeErrors.includes(error)
                    // .map((error) => (mailTemplate.errors[error])
                });
            })
            .flat();

        const onePagerErrors: OnePagerError[] = Object.entries(localToValidatedOnePager)
            .filter(([,validationOP]) => validationOP.onePager !== undefined)
            .map(([lang,validationOP]) => {
                return {
                    name: validationOP.onePager?.fileName ? validationOP.onePager.fileName.toString() : '',
                    url: validationOP.onePager?.webLocation ? validationOP.onePager.webLocation.toString() : '',
                    lang: lang,
                    errors: validationOP.errors.filter((error) =>mailTemplate.activeErrors.includes(error))
                        // .map((error) => mailTemplate.errors[error])
                } as OnePagerError;
            }).filter((op) => op.errors.length > 0);

        if (generalErrors.length === 0 && onePagerErrors.length === 0) {
            this.logger.log(`No errors found for employee ${employeeId} that are in the current e-mail template. No email will be sent.`);
            return;
        }

        // const errorData = {
        //     faqURL: mailTemplate.faqURL,
        //     guideBookURL: mailTemplate.guideBookURL,
        // };


        const templateData = {
            // ...errorData,
            checkedOnePagers: onePagerErrors,
            deadline: `${deadline.getDate()}.${deadline.getMonth() + 1}.${deadline.getFullYear()}`,
            firstname: employee.name.split(',')[1]?.trim(),
            generalErrors: generalErrors
                // .map((error) => ({ title: pug.render(`| ${error.title}}`, errorData), description: pug.render(`| ${error.description}`, errorData) }))
            ,
            onePagerErrors: onePagerErrors
            // .map((validationOP) => {
            //     validationOP.errors = validationOP.errors.map((error) => {
            //         return { title: pug.render(`| ${error.title}}`, errorData), description: pug.render(`| ${error.description}`, errorData) }
            //     });
            //     return validationOP;
            // })
            ,
            folderURL: localToValidatedOnePager[LocalEnum.EN]?.folderURL?.toString() || '',
            linkToAllowUseOfOnePagers: await this.useOfOnePagerRepo.didEmployeeAllowUseOfOnePager(employeeId)
                ? null
                : `${this.hostname}/api/allowUseOfOnePagers/${await this.useOfOnePagerRepo.getTokenOfEmployee(employeeId)}/${employeeId}`,
        };


        const mailSubject = pug.render(`| ${mailTemplate.subject}`, templateData); // '| ' is needed for pug to interpret the string as plain text
        const mailContent = pug.render(mailTemplate.content, templateData);

        // const emailAddress = employee.email;
        const emailAddress = "artjom.konschin@senacor.com";


        await this.mailAdapter.sendMail(emailAddress, mailSubject, mailContent);

        await Promise.all((Object.keys(LocalEnum) as Local[]).map(async (lang: Local) => {
            if (localToValidatedOnePager[lang].errors.length === 0) {
                return;
            }

            return await this.mailReporter.reportMail(
                employeeId,
                localToValidatedOnePager[lang],
                lang
            );
        }));


    }

    async loadEMailTemplate(local: Local): Promise<MailTemplate> {
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

        if (!template.subject || !template.contentPath || !template.activeErrors) {
            throw new Error('Invalid email template format. Subject, content, and activeErrors are required.');
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
            activeErrors: template.activeErrors || [],
            // errors: template.errors,
            // faqURL: template.faqURL || '',
            // guideBookURL: template.guideBookURL || ''
        };


        // check if mail template contains all general errors
        if (listOfGeneralErrors.some((error) => !mailTemplate.activeErrors.includes(error))) {
            throw new Error(`The E-Mail template needs to include all general errors. Missing: ${listOfGeneralErrors.filter((error) => !mailTemplate.activeErrors.includes(error)).join(', ')}`);
        }

        cache.set(local, mailTemplate);

        return mailTemplate;
    }
}
