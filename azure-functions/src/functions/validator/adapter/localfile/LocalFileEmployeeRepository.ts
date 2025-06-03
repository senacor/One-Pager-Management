import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, EmployeeRepository, Logger } from "../../DomainTypes";
import { ONE_PAGER_DIR } from "./LocalFileOnePagerRepository";
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

    constructor(dataDir: string, logger: Logger = console) {
        this.onePagerDir = path.join(dataDir, ONE_PAGER_DIR);
        this.logger = logger;
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        this.logger.log(`Retrieving all employees!`);
        await fs.mkdir(this.onePagerDir, { recursive: true });
        const folders = await fs.readdir(this.onePagerDir);
        let _this = this;
        return folders.filter(isEmployeeFolder).map((el) => {return employeeIdFromFolder(el, _this.logger);});
    }
}
