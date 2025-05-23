import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";
import { isDeviceItemPath } from "./DeviceItemPath";

const queueOutput = output.storageQueue({
    queueName: 'onepager-validation-requests',
    connection: '',
});

interface Body {
    changed: string;
}

export async function FileChangeHttpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`Http function processed request for url "${request.url}"`);

    const body = await request.json() as Body;
    // /drives/b!1PlcT8K070KmOAfCbJJ6-9SE0avLYEhEngiiHtTIc6xIV7aRHj02SpZSBuKBbYs1/items/01536CT2QGMCSPDKAXZZA3JRX5X7PYIOWV
    if (!body.changed) {
        return { status: 400, body: 'Invalid request! Missing "changed" property.' };
    }

    if (!isDeviceItemPath(body.changed)) {
        return { status: 400, body: 'Invalid request! "changed" property does not match expected format.' };
    }

    context.extraOutputs.set(queueOutput, body.changed);

    return { body: `Recieved change notification for: ${body.changed}` };
};

app.http('FileChangeHttpTrigger', {
    methods: ['POST'],
    authLevel: 'function',
    handler: FileChangeHttpTrigger,
    extraOutputs: [queueOutput]
});

// In Azure:
// Trigger, der Code aufruft (+evtl. Inputs)
// Funktionen
//
