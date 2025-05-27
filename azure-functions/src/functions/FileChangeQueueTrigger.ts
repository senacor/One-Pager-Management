import { app, InvocationContext } from "@azure/functions";
import { isEmployeeId } from "./validator/DomainTypes";
import { OnePagerValidation } from "./validator/OnePagerValidation";
import { InMemoryOnePagerRepository } from "./validator/adapter/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "./validator/adapter/InMemoryValidationReporter";
import * as validationRules from "./validator/validationRules";
import { SharepointDriveOnePagerRepository } from "./validator/adapter/SharepointDriveOnePagerRepository";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider.js";
import { Client } from "@microsoft/microsoft-graph-client";

/**
 * Arbeitet die Queue ab.
 * @param queueItem
 * @param context
 */
export async function FileChangeQueueTrigger(queueItem: unknown, context: InvocationContext): Promise<void> {
    // -- One-Pager-Test-Folder (MaInfoTest): --
    // https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/lists/91b65748-3d1e-4a36-9652-06e2816d8b35/items
    // siteURL yields siteID: "senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac";
    const siteIDAlias: string = "senacor.sharepoint.com:/teams/MaInfoTest";

    // -- real One-Pager-Folder (MaInfo): --
    // real MAInfo: https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e/lists/c70c37c3-6fe6-4316-bb79-6c535e774478/items
    // siteURL yields siteID: "senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e"
    // const siteIDAlias: string = "senacor.sharepoint.com:/sites/MaInfo/";

    const listName: string = "01_OnePager";

    const credential: ClientSecretCredential = new ClientSecretCredential(
        process.env.SHAREPOINT_TENANT_ID as string,
        process.env.SHAREPOINT_CLIENT_ID as string,
        process.env.SHAREPOINT_CLIENT_SECRET as string,
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
    });

    const client = Client.initWithMiddleware({
        debugLogging: true,
        authProvider,
    });


    if (isEmployeeId(queueItem)) {
        context.log(`Processing valid queue item ${queueItem}`);
        const validator = new OnePagerValidation(
                await SharepointDriveOnePagerRepository.getInstance(client, siteIDAlias, listName),
                new InMemoryValidationReporter(),
                validationRules.lastModifiedRule
            );
        await validator.validateOnePagersOfEmployee(queueItem);
    } else {
        context.error(`Invalid queue item ${queueItem}, not a employee id`);
    }
}

app.storageQueue('FileChangeQueueTrigger', {
    queueName: 'onepager-validation-requests',
    connection: '',
    handler: FileChangeQueueTrigger
});
