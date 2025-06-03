import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, EmployeeRepository, Logger } from "../../DomainTypes";
import { ONE_PAGER_DIR } from "./LocalFileOnePagerRepository";
import { employeeIdFromFolder, isEmployeeFolder } from "../DirectoryBasedOnePager";

/**
 * LocalFileEmployeeRepository is an implementation of EmployeeRepository that reads employee IDs from a local file system directory.
 */
export class LocalFileEmployeeRepository implements EmployeeRepository {
    private readonly onePagerDir: string;
    private readonly logger: Logger;

    /**
     * Creates an instance of LocalFileEmployeeRepository.
     * @param dataDir The directory where all data is stored.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(dataDir: string, logger: Logger = console) {
        this.onePagerDir = path.join(dataDir, ONE_PAGER_DIR);
        this.logger = logger;
    }

    /**
     * Retrieves all employee IDs from the local file system.
     * @returns A promise that resolves to an array containting all employee IDs found in the one-pager directory.
     */
    async getAllEmployees(): Promise<EmployeeID[]> {
        this.logger.log(`(LocalFileEmployeeRepository.ts: getAllEmployees) Retrieving all employees!`);
        await fs.mkdir(this.onePagerDir, { recursive: true });
        const folders = await fs.readdir(this.onePagerDir);
        let _this = this;
        return folders.filter(isEmployeeFolder).map((el) => {return employeeIdFromFolder(el, _this.logger);});
    }
}
