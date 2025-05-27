import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { EmployeeID } from "./validator/DomainTypes";

const queueOutput = output.storageQueue({
    queueName: 'onepager-validation-requests',
    connection: '',
});

interface Body {
    employee: EmployeeID;
}

export async function FileChangeHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const body = await request.json() as Body;
    if (!body.employee) {
        return { status: 400, body: 'Invalid request! Missing "employee" property.' };
    }

    context.extraOutputs.set(queueOutput, body.employee);
    
    return { body: `Recieved change notification for: ${body.employee}` };
};

app.http('FileChangeHttpTrigger', {
    methods: ['POST'],
    authLevel: 'function',
    handler: FileChangeHttpTrigger,
    extraOutputs: [queueOutput]
});
