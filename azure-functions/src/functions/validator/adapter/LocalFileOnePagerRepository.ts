import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, OnePager, OnePagerRepository } from "../DomainTypes";

export class LocalFileOnePagerRepository implements OnePagerRepository {
    private readonly dataDir: string;

    constructor(dataDir: string) {
        this.dataDir = dataDir;
    }

    private onePagerFile(employeeId: EmployeeID) {
        return path.join(this.dataDir, `${employeeId}_onepagers.json`);
    }

    private async ensureDataDir() {
        await fs.mkdir(this.dataDir, { recursive: true });
    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[] | undefined> {
        await this.ensureDataDir();
        try {
            const file = await fs.readFile(this.onePagerFile(employeeId), "utf-8");
            return JSON.parse(file) as OnePager[];
        } catch (e) {
            return undefined;
        }
    }

    async saveOnePagersOfEmployee(employeeId: EmployeeID, onePagers: OnePager[]): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(this.onePagerFile(employeeId), JSON.stringify(onePagers, null, 2));
    }
}
