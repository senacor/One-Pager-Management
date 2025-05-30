import { promises as fs } from "fs";
import path from "path";
import { EmployeeID, OnePager, OnePagerRepository } from "../../DomainTypes";
import { CURRENT_TEMPLATE_PATH } from "../../validationRules";
import { dateFromOnePagerFile, folderNameFromEmployee, isOnePagerFile, onePagerFile } from "../DirectoryBasedOnePager";

export const ONE_PAGER_DIR = `onepagers`;

export class LocalFileOnePagerRepository implements OnePagerRepository {
    private readonly onePagerDir: string;

    constructor(dataDir: string) {
        this.onePagerDir = path.join(dataDir, ONE_PAGER_DIR);
    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        const employeeDir = await this.employeeDir(employeeId);
        const files = await fs.readdir(employeeDir);
        // Filter for pptx files only
        const pptxFiles = files.filter(isOnePagerFile);
        return pptxFiles
            .map(file => {
                const lastUpdateByEmployee = dateFromOnePagerFile(file);
                const urlPath = path.resolve(employeeDir, file.split('/').map(encodeURIComponent).join('/'));
                const location = new URL('file:///' + urlPath);
                return { lastUpdateByEmployee, location };
            });
    }

    async employeeDir(employeeId: EmployeeID): Promise<string> {
        const dir = path.join(this.onePagerDir, folderNameFromEmployee("Max", "Mustermann", employeeId))
        await fs.mkdir(dir, { recursive: true });
        return dir;
    }

    async saveOnePagersOfEmployee(employeeId: EmployeeID, onePagerDates: Date[]): Promise<void> {
        const employeeDir = await this.employeeDir(employeeId)
        await Promise.all(onePagerDates.map(d => {
            const file = path.join(employeeDir, onePagerFile("Max", "Mustermann", d));
            return fs.copyFile(CURRENT_TEMPLATE_PATH, file)
        }));
    }
}
