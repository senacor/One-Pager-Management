import { HttpRequest, HttpResponseInit, InvocationContext, app, output } from '@azure/functions';
import { printError } from './ErrorHandling';
import { isEmployeeId, isEmployeeTokenValid } from './validator/DomainTypes';
import { useOfOnePagersQueueName } from './UseOfOnePagersHTTPQueue';

const queueOutput = output.storageQueue({
    queueName: useOfOnePagersQueueName,
    connection: '',
});


export async function UseOfOnePagersHTTPTrigger(
    request: HttpRequest | undefined,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const employeeToken = request?.params.employeeToken;
        const employeeId = request?.params.employeeId;
        context.log(`Received request to allow use of one-pagers for employee token: ${employeeToken}`);

        if (!isEmployeeTokenValid(employeeToken)) { // checks if it is a string of positive length
            context.error(`Invalid employee token: "${employeeToken}"!`);
            return { status: 400, body: `Invalid employee token` };
        }

        if (!isEmployeeId(employeeToken)) { // checks if it is a string of positive length
            context.error(`Invalid employee id: "${employeeId}"!`);
            return { status: 400, body: `Invalid URL!` };
        }

        context.extraOutputs.set(queueOutput, [{ employeeToken: employeeToken, employeeId: employeeId }]);


        return { status: 200, body: "Thank you for allowing the use of one-pagers!" };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}

app.http('UseOfOnePagersHTTPTrigger', {
    methods: ['POST'],
    route: 'allowUseOfOnePagers/{employeeToken}/{employeeId}',
    // authLevel: 'function',
    handler: UseOfOnePagersHTTPTrigger,
    extraOutputs: [queueOutput],
});
