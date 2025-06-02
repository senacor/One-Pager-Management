import { URL } from "node:url";

export type EmployeeID = `${number}`;

export function isEmployeeId(txt: unknown): txt is EmployeeID {
    return typeof txt === "string" && /\d+/.test(txt);
}

export type OnePager = {
    lastUpdateByEmployee: Date;
    webLocation?: URL;
    fileLocation: URL;
};

export interface OnePagerRepository {
    getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]>;
}

export interface EmployeeRepository {
    getAllEmployees(): Promise<EmployeeID[]>;
}

export type ValidationError = "OLDER_THAN_SIX_MONTHS" | "MISSING_ONE_PAGER" | "ALWAYS_FAIL" | "USING_OLD_TEMPLATE";

export interface ValidationReporter {
    reportValid(id: EmployeeID): Promise<void>;
    reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void>;
    getResultFor(id: EmployeeID): Promise<ValidationError[]>;
}

export type ValidationRule = (onePager: OnePager | undefined) => Promise<ValidationError[]>;

export interface Logger {
    debug(...args: any[]): void;

    log(...args: any[]): void;

    warn(...args: any[]): void;

    error(...args: any[]): void;
}
