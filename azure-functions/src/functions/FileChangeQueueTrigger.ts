import { InvocationContext, app } from '@azure/functions';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { isEmployeeId } from './validator/DomainTypes';
import { OnePagerValidation } from './validator/OnePagerValidation';
import * as validationRules from './validator/validationRules';
import { printError } from './ErrorHandling';
import { PptxContentLanguageDetector } from './validator/adapter/PptxContentLanguageDetector';

export type QueueItem = { employeeId: string };

export const onepagerValidationRequests = 'onepager-validation-requests';

/**
 * This function is triggered by items added to the Azure Storage Queue.
 * @param queueItem The QueueItem containing the employee ID to process.
 * @param context The Azure Functions invocation context.
 */
export async function FileChangeQueueTrigger(queueItem: unknown, context: InvocationContext): Promise<void> {
    context.log(`--------- Trigger FileChangeQueueTrigger for queue item ${JSON.stringify(queueItem)} ---------`);
    try {
        const item = queueItem as QueueItem;

        if (!isEmployeeId(item.employeeId)) {
            context.error(`Invalid queue item "${JSON.stringify(queueItem)}" does not contain a valid employee id!`);
            return;
        }

        context.log(`Processing valid queue item ${JSON.stringify(queueItem)}`);

        // Establish a connection to the repository containing one-pagers and our report output list.
        const config = loadConfigFromEnv(context);

        // Validate the one-pagers of the employee specified in the queue item.
        const validator = new OnePagerValidation(
            await config.onePagers(),
            await config.employees(),
            await config.reporter(),
            new PptxContentLanguageDetector(context),
            validationRules.allRules(context),
            context,
        );
        await validator.validateOnePagersOfEmployee(item.employeeId);
    } catch (error) {
        context.error(
            `(FileChangeQueueTrigger.ts: FileChangeQueueTrigger) Error processing queue item "${JSON.stringify(queueItem)}": "${printError(error)}"!`,
        );
        throw error;
    } finally {
        context.log(
            `--------- END of Trigger FileChangeQueueTrigger for queue item ${JSON.stringify(queueItem)} ---------`,
        );
    }
}

// Register the FileChangeQueueTrigger function with Azure Functions to work on queue items.
app.storageQueue('FileChangeQueueTrigger', {
    queueName: onepagerValidationRequests,
    connection: '',
    handler: FileChangeQueueTrigger,
});
