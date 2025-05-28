import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { onepagerValidationRequests, QueueItem } from "./FileChangeQueueTrigger";
import { loadConfigFromEnv } from "./configuration/AppConfiguration";
import { isEmployeeId } from "./validator/DomainTypes";

const queueOutput = output.storageQueue({
    queueName: onepagerValidationRequests,
    connection: '',
});

export async function FileChangeHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const id = request.params.employeeid;
    if (!isEmployeeId(id)) {
        return { status: 400, body: `Invalid request! ${id} is no valid employee id.` };
    }

    const employees = await loadConfigFromEnv().employees();
    if( !(await employees.getAllEmployees()).includes(id)) {
        return { status: 404, body: `Employee not found: ${id}` };
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
