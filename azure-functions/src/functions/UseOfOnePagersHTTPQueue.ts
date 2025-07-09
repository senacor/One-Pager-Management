import { HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { printError } from './ErrorHandling';
import { isEmployeeId, isEmployeeTokenValid } from './validator/DomainTypes';
import { loadConfigFromEnv } from './configuration/AppConfiguration';

export type QueueItem = { employeeToken: string; employeeId: string };
export const useOfOnePagersQueueName = 'use-of-one-pagers-requests';



export async function UseOfOnePagersQueueTrigger(
    queueItem: unknown,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        const item = queueItem as QueueItem;



        if (!isEmployeeTokenValid(item.employeeToken)) { // checks if it is a string of positive length
            context.error(`Invalid employee token: "${item.employeeToken}"!`);
            return { status: 400, body: `Invalid employee token` };
        }

        if (!isEmployeeId(item.employeeId)) { // checks if it is a string of positive length
            context.error(`Invalid employee id: "${item.employeeId}"!`);
            return { status: 400, body: `Invalid URL!` };
        }

        context.log(`Processing employee: Token: ${item.employeeToken} and ID: ${item.employeeId}`);

        const config = loadConfigFromEnv();
        const employeeRepo = config.employeeRepo();
        if (!employeeRepo) {
            context.error(`Employee repository is not configured!`);
            return { status: 500, body: `Internal server error` };
        }

        const allowUseOfOnePagersReporter = await config.useOfOnePagersReporter();
        if (!allowUseOfOnePagersReporter) {
            context.error(`Reporter for allowing one-pagers is not configured!`);
            return { status: 500, body: `Internal server error` };
        }
        await allowUseOfOnePagersReporter.confirmUseOfOnePagerForEmployee(item.employeeToken, item.employeeId);


        return { status: 200, body: "Thank you for allowing the use of one-pagers!" };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}


app.storageQueue('UseOfOnePagerQueueTrigger', {
    queueName: useOfOnePagersQueueName,
    connection: '',
    handler: UseOfOnePagersQueueTrigger,
});
