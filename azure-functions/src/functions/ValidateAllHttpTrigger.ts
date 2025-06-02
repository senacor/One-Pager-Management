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
        context.log(`(ValidateAllHttpTrigger.ts: ValidateAllHttpTrigger) Http function processed request for url "${request.url}"!`);

        const repo: EmployeeRepository = await loadConfigFromEnv(context).employees();
        const ids = await repo.getAllEmployees();

        context.extraOutputs.set(queueOutput, ids.map(id => ({ employeeId: id })));

        return { body: `Triggered validation for ${ids.length} employees.` };
    } catch (error) {
        context.error(`(ValidateAllHttpTrigger.ts: ValidateAllHttpTrigger) Error processing request: "${printError(error)}"!`);
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
