import { app, output } from '@azure/functions';
import { onepagerMailRequests } from './MailNotificationQueueTrigger';
import { MailNotificationAllHttpTrigger } from './MailNotificationAllHttpTrigger';

const queueOutputMail = output.storageQueue({
    queueName: onepagerMailRequests,
    connection: '',
});

// A timer trigger that periodically executes the MailNotificationAllHttpTrigger function.
app.timer('MailNotificationAllTimeTrigger', {
    schedule: '0 0 6 1-7 * 1', // shall be first monday of the month at 6 o'clock (UTC) - this means 7 o'clock in Germany in winter time and 8 o'clock in summer time
    // uses ncrontab syntax: seconds, minutes, hours, day of month, month, day of week
    handler: async (myTimer, context) => {
        return MailNotificationAllHttpTrigger(undefined, context);
    },
    useMonitor: true,
    extraOutputs: [queueOutputMail],
});
