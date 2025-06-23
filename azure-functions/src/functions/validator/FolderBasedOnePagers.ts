import {
    Employee,
    EmployeeID,
    EmployeeRepository,
    isEmployeeId,
    isLocal,
    Local,
    Logger,
    OnePager,
    OnePagerRepository,
    StorageExplorer,
} from './DomainTypes';

/**
 * Represents a folder name for an employee in the format "Name_FamilyName_EmployeeID".
 * The folder name consists of three parts separated by underscores.
 * The first part is the employee's name, the second part is the family name, and the third part is the employee ID.
 */
export type EmployeeFolder = `${string}_${string}_${string}`;

/**
 * Represents a one-pager file name in the format "FamilyName, Name_DE_YYMMDD.pptx".
 */
type OnePagerFile = `${string}, ${string}_${Local}_${number}.pptx`;

export class FolderBasedOnePagers implements OnePagerRepository, EmployeeRepository {
    private readonly explorer: StorageExplorer;
    private readonly logger: Logger;

    constructor(explorer: StorageExplorer, logger: Logger = console) {
        this.explorer = explorer;
        this.logger = logger;
    }

    async getEmployee(employeeId: EmployeeID): Promise<Employee | undefined> {
        const folders = await this.explorer.listFolders();

        const employeeDir = folders.find(dir => dir.endsWith(`_${employeeId}`));
        if (!employeeDir) {
            this.logger.warn(`No OnePagers found for employee "${employeeId}"!`);
            return undefined;
        }

        const i = employeeDir.lastIndexOf('_');
        const name = employeeDir.substring(0, i).replace(/_/g, ' ');

        // TODO: Determine at least some data from one pager names for testing purposes
        return {
            id: employeeId,
            name,
            email: '',
            entry_date: '',
            office: '',
            date_of_employment_change: '',
            position_current: '',
            resource_type_current: '',
            staffing_pool_current: '',
            position_future: '',
            resource_type_future: '',
            staffing_pool_future: '',
        };
    }

    /**
     * Fetch all one-pagers for a specific employee. An employee may have multiple one-pagers.
     * Common occurrences are: different languages, different versions, versions for specific purposes(customers), etc.
     * @param employeeId The ID of the employee whose one-pagers should be fetched.
     */
    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        const folders = await this.explorer.listFolders();

        if (folders.length === 0) {
            this.logger.error('No One Pager folders found!');
        }

        const employeeDir = folders.find(dir => dir.endsWith(`_${employeeId}`));
        if (!employeeDir) {
            this.logger.warn(`No OnePagers found for employee "${employeeId}"!`);
            return [];
        }

        const files = await this.explorer.listFiles(employeeDir);

        // Filter for pptx files only
        const pptxFiles = files.filter(f => {
            const isOnePager = isOnePagerFile(f.name);
            if (!isOnePager) {
                this.logger.warn(
                    `File "${f.name}" in "${employeeDir}" is not a valid OnePager file.`
                );
            }
            return isOnePager;
        });

        this.logger.log(
            `Found ${pptxFiles.length} OnePagers for employee "${employeeId}" in "${employeeDir}"!`
        );

        return pptxFiles.map(file => {
            const local = extractLanguageCode(file.name);
            return {
                lastUpdateByEmployee: file.lastModified,
                local,
                fileName: file.name,
                data: file.data,
                webLocation: file.url,
            } as OnePager;
        });
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        const folders = await this.explorer.listFolders();
        return folders.flatMap(f => (isEmployeeFolder(f) ? employeeIdFromFolder(f) : []));
    }
}

/**
 * This function checks if a given folder name is a valid EmployeeFolder.
 * @param folderName The folder name to check if it is a valid EmployeeFolder.
 * @returns Is the folder name a valid EmployeeFolder?
 */
function isEmployeeFolder(folderName: unknown): folderName is EmployeeFolder {
    if (typeof folderName !== 'string') {
        return false;
    }

    const parts = folderName.split('_');
    return parts.length === 3 && parts.every(part => part.length > 0) && isEmployeeId(parts[2]);
}

/**
 * This function extracts the employee ID from a given EmployeeFolder.
 * @param folder The EmployeeFolder from which to extract the employee ID.
 * @param logger The logger to use for logging errors (default is console).
 * @returns The employee ID extracted from the folder name.
 * @throws Error if the folder name does not match the expected format or if the last part is not a valid EmployeeID.
 */
function employeeIdFromFolder(folder: EmployeeFolder): EmployeeID {
    const lastPart = folder.split('_').pop(); // we are guranteed that it works because EmployeeFolder has at least 3 parts
    if (!isEmployeeId(lastPart)) {
        throw new Error(`Invalid folder name: ${folder}`);
    }
    return lastPart;
}

/**
 * This function checks if a given file name is a valid OnePagerFile.
 * @param fileName The file name to check if it is a valid OnePagerFile.
 * @returns Is the file name a valid name for a One Pager?
 */
function isOnePagerFile(fileName: string): fileName is OnePagerFile {
    if (typeof fileName !== 'string') {
        return false;
    }

    return Boolean(fileName.match(/.+, .+?((?<![A-Z])[A-Z]{2})?_(\d{6})\.pptx$/));
}

export function extractLanguageCode(name: string): Local | undefined {
    const match = name.match(/((?<![A-Z])[A-Z]{2})_/i);

    if (match) {
        const group = match[1].toUpperCase();
        if (isLocal(group)) {
            return group;
        }
    }

    return undefined;
}
