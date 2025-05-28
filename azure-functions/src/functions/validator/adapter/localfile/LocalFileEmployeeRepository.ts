import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, EmployeeRepository } from "../../DomainTypes";

export class LocalFileEmployeeRepository implements EmployeeRepository {
    private readonly dataDir: string;

    constructor(dataDir: string) {
        this.dataDir = dataDir;
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        await this.ensureDataDir();
        const files = await fs.readdir(this.dataDir);
        // Match files like "<employeeId>_onepagers.json"
        const employeeIds = files
            .filter(f => f.endsWith("_onepagers.json"))
            .map(f => f.replace(/_onepagers\.json$/, ""));
        return employeeIds;
    }

    private onePagerFile(employeeId: EmployeeID) {
        return path.join(this.dataDir, `${employeeId}_onepagers.json`);
    }

    private async ensureDataDir() {
        await fs.mkdir(this.dataDir, { recursive: true });
    }
}
