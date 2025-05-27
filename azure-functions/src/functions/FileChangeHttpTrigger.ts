import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { EmployeeID, isEmployeeId } from "./validator/DomainTypes";
import { QueueItem } from "./FileChangeQueueTrigger";

const queueOutput = output.storageQueue({
    queueName: 'onepager-validation-requests',
    connection: '',
});

export async function FileChangeHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const id = request.params.employeeid;
    if (!isEmployeeId(id)) {
        return { status: 400, body: `Invalid request! ${id} is no valid employee id.` };
    }

    const item: QueueItem = { employeeId: id };
    context.extraOutputs.set(queueOutput, item);

    return { body: `Received change notification for: ${id}` };
};

app.http('FileChangeHttpTrigger', {
    methods: ['POST'],
    route: 'validate/{employeeid}',
    authLevel: 'function',
    handler: FileChangeHttpTrigger,
    extraOutputs: [queueOutput]
});
