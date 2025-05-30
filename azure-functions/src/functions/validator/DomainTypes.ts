import { InvocationContext } from "@azure/functions";
import { URL } from "node:url";

export type EmployeeID = string;

export function isEmployeeId(txt: unknown): txt is EmployeeID {
    return typeof txt === "string" && /\d+/.test(txt);
}

export type OnePager = {
    lastUpdateByEmployee: Date;
    location: URL;
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
    reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void>;
    getResultFor(id: EmployeeID): Promise<ValidationError[]>;
}

export type ValidationRule = (onePager: OnePager | undefined) => Promise<ValidationError[]>;

export interface Logger {
    debug(...args: any[]): void;

    log(...args: any[]): void;

    warn(...args: any[]): void;

    error(...args: any[]): void;
}
