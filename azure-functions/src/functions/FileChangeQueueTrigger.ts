import { app, InvocationContext } from "@azure/functions";
import { loadConfigFromEnv } from "./configuration/AppConfiguration";
import { isEmployeeId } from "./validator/DomainTypes";
import { OnePagerValidation } from "./validator/OnePagerValidation";
import * as validationRules from "./validator/validationRules";

export type QueueItem = { employeeId: string };

export const onepagerValidationRequests = 'onepager-validation-requests';

/**
 * Arbeitet die Queue ab.
 * @param queueItem
 * @param context
 */
export async function FileChangeQueueTrigger(queueItem: unknown, context: InvocationContext): Promise<void> {
    try {
        const item = queueItem as QueueItem;

        if (isEmployeeId(item.employeeId)) {
            context.log(`Processing valid queue item ${JSON.stringify(queueItem)}`);

            const config = loadConfigFromEnv(context);
            const validator = new OnePagerValidation(
                await config.onePagers(),
                await config.employees(),
                await config.reporter(),
                validationRules.allRules,
                context
            );

            await validator.validateOnePagersOfEmployee(item.employeeId);
        } else {
            context.error(`Invalid queue item ${JSON.stringify(queueItem)}, not a employee id`);
        }
    } catch (error) {
        context.error(`Error processing queue item ${JSON.stringify(queueItem)}: ${JSON.stringify(error)}`);
    }
}

app.storageQueue('FileChangeQueueTrigger', {
    queueName: onepagerValidationRequests,
    connection: '',
    handler: FileChangeQueueTrigger
});
