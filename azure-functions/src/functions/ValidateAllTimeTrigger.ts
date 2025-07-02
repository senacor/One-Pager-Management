import { app, output } from '@azure/functions';
import { onepagerValidationRequests } from './FileChangeQueueTrigger';
import { ValidateAllHttpTrigger } from './ValidateAllHttpTrigger';

/**
 * Azure Queue used to store One Pager validation requests.
 */
const queueOutput = output.storageQueue({
    queueName: onepagerValidationRequests,
    connection: '',
});


// A timer trigger that periodically executes the ValidateAllHttpTrigger function.
app.timer('ValidateAllTimeTrigger', {
    schedule: '0 30 5 * * 1-5', // weekday (monday to friday) at 5:30 am UTC since at 5 o'clock UTC the employee data is updated
    // uses ncrontab syntax: seconds, minutes, hours, day of month, month, day of week
    handler: async (myTimer, context) => {
        return ValidateAllHttpTrigger(undefined, context);
    },
    useMonitor: true,
    extraOutputs: [queueOutput],
});
