import { loadConfigFromEnv, Options } from '../src/functions/configuration/AppConfiguration';
import { InMemoryMailAdapter } from '../src/functions/validator/adapter/memory/InMemoryMailAdapter';
import { Local, LocalEnum, ValidationError } from '../src/functions/validator/DomainTypes';
import { EMailNotification } from '../src/functions/validator/EMailNotification';
import pug from 'pug';


type OnePagerError = {
    name: string;
    url: string;
    lang: Local;
    errors: ValidationError[];
};

(async function () {

    const config = loadConfigFromEnv(console, {
        STORAGE_SOURCE: 'sharepoint',
        SHAREPOINT_TENANT_ID: process.env.SHAREPOINT_TENANT_ID,
        SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID,
        SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET,
        POWERBI_DATASET_ID: process.env.POWERBI_DATASET_ID,
        FEATURE_DOWNLOAD_ONEPAGER: "true",
        SHAREPOINT_API_LOGGING: "true",
        SHAREPOINT_ONE_PAGER_SITE_NAME: "senacor.sharepoint.com:/sites/MaInfo",
        SHAREPOINT_VALIDATION_SITE_NAME: "senacor.sharepoint.com:/teams/MaInfoTest",
        SHAREPOINT_VALIDATION_RESULT_LIST_NAME: "OnePager_Status",
        SHAREPOINT_API_CACHING: 'false'
    } as Options);

    const mailAdapter = config.mailAdapter();
    if (!mailAdapter) {
        throw new Error('Mail adapter is not configured.');
    }
    const employeeRepo = await config.employeeRepo();
    if (!employeeRepo) {
        throw new Error('Employee repository is not configured.');
    }
    const mailReporter = await config.mailReporter();
    if (!mailReporter) {
        throw new Error('Mail reporter is not configured.');
    }

    const mailSender = new EMailNotification(mailAdapter, employeeRepo, await config.reporter(), mailReporter, console);

    const templateDE = await mailSender.loadEMailTemplate(LocalEnum.DE);
    const templateEN = await mailSender.loadEMailTemplate(LocalEnum.EN);

    const curDate = new Date();
    const deadline = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate()+7);

    const onePagerErrors: OnePagerError[] = [{
            name: 'Max, Mustermann.pptx',
            url: 'https://example.com/onepager1.pptx',
            lang: 'DE',
            errors: [
                "OLDER_THAN_ONE_YEAR",
                "USING_UNKNOWN_TEMPLATE",
                "USING_MODIFIED_TEMPLATE",
                "MISSING_LANGUAGE_INDICATOR_IN_NAME",
                "MISSING_DE_VERSION",
                "MISSING_EN_VERSION",
            ]
        },
        {
            name: 'Max, Mustermann2.pptx',
            url: 'https://example.com/onepager1.pptx',
            lang: 'DE',
            errors: [
                "OLDER_THAN_ONE_YEAR",
                "USING_UNKNOWN_TEMPLATE",
                "USING_MODIFIED_TEMPLATE",
                "MISSING_LANGUAGE_INDICATOR_IN_NAME",
                "MISSING_DE_VERSION",
                "MISSING_EN_VERSION",
            ]
        }
    ];


    const templateData = {
            checkedOnePagers: onePagerErrors,
            deadline: `${deadline.getDate()}.${deadline.getMonth() + 1}.${deadline.getFullYear()}`,
            firstname: "Max",
            generalErrors: [
                'MISSING_DE_VERSION',
                'MISSING_EN_VERSION'
            ]
            ,
            onePagerErrors: onePagerErrors,
            folderURL: 'https://example.com/onepager-folder',
    };

    const mailSubjectDE = pug.render(`| ${templateDE.subject}`, templateData); // '| ' is needed for pug to interpret the string as plain text
    const mailContentDE = pug.render(templateDE.content, templateData);
    const mailSubjectEN = pug.render(`| ${templateEN.subject}`, templateData); // '| ' is needed for pug to interpret the string as plain text
    const mailContentEN = pug.render(templateEN.content, templateData);

    // const emailAddress = employee.email;
    const emailAddress = "artjom.konschin@senacor.com";
    // const emailAddress = "felix.schuster@senacor.com";


    await mailAdapter.sendMail(emailAddress, mailSubjectDE, mailContentDE);
    // await mailAdapter.sendMail(emailAddress, mailSubjectEN, mailContentEN);

    if (mailAdapter instanceof InMemoryMailAdapter) {
        const mails = mailAdapter.mails;
        if (mails.length > 0) {
            console.log('Sent mails:');
            mails.forEach(mail => {
                console.log(`To: ${mail.emailAddress}, Subject: ${mail.subject}, Content: ${mail.content}`);
            });
        } else {
            console.log('No mails sent.');
        }
    }
})();
