import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, EmployeeRepository } from "../../DomainTypes";
import { ONE_PAGER_DIR } from "./LocalFileOnePagerRepository";
import { employeeIdFromFolder, isEmployeeFolder } from "../DirectoryBasedOnePager";

export class LocalFileEmployeeRepository implements EmployeeRepository {
    private readonly onePagerDir: string;

    constructor(dataDir: string) {
        this.onePagerDir = path.join(dataDir, ONE_PAGER_DIR);
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        await fs.mkdir(this.onePagerDir, { recursive: true });
        const folders = await fs.readdir(this.onePagerDir);
        return folders.filter(isEmployeeFolder).map(employeeIdFromFolder);
    }
}
