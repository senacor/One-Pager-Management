import { app, InvocationContext } from "@azure/functions";

export async function MyQueueTrigger(queueItem: unknown, context: InvocationContext): Promise<void> {
    context.log('Storage queue function processed work item:', queueItem);
}

app.storageQueue('MyQueueTrigger', {
    queueName: 'onepager-validation-requests',
    connection: '',
    handler: MyQueueTrigger
});
