import { URL } from 'node:url';
import { Pptx } from './rules/Pptx';

/**
 * Represents an employee ID as a string that consists of digits only.
 */
export type EmployeeID = `${number}`;

/**
 * A function to check if a given variable is a valid EmployeeID.
 * @param txt A variable to check if it is a valid EmployeeID.
 * @returns Is the variable a valid EmployeeID?
 */
export function isEmployeeId(txt: unknown): txt is EmployeeID {
    return typeof txt === 'string' && /\d+/.test(txt);
}

export enum LocalEnum {
    DE = 'DE',
    EN = 'EN',
}

export type Local = keyof typeof LocalEnum;
/**
 * A function to check if a given variable is a valid Local.
 * @param txt A variable to check if it is a valid Local.
 * @returns Is the variable a valid Local?
 */
export function isLocal(txt: unknown): txt is Local {
    return Object.values(LocalEnum).includes(txt as LocalEnum);
}

/**
 * Represents a one-pager document for an employee.
 */
export type OnePager = {
    fileName?: string;
    lastUpdateByEmployee: Date;
    local?: Local;
    data: () => Promise<Buffer>;
    webLocation: URL;
};


export enum ValidationErrorEnum {
    OLDER_THAN_SIX_MONTHS = 'OLDER_THAN_SIX_MONTHS', // one-pager is older than 6 months
    OLDER_THAN_ONE_YEAR = 'OLDER_THAN_ONE_YEAR', // one-pager is older than 6 months
    USING_UNKNOWN_TEMPLATE = 'USING_UNKNOWN_TEMPLATE', // one-pager is using an unknown template, in most cases an outdated template with old styling
    USING_MODIFIED_TEMPLATE = 'USING_MODIFIED_TEMPLATE', // one-pager is using a modified template. It probably looks correct, but the file might contain other slides with different styling.
    MISSING_LANGUAGE_INDICATOR_IN_NAME = 'MISSING_LANGUAGE_INDICATOR_IN_NAME', // one-pager is missing a language indicator in the file name
    MISSING_DE_VERSION = 'MISSING_DE_VERSION', // employee has no one-pager in German
    MISSING_EN_VERSION = 'MISSING_EN_VERSION', // employee has no one-pager in English
    MISSING_PHOTO = 'MISSING_PHOTO', // one-pager  has no photo of the employee

    OTHER_IMAGES = 'OTHER_IMAGES', // one-pager containes other images that do not belong
    LOW_QUALITY_PHOTO = 'LOW_QUALITY_PHOTO', // one-pager has a photo of the employee, but it is of low quality
    MIXED_LANGUAGE_VERSION = 'MIXED_LANGUAGE_VERSION', // one-pager has slides in different languages
    WRONG_LANGUAGE_CONTENT = 'WRONG_LANGUAGE_CONTENT', // one-pager indicates a different language as is used
};
export const listOfGeneralErrors = [
    ValidationErrorEnum.MISSING_DE_VERSION,
    ValidationErrorEnum.MISSING_EN_VERSION
];



/**
 * Type definition for all possible validation errors that can occur during one-pager validation.
 */
export type ValidationError = keyof typeof ValidationErrorEnum;
export function isValidationError(txt: unknown): txt is ValidationError {
    return Object.values(ValidationErrorEnum).includes(txt as ValidationErrorEnum);
};

export type LoadedOnePager = {
    onePager: OnePager;
    pptx: Pptx;
    contentLanguages: Local[];
};
export type ValidatedOnePager = {
    onePager: OnePager | undefined;
    errors: ValidationError[];
    folderURL: URL | undefined; // URL to the folder containing the one-pager file
};

export type LocalToValidatedOnePager = {
    [key in Local]: ValidatedOnePager;
};

export type ValidationRule = (
    onePager: LoadedOnePager,
    employeeData: Employee
) => Promise<ValidationError[]>;

export interface OnePagerRepository {
    /**
     * Fetch all one-pagers for a specific employee. An employee may have multiple one-pagers.
     * Common occurrences are: different languages, different versions, versions for specific purposes(customers), etc.
     * @param employeeId The ID of the employee whose one-pagers should be fetched.
     */
    getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]>;

    getOnePagerFolderURLOfEmployee(employeeId: EmployeeID): Promise<URL | undefined>;
}

/**
 * Interface for fetching all employee IDs.
 */
export interface EmployeeRepository {
    /**
     * Fetches IDs of all current employees.
     */
    getAllEmployees(): Promise<EmployeeID[]>;

    findEmployees(like: {name: string}): Promise<Employee[]>;

    getEmployee(id: EmployeeID): Promise<Employee | undefined>;
}

/**
 * Interface for reporting validation results.
 * It allows to report valid one-pagers and errors found during validation.
 */
export interface ValidationReporter {
    /**
     * Reports that the one-pager of the given employee ID is valid.
     * @param id The ID of the employee whose one-pager is valid.
     */
    reportValid(
        id: EmployeeID,
        validatedOnePager: ValidatedOnePager,
        local: Local,
        employee: Employee
    ): Promise<void>;

