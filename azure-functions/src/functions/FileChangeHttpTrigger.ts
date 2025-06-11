import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from '@azure/functions';
import { printError } from './ErrorHandling';
import { QueueItem, onepagerValidationRequests } from './FileChangeQueueTrigger';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { isEmployeeId } from './validator/DomainTypes';

/**
 * Azure Queue used to store One Pager validation requests.
 */
const queueOutput = output.storageQueue({
    queueName: onepagerValidationRequests,
    connection: '',
});

/**
 * HTTP Trigger to handle One Pager change notifications.
 * It expects a POST request with an employee ID in the URL.
 * If the employee ID is valid, it creates a queue item for further processing.
 * @param request - The HTTP request object given by Azure Functions
 * @param context - The invocation context given by Azure Functions
 * @returns A response indicating success or failure
 */
export async function FileChangeHttpTrigger(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    context.log(`--------- Trigger FileChangeHttpTrigger ---------`);
    try {
        context.log(`HTTP function processed request for url "${request.url}"`);

        // Extract employee ID from the request parameters
        const id = request.params.employeeid;
        if (!isEmployeeId(id)) {
            context.log(`Invalid employee id: "${id}"!`);
            return { status: 400, body: `Invalid request! "${id}" is no valid employee id.` };
        }

        // Load the list of employees from the configuration
        const employees = await loadConfigFromEnv(context).employees();
        if (!(await employees.getAllEmployees()).includes(id)) {
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
        context.log(`--------- END of Trigger FileChangeHttpTrigger ---------`);
    }
}

// Register the HTTP trigger with Azure Functions
app.http('FileChangeHttpTrigger', {
    methods: ['POST'],
    route: 'validate/{employeeid}',
    authLevel: 'function',
    handler: FileChangeHttpTrigger,
    extraOutputs: [queueOutput],
});
