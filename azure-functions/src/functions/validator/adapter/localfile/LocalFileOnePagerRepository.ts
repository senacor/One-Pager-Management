import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, Logger, OnePager, OnePagerRepository } from "../../DomainTypes";
import { CURRENT_TEMPLATE_PATH } from "../../validationRules";
import { dateFromOnePagerFile, folderNameFromEmployee, isOnePagerFile, onePagerFile } from "../DirectoryBasedOnePager";

/**
 * The sub directory where all one-pagers are stored. Base directory is the data directory.
 */
export const ONE_PAGER_DIR = `onepagers`;

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

    constructor(dataDir: string, logger: Logger = console) {
        this.onePagerDir = path.join(dataDir, ONE_PAGER_DIR);
        this.logger = logger;
    }

    /**
     * Retrieves all one-pagers of an employee from the local file system.
     * @param employeeId The ID of the employee whose one-pagers should be retrieved.
     * @returns A promise that resolves to an array of OnePager objects
     */
    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        const employeeDir = await this.employeeDir(employeeId);
        const files = await fs.readdir(employeeDir);

        // Filter for pptx files only
        const pptxFiles = files.filter(isOnePagerFile);

        this.logger.log(`(LocalFileOnePagerRepository.ts: getAllOnePagersOfEmployee) Found ${pptxFiles.length} OnePagers for employee "${employeeId}" in "${employeeDir}"!`);

        return pptxFiles
            .map(file => {
                const lastUpdateByEmployee = dateFromOnePagerFile(file, this.logger);
                const urlPath = path.resolve(employeeDir, file.split('/').map(encodeURIComponent).join('/'));
                const fileLocation = new URL('file:///' + urlPath);
                return { lastUpdateByEmployee, fileLocation };
            });
    }

    /**
     * Ensures that the directory for the employee exists, creating it if necessary and returns the path to it.
     * @param employeeId The ID of the employee for whom to ensure the directory exists.
     * @returns The path to the employee's directory where one-pagers are stored.
     */
    async employeeDir(employeeId: EmployeeID): Promise<string> {
        const dir = path.join(this.onePagerDir, folderNameFromEmployee("Max", "Mustermann", employeeId))
        await fs.mkdir(dir, { recursive: true });
        this.logger.log(`(LocalFileOnePagerRepository.ts: employeeDir) Ensured directory exists for employee "${employeeId}": ${dir}`);
        return dir;
    }

    /**
     * This function saves one-pagers for an employee in the local file system.
     * @param employeeId The ID of the employee for whom to save one-pagers.
     * @param onePagerDates An array representing the dates for which one-pagers should be created.
     */
    async saveOnePagersOfEmployee(employeeId: EmployeeID, onePagerDates: Date[]): Promise<void> {
        const employeeDir = await this.employeeDir(employeeId)
        await Promise.all(onePagerDates.map(d => {
            const file = path.join(employeeDir, onePagerFile("Max", "Mustermann", d));
            return fs.copyFile(CURRENT_TEMPLATE_PATH, file)
        }));
        this.logger.log(`(LocalFileOnePagerRepository.ts: saveOnePagersOfEmployee) Saved ${onePagerDates.length} one-pagers for employee "${employeeId}" in "${employeeDir}"!`);
    }
}
