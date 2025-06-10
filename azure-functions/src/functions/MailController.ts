import { createSharepointClient, SharepointClientOptions } from "./configuration/AppConfiguration";

(async function () {

    const client = await createSharepointClient({
        SHAREPOINT_TENANT_ID: process.env.SHAREPOINT_TENANT_ID,
        SHAREPOINT_CLIENT_ID: process.env.SHAREPOINT_CLIENT_ID,
        SHAREPOINT_CLIENT_SECRET: process.env.SHAREPOINT_CLIENT_SECRET,
        SHAREPOINT_API_LOGGING: 'true',
        SHAREPOINT_API_CACHING: 'false'
    } as SharepointClientOptions);

    const sendMail = {
        message: {
            subject: 'Test-E-Mail',
            body: {
                contentType: 'Text',
                content: 'This is the content of the test email.'
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: 'artjom.konschin@senacor.com'
                    }
                }
            ],
            // ccRecipients: [
            //     {
            //         emailAddress: {
            //             address: 'danas@contoso.com'
            //         }
            //     }
            // ]
        },
        saveToSentItems: 'false'
    };

    const sendMailResp = await client.api('/users/staffing@senacor.com/sendMail').post(sendMail);
    console.log('Mail sent successfully:', sendMailResp);
})();
