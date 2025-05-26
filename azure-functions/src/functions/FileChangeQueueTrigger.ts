import { app, InvocationContext } from "@azure/functions";
import { isEmployeeId } from "./validator/DomainTypes";
import { OnePagerValidation } from "./validator/OnePagerValidation";
import { InMemoryOnePagerRepository } from "./validator/adapter/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "./validator/adapter/InMemoryValidationReporter";

/**
 * Arbeitet die Queue ab.
 * @param queueItem
 * @param context
 */
export async function FileChangeQueueTrigger(queueItem: unknown, context: InvocationContext): Promise<void> {
  if (isEmployeeId(queueItem)) {
    context.log(`Processing valid queue item ${queueItem}`);
    const validator = new OnePagerValidation(
      new InMemoryOnePagerRepository({}),
      new InMemoryValidationReporter(),
      async (onePager) => []
    );
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
