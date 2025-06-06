import { promises as fs } from "fs";
import { EmployeeID, EmployeeRepository, Logger } from "../../DomainTypes";
import { employeeIdFromFolder, isEmployeeFolder } from "../DirectoryBasedOnePager";

/**
 * LocalFileEmployeeRepository is an implementation of EmployeeRepository that reads employee IDs from a local file system directory.
 */
export class LocalFileEmployeeRepository implements EmployeeRepository {

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
     * Retrieves all employee IDs from the local file system.
     * @returns A promise that resolves to an array containting all employee IDs found in the one-pager directory.
     */
    async getAllEmployees(): Promise<EmployeeID[]> {
        await fs.mkdir(this.onePagerDir, { recursive: true });
        const folders = await fs.readdir(this.onePagerDir);
        const employeeIds = folders.filter(isEmployeeFolder).map(el => {return employeeIdFromFolder(el);});
        this.logger.log(`Found ${employeeIds.length} employees in "${this.onePagerDir}"!`);
        return employeeIds;
    }
}
