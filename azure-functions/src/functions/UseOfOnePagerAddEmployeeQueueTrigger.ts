import { InvocationContext, app } from '@azure/functions';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { printError } from './ErrorHandling';
import { isEmployeeId } from './validator/DomainTypes';

export type QueueItem = { employeeId: string };
export const useOfOnePagersAddEmployeeQueueName = 'use-of-one-pagers-add-employee-requests';

/**
 * This function is triggered by items added to the Azure Storage Queue.
 * @param queueItem The QueueItem containing the employee ID to process.
 * @param context The Azure Functions invocation context.
 */
export async function UseOfOnePagerAddEmployeeQueueTrigger(
    queueItem: unknown,
    context: InvocationContext
): Promise<void> {
    context.log(
        `--------- Trigger UseOfOnePagerAddEmployeeQueueTrigger for queue item ${JSON.stringify(queueItem)} ---------`
    );
    try {
        const item = queueItem as QueueItem;

        if (!isEmployeeId(item.employeeId)) {
            context.error(
                `Invalid queue item "${JSON.stringify(queueItem)}" does not contain a valid employee id!`
            );
            return;
        }

        context.log(`Processing valid queue item ${JSON.stringify(queueItem)}`);

        // Establish a connection to the repository containing one-pagers and our report output list.
        const config = loadConfigFromEnv(context);


        const useOfOnePagersReporter = await config.useOfOnePagersReporter();
        await useOfOnePagersReporter?.reportNewEmployee(item.employeeId);

    } catch (error) {
        context.error(
            `Error processing queue item "${JSON.stringify(queueItem)}": "${printError(error)}"!`
        );
        throw error;
    } finally {
        context.log(
            `--------- END of Trigger UseOfOnePagerAddEmployeeQueueTrigger for queue item ${JSON.stringify(queueItem)} ---------`
        );
    }
}

// Register the FileChangeQueueTrigger function with Azure Functions to work on queue items.

app.storageQueue('UseOfOnePagerAddEmployeeQueueTrigger', {
    queueName: useOfOnePagersAddEmployeeQueueName,
    connection: '',
    handler: UseOfOnePagerAddEmployeeQueueTrigger,
});
