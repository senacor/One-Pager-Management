import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { onepagerValidationRequests, QueueItem } from "./FileChangeQueueTrigger";
import { loadConfigFromEnv } from "./configuration/AppConfiguration";
import { EmployeeRepository } from "./validator/DomainTypes";

const queueOutput = output.storageQueue({
    queueName: onepagerValidationRequests,
    connection: '',
});

export async function ValidateAllHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const repo: EmployeeRepository = await loadConfigFromEnv().employees();

    const ids = await repo.getAllEmployees();

    for (let id of ids) {
        const item: QueueItem = { employeeId: id };
        context.extraOutputs.set(queueOutput, item);
    }

    return { body: `Triggered validation for ${ids.length} employees.` };
};

app.http('ValidateAllHttpTrigger', {
    methods: ['POST'],
    route: 'validateAll',
    authLevel: 'function',
    handler: ValidateAllHttpTrigger,
    extraOutputs: [queueOutput]
});
