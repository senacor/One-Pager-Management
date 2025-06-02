import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { onepagerValidationRequests, QueueItem } from "./FileChangeQueueTrigger";
import { loadConfigFromEnv } from "./configuration/AppConfiguration";
import { isEmployeeId } from "./validator/DomainTypes";
import { printError } from "./ErrorHandling";

const queueOutput = output.storageQueue({
    queueName: onepagerValidationRequests,
    connection: '',
});

export async function FileChangeHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        context.log(`(FileChangeHttpTrigger.ts: FileChangeHttpTrigger) Http function processed request for url "${request.url}"`);
        console.log("ok!");

        const id = request.params.employeeid;
        if (!isEmployeeId(id)) {
            return { status: 400, body: `Invalid request! "${id}" is no valid employee id.` };
        }

        const employees = await loadConfigFromEnv(context).employees();
        if (!(await employees.getAllEmployees()).includes(id)) {
            return { status: 404, body: `Employee not found: "${id}"` };
        }

        const item: QueueItem = { employeeId: id };
        context.extraOutputs.set(queueOutput, item);

        return { body: `Received change notification for: "${id}"` };
    } catch (error) {
        context.error(`(FileChangeHttpTrigger.ts: FileChangeHttpTrigger) Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
};

app.http('FileChangeHttpTrigger', {
    methods: ['POST'],
    route: 'validate/{employeeid}',
    authLevel: 'function',
    handler: FileChangeHttpTrigger,
    extraOutputs: [queueOutput]
});
