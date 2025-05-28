import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { EmployeeID, EmployeeRepository, isEmployeeId, OnePagerRepository } from "./validator/DomainTypes";
import { QueueItem } from "./FileChangeQueueTrigger";

const queueOutput = output.storageQueue({
    queueName: 'onepager-validation-requests',
    connection: '',
});



export async function FileChangeHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const repo: EmployeeRepository = null

    const ids = await repo.getAllEmployees();

    for (let id of ids) {
        const item: QueueItem = { employeeId: id };
        context.extraOutputs.set(queueOutput, item);
    }

    return { body: `Triggered validation for ${ids.length} employees.` };
};

app.http('FileChangeHttpTrigger', {
    methods: ['POST'],
    route: 'validateAll',
    authLevel: 'function',
    handler: FileChangeHttpTrigger,
    extraOutputs: [queueOutput]
});
