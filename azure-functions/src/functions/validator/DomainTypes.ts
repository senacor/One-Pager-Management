import { URL } from "node:url";

/**
 * --------------------- Employee Types ---------------------
 */


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
    return typeof txt === "string" && /\d+/.test(txt);
}



/**
 * --------------------- OnePager Types ---------------------
 */


/**
 * Represents a one-pager document for an employee.
 */
export type OnePager = {
    lastUpdateByEmployee: Date;
    webLocation?: URL;
    fileLocation: URL;
};




/**
 * --------------------- Validation Types ---------------------
 */


/**
 * Type definition for all possible validation errors that can occur during one-pager validation.
 */
export type ValidationError = "OLDER_THAN_SIX_MONTHS" | "MISSING_ONE_PAGER" | "USING_OLD_TEMPLATE";

/**
 *
 */
export type ValidationRule = (onePager: OnePager | undefined) => Promise<ValidationError[]>;







/**
 * --------------------- Adapter Interfaces ---------------------
 */


/**
 * Interface for fetching one-pagers of employees.
 */
export interface OnePagerRepository {
    getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]>;
}

/**
 * Interface for fetching all employee IDs.
 */
export interface EmployeeRepository {
    getAllEmployees(): Promise<EmployeeID[]>;
}

/**
 * Interface for reporting validation results.
 * It allows to report valid one-pagers and errors found during validation.
 */
export interface ValidationReporter {
    reportValid(id: EmployeeID): Promise<void>;
    reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void>;
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
