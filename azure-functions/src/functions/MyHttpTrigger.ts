import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";

const queueOutput = output.storageQueue({
    queueName: 'onepager-validation-requests',
    connection: '',
});

export async function MyHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const body = await request.text();
    const name = request.query.get('name') || body || 'world';

    context.extraOutputs.set(queueOutput, name);

    return { body: `Hello, ${name}!` };
};

app.http('MyHttpTrigger', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: MyHttpTrigger,
    extraOutputs: [queueOutput]
});
