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
import { SharepointListValidationReporter } from "./validator/adapter/SharepointListValidationReporter";
import { loadConfigFromEnv } from "./configuration/AppConfiguration";

export type QueueItem = { employeeId: string };

/**
 * Arbeitet die Queue ab.
 * @param queueItem
 * @param context
 */
export async function FileChangeQueueTrigger(queueItem: unknown, context: InvocationContext): Promise<void> {
    const item = queueItem as QueueItem;

    if (isEmployeeId(item.employeeId)) {
        context.log(`Processing valid queue item ${JSON.stringify(queueItem)}`);

        const config = await loadConfigFromEnv();
        const validator = new OnePagerValidation(
            config.repository,
            config.reporter,
            validationRules.lastModifiedRule
        );

        await validator.validateOnePagersOfEmployee(item.employeeId);
    } else {
        context.error(`Invalid queue item ${JSON.stringify(queueItem)}, not a employee id`);
    }
}

app.storageQueue('FileChangeQueueTrigger', {
    queueName: 'onepager-validation-requests',
    connection: '',
    handler: FileChangeQueueTrigger
});
