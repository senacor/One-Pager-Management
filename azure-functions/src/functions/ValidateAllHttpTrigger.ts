import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from '@azure/functions';
import { onepagerValidationRequests } from './FileChangeQueueTrigger';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { printError } from './ErrorHandling';
import { FolderBasedOnePagers } from './validator/FolderBasedOnePagers';
import { EmployeeID, EmployeeRepository } from './validator/DomainTypes';

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
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"!`);

        const config = loadConfigFromEnv(context);

        const onePagers = new FolderBasedOnePagers(
            await config.explorer(),
            context
        );

        let employeeRepo: EmployeeRepository | undefined = config.employeeRepo();
        if (!employeeRepo) {
            employeeRepo = onePagers;
        }

        const employees: EmployeeID[] = await employeeRepo.getAllEmployees();

        context.extraOutputs.set(
            queueOutput,
            employees.map(id => ({ employeeId: id }))
        );

        return { body: `Triggered validation for ${employees.length} employees.` };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
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
