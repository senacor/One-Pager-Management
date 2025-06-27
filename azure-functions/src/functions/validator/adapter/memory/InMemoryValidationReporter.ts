import {
    EmployeeID,
    Local,
    LocalEnum,
    LocalToValidatedOnePager,
    Logger,
    ValidatedOnePager,
    ValidationReporter,
} from '../../DomainTypes';

/**
 * An in-memory implementation of the ValidationReporter interface.
 * This reporter stores validation results in memory, allowing for quick access and manipulation.
 * It is useful for testing and scenarios where persistence is not required.
 */
export class InMemoryValidationReporter implements ValidationReporter {
    private readonly logger: Logger;
    private readonly reports: Map<
        EmployeeID,
        Map<Local, ValidatedOnePager>
    > = new Map();

    /**
     * Creates an instance of InMemoryValidationReporter.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(logger: Logger = console) {
        this.logger = logger;
    }

    /**
     * This function reports that an employee has valid one-pagers by removing any existing validation reports for that employee if they exist.
     * @param id The employee ID for which the one-pager is valid.
     */
    async reportValid(id: EmployeeID, local: Local): Promise<void> {
        this.logger.log('(InMemoryValidationReporter.ts: reportValid)', id);
        this.reports.get(id)?.delete(local);
    }

    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which a given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors An array of validation errors found in the one-pager.
     */
    async reportErrors(
        id: EmployeeID,
        validatedOnePager: ValidatedOnePager,
        local: Local,
    ): Promise<void> {
        this.logger.log(
            `Reporting the following errors for employee with id "${id}" and onePager ${JSON.stringify(validatedOnePager)}: ${JSON.stringify(validatedOnePager.errors)}`
        );
        if (!this.reports.has(id)) {
            this.reports.set(id, new Map<Local, ValidatedOnePager>());
        }

        this.reports.get(id)?.set(local, validatedOnePager);
    }

    /**
     * This function retrieves the validation results for a given employee ID.
     * @param id The employee ID for which to get the validation results.
     * @returns A promise that resolves to an array of validation errors for the specified employee.
     */
    async getResultFor(id: EmployeeID): Promise<LocalToValidatedOnePager> {
        this.logger.log(`Getting results for employee with id "${id}"!`);

        const onePagerMap: Map<Local, ValidatedOnePager> | undefined = this.reports.get(id);

        const result: {[local in Local] : ValidatedOnePager} =
            Object.assign({}, ...(Object.keys(LocalEnum) as Local[]).map((local: Local) => {
                if (!onePagerMap || !onePagerMap.has(local as Local)) {
                    return {[local]: {
                        onePager: undefined,
                        errors: [],
                        local: local as Local
                    }};
                } else {
                    return {[local]: onePagerMap.get(local as Local)};
                }
            }));

        return result;
    }
}
