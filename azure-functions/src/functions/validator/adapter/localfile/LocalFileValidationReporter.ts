import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, Logger, OnePager, ValidationError, ValidationReporter } from "../../DomainTypes";

/**
 * A validation reporter that stores validation results in local files.
 */
export class LocalFileValidationReporter implements ValidationReporter {

    /**
     * The directory where validation results are stored.
     * Files named after employee IDs with a "_validation.json" suffix will be stored in it.
     */
    private readonly dataDir: string;
    private readonly logger: Logger;

    constructor(dataDir: string, logger: Logger = console) {
        this.dataDir = dataDir;
        this.logger = logger;
    }

    /**
     * This function generates the file path for the validation result of a given employee ID.
     * @param id The employee ID for which the validation result file is created.
     * @returns The path to the validation result file for the given employee ID.
     */
    private validationFile(id: EmployeeID): string {
        return path.join(this.dataDir, `${id}_validation.json`);
    }

    /**
     * Ensures that the data directory exists, creating it if necessary.
     */
    private async ensureDataDir(): Promise<void> {
        await fs.mkdir(this.dataDir, { recursive: true });
    }

    /**
     * Reports that an employee has valid one-pagers by creating an empty validation result file.
     * @param id The employee ID for which the one-pager is valid.
     */
    async reportValid(id: EmployeeID): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(this.validationFile(id), JSON.stringify([]));
    }

    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which the given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors The array of validation errors found in the one-pager.
     */
    async reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(this.validationFile(id), JSON.stringify(errors));
    }

    /**
     * This function retrieves the validation result for a given employee ID.
     * @param id The employee ID for which to retrieve the validation result.
     * @returns The result resolves to validation errors found for the employee's one-pager, or an empty array if no errors are found.
     */
    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
        await this.ensureDataDir();
        try {
            const file = await fs.readFile(this.validationFile(id), "utf-8");
            return JSON.parse(file) as ValidationError[];
        } catch (e) {
            return [];
        }
    }
}
