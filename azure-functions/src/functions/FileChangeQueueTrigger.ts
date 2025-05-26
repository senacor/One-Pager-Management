import { app, InvocationContext } from "@azure/functions";
import { isDeviceItemPath } from "./DeviceItemPath";
import { OnePagerValidation } from "./validator/OnePagerValidation";

/**
 * Arbeitet die Queue ab.
 * @param queueItem
 * @param context
 */
export async function FileChangeQueueTrigger(queueItem: string, context: InvocationContext): Promise<void> {
    if(isEmployeeId(queueItem)) {
      context.log(`Processing valid queue item ${queueItem}`);
      const validator = new OnePagerValidation();
      await validator.validateOnePagersOfEmployee(queueItem);
    } else {
      context.error(`Invalid queue item ${queueItem}, not a employee id`);
    }
}

app.storageQueue('FileChangeQueueTrigger', {
    queueName: 'onepager-validation-requests',
    connection: '',
    handler: FileChangeQueueTrigger
});
