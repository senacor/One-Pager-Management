import { URL } from 'node:url';

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

export type Local = 'DE' | 'EN';

export function isLocal(txt: unknown): txt is Local {
    return txt === 'DE' || txt === 'EN';
}

/**
 * Represents a one-pager document for an employee.
 */
export type OnePager = {
    lastUpdateByEmployee: Date;
    local?: Local;
    data: () => Promise<Buffer>;
    webLocation: URL;
};

/**
 * Type definition for all possible validation errors that can occur during one-pager validation.
 */
export type ValidationError =
    | 'OLDER_THAN_SIX_MONTHS' // one-pager is older than 6 months
    | 'USING_UNKNOWN_TEMPLATE' // one-pager is using an unknown template, in most cases an outdated template with old styling
    | 'USING_MODIFIED_TEMPLATE' // one-pager is using a modified template. It probably looks correct, but the file might contain other slides with different styling.
    | 'MISSING_LANGUAGE_INDICATOR_IN_NAME' // one-pager is missing a language indicator in the file name
    | 'MISSING_DE_VERSION' // employee has no one-pager in German
    | 'MISSING_EN_VERSION' // employee has no one-pager in English
    | 'MISSING_PHOTO' // one-pager has no photo of the employee
    | 'LOW_QUALITY_PHOTO' // one-pager has a photo of the employee, but it is of low quality
    | 'MIXED_LANGUAGE_VERSION' // one-pager has slides in different languages
    | 'WRONG_LANGUAGE_CONTENT'; // one-pager indicates a different language as is used

export type LoadedOnePager = Omit<OnePager, 'fileLocation' | 'data'> & {
    contentLanguages: Local[];
    data: Buffer;
};

export type ValidationRule = (onePager: LoadedOnePager) => Promise<ValidationError[]>;

export interface OnePagerRepository {
    /**
     * Fetch all one-pagers for a specific employee. An employee may have multiple one-pagers.
     * Common occurrences are: different languages, different versions, versions for specific purposes(customers), etc.
     * @param employeeId The ID of the employee whose one-pagers should be fetched.
     */
    getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]>;
}

/**
 * Interface for fetching all employee IDs.
 */
export interface EmployeeRepository {
    /**
     * Fetches IDs of all current employees.
     */
    getAllEmployees(): Promise<EmployeeID[]>;
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
    reportValid(id: EmployeeID): Promise<void>;

    /**
     * Reports errors found during validation of the one-pager.
     * @param id The ID of the employee whose one-pager is being reported.
     * @param onePager The one-pager document being reported on, maybe undefined if no one-pager exists.
     * @param errors The validation errors found.
     */
    reportErrors(
        id: EmployeeID,
        onePager: OnePager | undefined,
        errors: ValidationError[]
    ): Promise<void>;

    /**
     * Fetches the latest validation results for the given employee ID.
     * @param id The ID of the employee whose validation results should be fetched.
     */
    getResultFor(id: EmployeeID): Promise<ValidationError[]>;
}

export interface LanguageDetector {
    /**
     * Detects the language of the given one-pager content.
     * @param content The content of the one-pager.
     * @returns The detected language, or undefined if no language could be detected.
     */
    detectLanguage(content: Buffer): Promise<Local[]>;
}

export type StorageFile = {
    name: string;
    lastModified: Date;
    data: () => Promise<Buffer>;
    url?: URL;
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
}


export type MSScope = 'https://graph.microsoft.com/.default' | 'https://analysis.windows.net/powerbi/api/.default';

export interface DataRepository {

    getDataForEmployee(employeeId: EmployeeID): Promise<EmployeeData>;
}

export type EmployeeData = {
    name: string;
    email: string; //TODO: nach merge mit feature/mail in E-Mail-Adresse umwandeln
    entry_date: string;
    office: string;
    date_of_employment_change: string | null;
    position_current: string  | null;
    resource_type_current: string;
    staffing_pool_current: string;
    position_future: string | null;
    resource_type_future: string | null;
    staffing_pool_future: string | null;
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
