import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from '@azure/functions';
import { printError } from './ErrorHandling';
import { QueueItem, onepagerMailRequests } from './MailNotificationQueueTrigger';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { isEmployeeId } from './validator/DomainTypes';
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

        // Extract employee ID from the request parameters
        const id = request.params.employeeid;
        if (!isEmployeeId(id)) {
            context.log(`Invalid employee id: "${id}"!`);
            return {
                status: 400,
                body: `Invalid request! "${id}" is no valid employee id.`,
            };
        }

        // Load the list of employees from the configuration
        // Load the list of employees from the configuration
        const onePagers = new FolderBasedOnePagers(
            await loadConfigFromEnv(context).explorer(),
            context
        );
        if (!(await onePagers.getAllEmployees()).includes(id)) {
            context.log(`Employee not found: "${id}"!`);
            return { status: 404, body: `Employee not found: "${id}"` };
        }

        // Add the employee ID to the queue for further processing
        const item: QueueItem = { employeeId: id };
        context.extraOutputs.set(queueOutput, item);

        context.log(`Queue item created for employee id: "${id}"!`);
        return { body: `Received change notification for: "${id}"` };
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
