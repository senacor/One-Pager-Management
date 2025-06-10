import { promises as fs } from 'fs';
import path from 'path';
import { EmployeeID, Local, Logger, OnePager, OnePagerRepository } from '../../DomainTypes';
import { CURRENT_TEMPLATE_PATH } from '../../validationRules';
import {
    dateFromOnePagerFile,
    extractLanguageCode,
    folderNameFromEmployee,
    isOnePagerFile,
    onePagerFile,
} from '../DirectoryBasedOnePager';

/**
 * LocalFileOnePagerRepository is an implementation of OnePagerRepository that reads and writes one-pagers to a local file system directory.
 */
export class LocalFileOnePagerRepository implements OnePagerRepository {
    /**
     * The directory where employee one-pagers are stored.
     * It is expected to contain folders named after employee IDs.
     */
    private readonly onePagerDir: string;
    private readonly logger: Logger;

    constructor(onePagerDir: string, logger: Logger = console) {
        this.onePagerDir = onePagerDir;
        this.logger = logger;
    }

    /**
     * Retrieves all one-pagers of an employee from the local file system.
     * @param employeeId The ID of the employee whose one-pagers should be retrieved.
     * @returns A promise that resolves to an array of OnePager objects
     */
    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        const dirs = await fs.readdir(this.onePagerDir);
        let employeeDir = dirs.find(dir => dir.endsWith(employeeId));
        if (!employeeDir) {
            this.logger.warn(`No OnePagers found for employee "${employeeId}"!`);
            return [];
        }

        employeeDir = path.join(this.onePagerDir, employeeDir);
        const files = await fs.readdir(employeeDir);

        // Filter for pptx files only
        const pptxFiles = files.filter(isOnePagerFile);

        this.logger.log(`Found ${pptxFiles.length} OnePagers for employee "${employeeId}" in "${employeeDir}"!`);

        return pptxFiles.map(file => {
            const lastUpdateByEmployee = dateFromOnePagerFile(file, this.logger);
            const urlPath = path.resolve(employeeDir, file.split('/').map(encodeURIComponent).join('/'));
            const fileLocation = new URL(`file:///${urlPath}`);
            const local = extractLanguageCode(file);
            return { lastUpdateByEmployee, fileLocation, local } as OnePager;
        });
    }

    /**
     * Ensures that the directory for the employee exists, creating it if necessary and returns the path to it.
     * @param employeeId The ID of the employee for whom to ensure the directory exists.
     * @returns The path to the employee's directory where one-pagers are stored.
     */
    private async fakeEmployeeDir(employeeId: EmployeeID): Promise<string> {
        const dir = path.join(this.onePagerDir, folderNameFromEmployee('Max', 'Mustermann', employeeId));
        await fs.mkdir(dir, { recursive: true });
        this.logger.log(`Ensured directory exists for employee "${employeeId}": ${dir}`);
        return dir;
    }

    /**
     * This function saves one-pagers for an employee in the local file system.
     * @param employeeId The ID of the employee for whom to save one-pagers.
     * @param onePagerDates An array representing the dates for which one-pagers should be created.
     */
    async saveOnePagersOfEmployee(
        employeeId: EmployeeID,
        onePagerDates: { lastUpdateByEmployee: Date; local: Local | undefined }[],
        templatePath: string = CURRENT_TEMPLATE_PATH,
    ): Promise<void> {
        const employeeDir = await this.fakeEmployeeDir(employeeId);
        await Promise.all(onePagerDates.map(d => {
            const file = onePagerFile('Max', 'Mustermann', d.local, d.lastUpdateByEmployee);
            return this.createOnePagerForEmployee(employeeId, file, templatePath);
        }));
        this.logger.log(`Saved ${onePagerDates.length} one-pagers for employee "${employeeId}" in "${employeeDir}"!`);
    }

    async createOnePagerForEmployee(
        employeeId: EmployeeID,
        fileName: string,
        templatePath: string,
    ): Promise<void> {
        const employeeDir = await this.fakeEmployeeDir(employeeId);
        const file = path.join(employeeDir, fileName);
        await fs.copyFile(templatePath, file);
        this.logger.log(`Created one-pager "${fileName}" in "${employeeDir}" from template "${templatePath}"!`);
    }
}
