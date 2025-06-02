import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, OnePager, ValidationError, ValidationReporter } from "../../DomainTypes";

export class LocalFileValidationReporter implements ValidationReporter {
    private readonly dataDir: string;

    constructor(dataDir: string) {
        this.dataDir = dataDir;
    }

    private validationFile(id: EmployeeID) {
        return path.join(this.dataDir, `${id}_validation.json`);
    }

    private async ensureDataDir() {
        await fs.mkdir(this.dataDir, { recursive: true });
    }

    async reportValid(id: EmployeeID): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(this.validationFile(id), JSON.stringify([]));
    }

    async reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void> {
        await this.ensureDataDir();
        await fs.writeFile(this.validationFile(id), JSON.stringify(errors));
    }

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
