import { InvocationContext, app, output } from '@azure/functions';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { EmployeeRepository, isEmployeeId, MailPort } from './validator/DomainTypes';
import { printError } from './ErrorHandling';
import { EMailNotification } from './validator/EMailNotification';
import { InMemoryMailAdapter } from './validator/adapter/memory/InMemoryMailAdapter';

export type QueueItem = { employeeId: string };

// queue that contains all requests for employees that shall receive a notification
export const onepagerMailRequests = 'onepager-mail-requests';

// This queue contains entries for each send mail (dev/debug-queue to log send mails)
export const onepagerMailOutputQueue = 'onepager-mail-outputs';

const queueOutput = output.storageQueue({
    queueName: onepagerMailOutputQueue,
    connection: '',
});

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
        const employeeRepo: EmployeeRepository | undefined = config.employeeRepo();

        if (employeeRepo === undefined) {
            throw new Error('We need a viable Employee Repository to send Mails!');
        }

        const mailAdapter: MailPort | undefined = config.mailAdapter();
        if (!mailAdapter) {
            throw new Error('A MailPort can only be used in combination with SharePoint!');
        }

        const mailNotificationHandler = new EMailNotification(mailAdapter,employeeRepo, await config.reporter(), context);

        await mailNotificationHandler.notifyEmployee(item.employeeId);

        if (mailAdapter instanceof InMemoryMailAdapter) {
            context.extraOutputs.set(queueOutput, mailAdapter.mails);
        }



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
    extraOutputs: [queueOutput]
});
