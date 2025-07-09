import { app, output } from '@azure/functions';
import { UseOfOnePagersAddEmployeesHTTPTrigger } from './UseOfOnePagersAddEmployeesHTTPTrigger';
import { useOfOnePagersAddEmployeeQueueName } from './UseOfOnePagerAddEmployeeQueueTrigger';

/**
 * Azure Queue used to store One Pager validation requests.
 */
const queueOutput = output.storageQueue({
    queueName: useOfOnePagersAddEmployeeQueueName,
    connection: '',
});


// A timer trigger that periodically executes the ValidateAllHttpTrigger function.
app.timer('UseOfOnePagersAddEmployeesTimeTrigger', {
    schedule: '0 10 5 * * 1-5', // weekday (monday to friday) at 5:30 am UTC since at 5 o'clock UTC the employee data is updated
    // uses ncrontab syntax: seconds, minutes, hours, day of month, month, day of week
    handler: async (myTimer, context) => {
        return UseOfOnePagersAddEmployeesHTTPTrigger(undefined, context);
    },
    useMonitor: true,
    extraOutputs: [queueOutput],
});
