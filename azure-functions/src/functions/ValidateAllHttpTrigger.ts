import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { onepagerValidationRequests, QueueItem } from "./FileChangeQueueTrigger";
import { loadConfigFromEnv } from "./configuration/AppConfiguration";
import { EmployeeRepository } from "./validator/DomainTypes";
import { printError } from "./ErrorHandling";

const queueOutput = output.storageQueue({
    queueName: onepagerValidationRequests,
    connection: '',
});

export async function ValidateAllHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"`);

        const repo: EmployeeRepository = await loadConfigFromEnv(context).employees();

        const ids = await repo.getAllEmployees();

        for (let id of ids) {
            const item: QueueItem = { employeeId: id };
            context.extraOutputs.set(queueOutput, item);
        }

        return { body: `Triggered validation for ${ids.length} employees.` };
    } catch (error) {
        context.error(`Error processing request: ${printError(error)}`);
        return { status: 500, body: `Internal server error` };
    }
};

app.http('ValidateAllHttpTrigger', {
    methods: ['POST'],
    route: 'validateAll',
    authLevel: 'function',
    handler: ValidateAllHttpTrigger,
    extraOutputs: [queueOutput]
});
