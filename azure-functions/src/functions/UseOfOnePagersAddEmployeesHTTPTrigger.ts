import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from '@azure/functions';
import { printError } from './ErrorHandling';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { EmployeeID } from './validator/DomainTypes';
import { useOfOnePagersAddEmployeeQueueName } from './UseOfOnePagerAddEmployeeQueueTrigger';



const queueOutput = output.storageQueue({
    queueName: useOfOnePagersAddEmployeeQueueName,
    connection: '',
});



export async function UseOfOnePagersAddEmployeesHTTPTrigger(
    request: HttpRequest | undefined,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        if (!request) {
            context.log(`Time trigger executed without request!`);
        } else {
            context.log(`HTTP rquest reveived for executing UseOfOnePagersAddEmployeesHTTPTrigger!`);
        }

        const config = loadConfigFromEnv();
        const employeeRepo = config.employeeRepo();
        if (!employeeRepo) {
            context.error(`Employee repository is not configured!`);
            return { status: 500, body: `Internal server error` };
        }
        const ids: EmployeeID[] = await employeeRepo.getAllEmployees();

        context.extraOutputs.set(
            queueOutput,
            ids.map(id => ({ employeeId: `${id}` }))
        );


        return { status: 200, body: "Thank you for allowing the use of one-pagers!" };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}

app.http('UseOfOnePagersAddEmployeesHTTPTrigger', {
    methods: ['POST'],
    route: 'addEmployees',
    authLevel: 'function',
    handler: UseOfOnePagersAddEmployeesHTTPTrigger,
    extraOutputs: [queueOutput],
});
