import { promises as fs } from 'fs';
import { EmployeeID, Local, StorageExplorer } from '../src/functions/validator/DomainTypes';
import {
    EmployeeFolder,
    FolderBasedOnePagers,
} from '../src/functions/validator/FolderBasedOnePagers';
import { MemoryFileSystem } from '../src/functions/validator/adapter/memory/MemoryFileSystem';
import { FileSystemStorageExplorer } from '../src/functions/validator/adapter/FileSystemStorageExplorer';
import { fs as memfs } from 'memfs';
import { toTreeSync } from 'memfs/lib/print';
import { CURRENT_TEMPLATE_PATH } from '../src/functions/validator/rules';

export async function initInMemoryOnePagers(
    data: Record<EmployeeID, { lastUpdateByEmployee: Date; local?: Local }[]>
): Promise<FolderBasedOnePagers> {
    const explorer = new FileSystemStorageExplorer('/', new MemoryFileSystem());

    const exemplars = new OnePagerExemplars(explorer);
    await Promise.all(
        Object.entries(data).flatMap(([id, onePagers]) =>
            exemplars.saveOnePagersOfEmployee(id as EmployeeID, onePagers)
        )
    );

    console.log(`Initialized in-memory one-pagers with: ${toTreeSync(memfs)}`);

    return new FolderBasedOnePagers(explorer);
}

export class OnePagerExemplars {
    private readonly explorer: StorageExplorer;

    constructor(
        explorer: StorageExplorer = new FileSystemStorageExplorer('/', new MemoryFileSystem())
    ) {
        this.explorer = explorer;
    }

    /**
     * This function saves one-pagers for an employee in the local file system.
     * @param employeeId The ID of the employee for whom to save one-pagers.
     * @param onePagerDates An array representing the dates for which one-pagers should be created.
     */
    async saveOnePagersOfEmployee(
        employeeId: EmployeeID,
        onePagerDates: {
            lastUpdateByEmployee: Date;
            local?: Local;
        }[],
        templatePath: string = CURRENT_TEMPLATE_PATH
    ): Promise<void> {
        const employeeDir = await this.fakeEmployeeDir(employeeId);
        await Promise.all(
            onePagerDates.map(d => {
                const file = onePagerFile('Max', 'Mustermann', d.local, d.lastUpdateByEmployee);
                return this.createOnePagerForEmployee(employeeId, file, templatePath);
            })
        );
        console.log(
            `Saved ${onePagerDates.length} one-pagers for employee "${employeeId}" in "${employeeDir}"!`
        );
    }

    async createOnePagerForEmployee(
        employeeId: EmployeeID,
        fileName: string,
        templatePath: string
    ): Promise<void> {
        const template = await fs.readFile(templatePath);

        const employeeDir = await this.fakeEmployeeDir(employeeId);
        await this.explorer.createFile(employeeDir, fileName, template);

        console.log(
            `Created one-pager "${fileName}" in "${employeeDir}" from template "${templatePath}"!`
        );
    }

    private async fakeEmployeeDir(employeeId: EmployeeID): Promise<string> {
        const dir = this.folderNameFromEmployee('Max', 'Mustermann', employeeId);
        await this.explorer.createFolder(dir);
        console.log(`Ensured directory exists for employee "${employeeId}": ${dir}`);
        return dir;
    }

    private folderNameFromEmployee(
        name: string,
        familyName: string,
        employeeId: EmployeeID
    ): EmployeeFolder {
        return `${name}_${familyName}_${employeeId}`;
    }
}

export function onePagerFile(
    name: string,
    familyName: string,
    local: Local | undefined,
    lastUpdated: Date
): string {
    return `${familyName}, ${name}_${local ? `${local}_` : ''}${toYYMMDD(lastUpdated)}.pptx`;
}

function toYYMMDD(date: Date): string {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
}