    /**
     * Reports errors found during validation of the one-pager.
     * @param id The ID of the employee whose one-pager is being reported.
     * @param onePager The one-pager document being reported on, maybe undefined if no one-pager exists.
     * @param errors The validation errors found.
     */
    reportErrors(
        id: EmployeeID,
        validatedOnePager: ValidatedOnePager,
        local: Local,
        employee: Employee
    ): Promise<void>;

    /**
     * Fetches the latest validation results for the given employee ID.
     * @param id The ID of the employee whose validation results should be fetched.
     */
    getResultFor(id: EmployeeID): Promise<LocalToValidatedOnePager>;

    cleanUpValidationList(validEmployees: EmployeeID[]): Promise<void>;
}

export interface MailReporter {
    /**
     * Reports the validation results of the one-pager to the employee via email.
     * @param id The ID of the employee whose one-pager is being reported.
     * @param validatedOnePager The validated one-pager document.
     * @param local The language of the one-pager.
     */
    reportMail(
        id: EmployeeID,
        validatedOnePager: ValidatedOnePager,
        local: Local
    ): Promise<void>;
}

export type StorageFile = {
    name: string;
    lastModified: Date;
    data: () => Promise<Buffer>;
    url?: URL;
    folderURL?: URL; // Optional URL to the folder containing the file
};
export type StorageFolder = {
    name: string;
    webLocation: URL | undefined;
};

export interface StorageExplorer {
    /**
     * Creates a file in the specified folder with the given content.
     * @param folder The folder where the file should be created.
     * @param name The name of the file to be created.
     * @param content The content of the file as a Buffer.
     *
     * @throws Error if the folder does not exist.
     */
    createFile(folder: string, name: string, content: Buffer): Promise<void>;

    /**
     * Indempotently creates a folder with the given name.
     * If the folder already exists, it does nothing.
     * @param folder The name of the folder to be created.
     */
    createFolder(folder: string): Promise<void>;

    listFolders(): Promise<string[]>;

    /**
     * Lists all files in the specified folder.
     * No error is thrown if the folder does not exist.
     *
     * @param folder The folder from which to list files.
     * @returns A promise that resolves to an array of StorageFile objects representing the files in the specified folder.
     */
    listFiles(folder: string): Promise<StorageFile[]>;

    listFoldersWithURLs(): Promise<StorageFolder[]>;
}

export interface UseOfOnePagerReporter {

    confirmUseOfOnePagerForEmployee(employeeToken: string, id: EmployeeID): Promise<void>;
    reportNewEmployee(id: EmployeeID): Promise<void>;

    didEmployeeAllowUseOfOnePager(id: EmployeeID): Promise<boolean>;
    getTokenOfEmployee(id: EmployeeID): Promise<EmployeeToken | undefined>;
}

export type EmployeeToken = string;
export function isEmployeeTokenValid(employeeToken: unknown): employeeToken is EmployeeToken {
    return typeof employeeToken === 'string' && employeeToken.length > 0;
}

export type EmailAddress = string;
export function isEmailAddress(txt: unknown): txt is EmailAddress {
    return typeof txt === 'string' && /^[a-zA-Z0-9._%+-]+@(senacor|finanteq).com$/.test(txt);
}
export interface MailPort {
    /**
     * Sends an email to the specified recipients with the given subject and body.
     * @param to An array of email addresses to send the email to.
     * @param subject The subject of the email.
     * @param body The body content of the email.
     */
    sendMail(to: EmailAddress, subject: string, content: string): Promise<void>;
}

export type MSScope =
    | 'https://graph.microsoft.com/.default'
    | 'https://analysis.windows.net/powerbi/api/.default';

export type Employee = {
    id: EmployeeID;
    name: string;
    email: EmailAddress | null;
    entry_date: string;
    office: string;
    date_of_employment_change: string | null;
    position_current: string | null;
    resource_type_current: string | null;
    staffing_pool_current: string | null;
    position_future: string | null;
    resource_type_future: string | null;
    staffing_pool_future: string | null;
    isGerman: boolean; // Indicates if the employee is from a german speaking country to know if german one-pager is required
};

/**
 * --------------------- Auxiliary Interfaces ---------------------
 */

/**
 * Interface for a simple logger used in nearly every class.
 */
export interface Logger {
    debug(...args: unknown[]): void;

    log(...args: unknown[]): void;

    warn(...args: unknown[]): void;

    error(...args: unknown[]): void;
}



export function dateToString(date: Date | undefined): string | undefined {
    if (!date) {
        return undefined;
    }

    const yyyy = String(date.getUTCFullYear());
    const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(date.getUTCDate()).padStart(2, '0');
    return `${mm}/${dd}/${yyyy}`;
}

export function stringToDate(dateString: string | undefined): Date | undefined {
    if (!dateString) {
        return undefined;
    }

    if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) {
        const mm = parseInt(dateString.slice(0, 2), 10) - 1; // Months are zero-based
        const dd = parseInt(dateString.slice(3, 5), 10);
        const yyyy = parseInt(dateString.slice(6, 19), 10);
        return new Date(Date.UTC(yyyy, mm, dd));
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(dateString)) {
        return new Date(dateString);
    } else {
        throw new Error(`Unkown date format: ${  dateString}`);
    }

    // Otherwise Expecting dateString in format `MM/DD/YYYY`
}
