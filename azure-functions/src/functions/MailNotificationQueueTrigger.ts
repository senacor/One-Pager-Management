import { InvocationContext, app } from '@azure/functions';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { isEmployeeId, MailAdapter } from './validator/DomainTypes';
import { printError } from './ErrorHandling';
import { EMailNotification } from './validator/EMailNotification';

export type QueueItem = { employeeId: string };

export const onepagerMailRequests = 'onepager-mail-requests';

/**
 * This function is triggered by items added to the Azure Storage Queue.
 * @param queueItem The QueueItem containing the employee ID to process.
 * @param context The Azure Functions invocation context.
 */
export async function MailNotificationQueueTrigger(
    queueItem: unknown,
    context: InvocationContext
): Promise<void> {
    context.log(
        `--------- Trigger MailNotificationQueueTrigger for queue item ${JSON.stringify(queueItem)} ---------`
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

        let mailAdapter: MailAdapter | undefined = config.mailAdapter();
        if (!mailAdapter) {
            throw new Error('A MailAdapter can only be used in combination with SharePoint!');
        }

        let mailNotificationHandler = new EMailNotification(mailAdapter, await config.reporter(), context);
        await mailNotificationHandler.notifyEmployee(item.employeeId);

    } catch (error) {
        context.error(
            `Error processing queue item "${JSON.stringify(queueItem)}": "${printError(error)}"!`
        );
        throw error;
    } finally {
        context.log(
            `--------- END of Trigger MailNotificationQueueTrigger for queue item ${JSON.stringify(queueItem)} ---------`
        );
    }
}

// Register the FileChangeQueueTrigger function with Azure Functions to work on queue items.
app.storageQueue('MailNotificationQueueTrigger', {
    queueName: onepagerMailRequests,
    connection: '',
    handler: MailNotificationQueueTrigger,
});
