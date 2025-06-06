import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from '@azure/functions';
import { onepagerValidationRequests } from './FileChangeQueueTrigger';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { EmployeeRepository } from './validator/DomainTypes';
import { printError } from './ErrorHandling';

/**
 * Azure Queue used to store One Pager validation requests.
 */
const queueOutput = output.storageQueue({
    queueName: onepagerValidationRequests,
    connection: '',
});

/**
 * A function that is triggered by an HTTP request to validate all employees.
 * It retrieves all employee IDs from the repository and adds them to a queue for validation.
 * @param request The HTTP request object given by Azure Functions.
 * @param context The invocation context given by Azure Functions.
 * @returns The HTTP response.
 */
export async function ValidateAllHttpTrigger(
    request: HttpRequest,
    context: InvocationContext,
): Promise<HttpResponseInit> {
    try {
        context.log(
            `(ValidateAllHttpTrigger.ts: ValidateAllHttpTrigger) Http function processed request for url "${request.url}"!`,
        );

        const repo: EmployeeRepository = await loadConfigFromEnv(context).employees();
        const ids = await repo.getAllEmployees();

        context.extraOutputs.set(
            queueOutput,
            ids.map((id) => ({ employeeId: id })),
        );

        return { body: `Triggered validation for ${ids.length} employees.` };
    } catch (error) {
        context.error(
            `(ValidateAllHttpTrigger.ts: ValidateAllHttpTrigger) Error processing request: "${printError(error)}"!`,
        );
        return { status: 500, body: `Internal server error` };
    }
}

// Register the ValidateAllHttpTrigger function with Azure Functions to handle HTTP requests.
app.http('ValidateAllHttpTrigger', {
    methods: ['POST'],
    route: 'validateAll',
    authLevel: 'function',
    handler: ValidateAllHttpTrigger,
    extraOutputs: [queueOutput],
});
