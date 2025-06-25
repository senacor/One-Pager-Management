import {
    EmployeeID,
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
        ValidatedOnePager[]
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
    async reportValid(id: EmployeeID): Promise<void> {
        this.logger.log('(InMemoryValidationReporter.ts: reportValid)', id);
        this.reports.delete(id);
    }

    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which a given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors An array of validation errors found in the one-pager.
     */
    async reportErrors(
        id: EmployeeID,
        validatedOnePagers: ValidatedOnePager[],
    ): Promise<void> {
        this.logger.log(
            `Reporting the following errors for employee with id "${id}" and onePager ${JSON.stringify(validatedOnePagers)}: ${JSON.stringify(validatedOnePagers.flatMap((op) => op.errors))}`
        );
        this.reports.set(id, validatedOnePagers);
    }

    /**
     * This function retrieves the validation results for a given employee ID.
     * @param id The employee ID for which to get the validation results.
     * @returns A promise that resolves to an array of validation errors for the specified employee.
     */
    async getResultFor(id: EmployeeID): Promise<ValidatedOnePager[]> {
        this.logger.log(`Getting results for employee with id "${id}"!`);
        return this.reports.get(id) || [];
    }
}
