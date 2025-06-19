import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from '@azure/functions';
import { printError } from './ErrorHandling';
import { QueueItem, onepagerMailRequests } from './MailNotificationQueueTrigger';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { FolderBasedOnePagers } from './validator/FolderBasedOnePagers';

/**
 * Azure Queue used to store One Pager validation requests.
 */
const queueOutput = output.storageQueue({
    queueName: onepagerMailRequests,
    connection: '',
});


export async function MailNotificationAllHttpTrigger(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    context.log(`--------- Trigger MailNotificationAllHttpTrigger ---------`);
    try {
        context.log(`HTTP function processed request for url "${request.url}"`);

        const config = loadConfigFromEnv(context);

        const employees = await config.employeeRepo()?.getAllEmployees();

        if (!employees) {
            throw new Error("Getting employees failed!");
        }

        const items: QueueItem[] = employees.map((id) => ({employeeId: id}));

        context.extraOutputs.set(queueOutput, items);

        context.log(`Received change notification for all employees!`);
        return { body: `Received change notification for all employees!` };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    } finally {
        context.log(`--------- END of Trigger MailNotificationAllHttpTrigger ---------`);
    }
}

// Register the HTTP trigger with Azure Functions
app.http('MailNotificationAllHttpTrigger', {
    methods: ['POST'],
    route: 'sendValidationMails',
    authLevel: 'function',
    handler: MailNotificationAllHttpTrigger,
    extraOutputs: [queueOutput],
});
