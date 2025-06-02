import { EmployeeID, isEmployeeId } from "../DomainTypes";

export type EmployeeFolder = `${string}_${string}_${string}`;
export function isEmployeeFolder(folderName: unknown): folderName is EmployeeFolder {
    if (typeof folderName !== "string") {
        return false;
    }

    const parts = folderName.split("_");
    return parts.length === 3 && parts.every(part => part.length > 0);
}

export function employeeIdFromFolder(folder: EmployeeFolder): EmployeeID {
    const lastPart = folder.split("_").pop(); // we are guranteed that it works because EmployeeFolder has at least 3 parts
    if (!isEmployeeId(lastPart)) {
        throw new Error(`(DirectoryBasedOnePager.ts: employeeIdFromFolder) Invalid folder name: ${folder}`);
    }
    return lastPart;
}

export function folderNameFromEmployee(name: string, familyName: string, employeeId: EmployeeID): EmployeeFolder {
    return `${name}_${familyName}_${employeeId}`;
}

export type OnePagerFile = `${string}, ${string}_DE_${number}.pptx`;
export function isOnePagerFile(fileName: unknown): fileName is OnePagerFile {
    if (typeof fileName !== "string") {
        return false;
    }

    return !!fileName.match(/.+, .+_DE_(\d{6})\.pptx$/);
}

export function onePagerFile(name: string, familyName: string, lastUpdated: Date): string {
    return `${familyName}, ${name}_DE_${toYYMMDD(lastUpdated)}.pptx`;
}

export function dateFromOnePagerFile(file: OnePagerFile): Date {
    const match = file.match(/_(\d{6})\.pptx$/);
    if (!match) {
        throw new Error(`(DirectoryBasedOnePager.ts: dateFromOnePagerFile) Invalid one-pager file name: "${file}"!`);
    }
    return fromYYMMDD(match[1]);
}

function toYYMMDD(date: Date): string {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
}

/**
 * Parses a string in yyMMdd format to a Date.
 */
function fromYYMMDD(yyMMdd: string): Date {
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
