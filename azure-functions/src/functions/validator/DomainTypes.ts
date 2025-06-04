import { URL } from "node:url";

/**
 * Represents an employee ID as a string that consists of digits only.
 */
export type EmployeeID = `${number}`;

export function isEmployeeId(txt: unknown): txt is EmployeeID {
    return typeof txt === "string" && /\d+/.test(txt);
}

export type Local = 'DE' | 'EN';

/**
 * Represents a one-pager document for an employee.
 */
export type OnePager = {
    lastUpdateByEmployee: Date;
    language?: Local;
    webLocation?: URL;
    fileLocation: URL;
};

/**
 * Type definition for all possible validation errors that can occur during one-pager validation.
 */
export type ValidationError = "OLDER_THAN_SIX_MONTHS" | "MISSING_ONE_PAGER" | "USING_UNKNOWN_TEMPLATE" | "USING_MODIFIED_TEMPLATE";

export type ValidationRule = (onePager: OnePager | undefined) => Promise<ValidationError[]>;

export interface OnePagerRepository {

    /**
     * Fetch all one-pagers for a specific employee. An employee may have multiple one-pagers.
     * Common occurrences are: different languages, different versions, versions for specific purposes(customers), etc.
     * @param employeeId The ID of the employee whose one-pagers should be fetched.
     */
    getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]>;
}

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
    reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void>;

    /**
     * Fetches the latest validation results for the given employee ID.
     * @param id The ID of the employee whose validation results should be fetched.
     */
    getResultFor(id: EmployeeID): Promise<ValidationError[]>;
}








/**
 * --------------------- Auxiliary Interfaces ---------------------
 */


/**
 * Interface for a simple logger used in nearly every class.
 */
export interface Logger {
    debug(...args: any[]): void;

    log(...args: any[]): void;

    warn(...args: any[]): void;

    error(...args: any[]): void;
}
