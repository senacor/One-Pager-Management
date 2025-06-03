import { EmployeeID, isEmployeeId, Logger } from "../DomainTypes";

/**
 * Represents a folder name for an employee in the format "Name_FamilyName_EmployeeID".
 * The folder name consists of three parts separated by underscores.
 * The first part is the employee's name, the second part is the family name, and the third part is the employee ID.
 */
export type EmployeeFolder = `${string}_${string}_${string}`;

/**
 * This function checks if a given folder name is a valid EmployeeFolder.
 * @param folderName The folder name to check if it is a valid EmployeeFolder.
 * @returns Is the folder name a valid EmployeeFolder?
 */
export function isEmployeeFolder(folderName: unknown): folderName is EmployeeFolder {
    if (typeof folderName !== "string") {
        return false;
    }

    const parts = folderName.split("_");
    return parts.length === 3 && parts.every(part => part.length > 0);
}

/**
 * This function extracts the employee ID from a given EmployeeFolder.
 * @param folder The EmployeeFolder from which to extract the employee ID.
 * @param logger The logger to use for logging errors (default is console).
 * @returns The employee ID extracted from the folder name.
 * @throws Error if the folder name does not match the expected format or if the last part is not a valid EmployeeID.
 */
export function employeeIdFromFolder(folder: EmployeeFolder, logger: Logger = console): EmployeeID {
    const lastPart = folder.split("_").pop(); // we are guranteed that it works because EmployeeFolder has at least 3 parts
    if (!isEmployeeId(lastPart)) {
        throw new Error(`Invalid folder name: ${folder}`);
    }
    return lastPart;
}

/**
 * This function generates a folder name for an employee based on their name, family name, and employee ID.
 * @param name The name of the employee.
 * @param familyName The family name of the employee.
 * @param employeeId The employee ID of the employee.
 * @returns The folder name in the format "Name_FamilyName_EmployeeID".
 */
export function folderNameFromEmployee(name: string, familyName: string, employeeId: EmployeeID): EmployeeFolder {
    return `${name}_${familyName}_${employeeId}`;
}

/**
 * Represents a one-pager file name in the format "FamilyName, Name_DE_YYMMDD.pptx".
 */
export type OnePagerFile = `${string}, ${string}_DE_${number}.pptx`;

/**
 * This function checks if a given file name is a valid OnePagerFile.
 * @param fileName The file name to check if it is a valid OnePagerFile.
 * @returns Is the file name a valid name for a One Pager?
 */
export function isOnePagerFile(fileName: unknown): fileName is OnePagerFile {
    if (typeof fileName !== "string") {
        return false;
    }

    return !!fileName.match(/.+, .+_DE_(\d{6})\.pptx$/);
}

/**
 * This function generates a one-pager file name based on the employee's name, family name, and last updated date.
 * @param name The name of the employee.
 * @param familyName The family name of the employee.
 * @param lastUpdated The date when the one-pager was last updated.
 * @returns The one-pager file name in the format "FamilyName, Name_DE_YYMMDD.pptx".
 */
export function onePagerFile(name: string, familyName: string, lastUpdated: Date): string {
    return `${familyName}, ${name}_DE_${toYYMMDD(lastUpdated)}.pptx`;
}

/**
 * This function extracts the date from a one-pager file name in the format "FamilyName, Name_DE_YYMMDD.pptx".
 * @param file The one-pager file name in the format "FamilyName, Name_DE_YYMMDD.pptx".
 * @param logger The logger to use for logging errors (default is console).
 * @returns The date extracted from the file name in the format "YYMMDD".
 * @throws Error if the file name does not match the expected format.
 */
export function dateFromOnePagerFile(file: OnePagerFile, logger: Logger = console): Date {
    const match = file.match(/_(\d{6})\.pptx$/);
    if (!match) {
        throw new Error(`(DirectoryBasedOnePager.ts: dateFromOnePagerFile) Invalid one-pager file name: "${file}"!`);
    }
    return fromYYMMDD(match[1], logger);
}

/**
 * Converts a JS Date object to a string in yyMMdd format.
 * @param date - The date to convert.
 */
function toYYMMDD(date: Date): string {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
}

/**
 * Parses a string in yyMMdd format to a Date.
 * @param yyMMdd - The date string in yyMMdd format (e.g., "230101" for January 1, 2023).
 * @param logger - The logger to use for logging errors (default is console).
 * @returns A Date object representing the date.
 * @throws Error if the input string is not in the correct format.
 */
function fromYYMMDD(yyMMdd: string, logger: Logger = console): Date {
    if (!/^\d{6}$/.test(yyMMdd)) {
        throw new Error(`(DirectoryBasedOnePager.ts: fromYYMMDD) Invalid yyMMdd date string: "${yyMMdd}"!`);
    }
    const year = Number(yyMMdd.slice(0, 2));
    const month = Number(yyMMdd.slice(2, 4)) - 1; // JS months are 0-based
    const day = Number(yyMMdd.slice(4, 6));
    // Assume 2000-2099 for 2-digit years
    const fullYear = year + 2000;
    return new Date(fullYear, month, day);
}
