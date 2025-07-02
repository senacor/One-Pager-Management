import { app, InvocationContext } from "@azure/functions";
import { printError } from "./ErrorHandling";
import { loadConfigFromEnv } from "./configuration/AppConfiguration";
import { EmployeeRepository } from "./validator/DomainTypes";

async function ValidationListCleanUpTimeTrigger(
    context: InvocationContext
): Promise<void> {
    context.log(`--------- Trigger ValidationCleanUp ---------`);
    try {


        const config = loadConfigFromEnv(context);


        const employeeRepo: EmployeeRepository | undefined = config.employeeRepo();
        if (!employeeRepo) {
            context.error(`No employee repository configured!`);
            return;
        }

        await (await config.reporter()).cleanUpValidationList(await employeeRepo.getAllEmployees());

    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
    } finally {
        context.log(`--------- END of Trigger ValidationCleanUp ---------`);
    }
}


// A timer trigger that periodically executes the ValidationListCleanUpTimeTrigger function.
app.timer('ValidationListCleanUpTimeTrigger', {
    schedule: '0 20 5 * * 1-5', // shall be run once every weekday (monday to friday) at 5:20 am UTC since at 5 o'clock UTC the employee data is updated
    // uses ncrontab syntax: seconds, minutes, hours, day of month, month, day of week
    handler: async (myTimer, context) => {
        return ValidationListCleanUpTimeTrigger(context);
    },
    useMonitor: true,
});
