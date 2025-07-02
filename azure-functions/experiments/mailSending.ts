import { loadConfigFromEnv, Options } from '../src/functions/configuration/AppConfiguration';
import { InMemoryMailAdapter } from '../src/functions/validator/adapter/memory/InMemoryMailAdapter';
import { EMailNotification } from '../src/functions/validator/EMailNotification';

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

    const mailSender = new EMailNotification(mailAdapter, employeeRepo, await config.reporter(), console);

    await mailSender.notifyEmployee('2391');
    // await mailSender.notifyEmployee('2580');
    // await mailSender.notifyEmployee('230');
    await mailSender.notifyEmployee('8771'); // This employee is not german speaking, so english mail should be sent

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
