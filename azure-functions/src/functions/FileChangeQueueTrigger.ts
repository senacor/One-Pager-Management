import { app, InvocationContext } from "@azure/functions";
import { isDeviceItemPath } from "./DeviceItemPath";
import { OnePagerValidation } from "./OnePagerValidation";

/**
 * Arbeitet die Queue ab.
 * @param queueItem
 * @param context
 */
export async function FileChangeQueueTrigger(queueItem: string, context: InvocationContext): Promise<void> {
    if(isDeviceItemPath(queueItem)) {
      context.log(`Processing valid queue item ${queueItem}`);
      const validator = new OnePagerValidation();
      await validator.validateChangedOnePager(queueItem);
    } else {
      context.error(`Invalid queue item ${queueItem}, not a device item path`);
    }
}

app.storageQueue('FileChangeQueueTrigger', {
    queueName: 'onepager-validation-requests',
    connection: '',
    handler: FileChangeQueueTrigger
});
