import { promises as fs } from 'fs';
import path from 'path';
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
    private validationFile(id: EmployeeID, local: Local): string {
        return path.join(this.dataDir, `${id}_${local}_validation.json`);
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
    async reportValid(id: EmployeeID, local: Local): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(this.validationFile(id, local), JSON.stringify([]));
    }

    /**
     * This function reports validation errors for a given employee's one-pager.
     * @param id The employee ID for which the given one-pager has errors.
     * @param onePager The one-pager that was validated, can be undefined if not available.
     * @param errors The array of validation errors found in the one-pager.
     */
    async reportErrors(
        id: EmployeeID,
        validatedOnePager: ValidatedOnePager,
        local: Local,
    ): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(this.validationFile(id, local), JSON.stringify(validatedOnePager));
    }

    /**
     * This function retrieves the validation result for a given employee ID.
     * @param id The employee ID for which to retrieve the validation result.
     * @returns The result resolves to validation errors found for the employee's one-pager, or an empty array if no errors are found.
     */
    async getResultFor(id: EmployeeID): Promise<LocalToValidatedOnePager> {
        await this.ensureDataDir();

        let validatedOnePager_DE: ValidatedOnePager = {errors: [], onePager: undefined, folderURL: undefined};
        try {
            const file_DE = await fs.readFile(this.validationFile(id, LocalEnum.DE), 'utf-8');
            const result = JSON.parse(file_DE);
            if (!Array.isArray(result)) { // array means deleted entry
                validatedOnePager_DE = result as ValidatedOnePager;
            }
        // eslint-disable-next-line no-empty
        } catch {}

        let validatedOnePager_EN: ValidatedOnePager = {errors: [], onePager: undefined, folderURL: undefined};
        try {
            const file_EN = await fs.readFile(this.validationFile(id, LocalEnum.EN), 'utf-8');
            const result = JSON.parse(file_EN);
            if (!Array.isArray(result)) { // array means deleted entry
                validatedOnePager_EN = result as ValidatedOnePager;
            }
        // eslint-disable-next-line no-empty
        } catch {}

        return {[LocalEnum.DE]: validatedOnePager_DE, [LocalEnum.EN]: validatedOnePager_EN};
    }

    async cleanUpValidationList(validEmployees: EmployeeID[]): Promise<void> {
        await this.ensureDataDir();
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const _this = this;
        const files = await fs.readdir(this.dataDir);
        await Promise.all(files.map(async file => {
            if (file.endsWith('_validation.json') && !validEmployees.includes(file.split('_')[0] as EmployeeID)) {
                const filePath = path.join(this.dataDir, file);
                await fs.unlink(filePath).catch(err => {
                    _this.logger.error(`Failed to delete file ${filePath}: ${err.message}`);
                });
            }
        }));
    }
}
