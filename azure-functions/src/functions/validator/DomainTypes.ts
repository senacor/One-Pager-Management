import { Url } from "url";

export type EmployeeID = string;

export function isEmployeeId(txt: unknown): txt is EmployeeID {
    return typeof txt === "string";
}

export type OnePager = {
    lastUpdateByEmployee: Date;
};

export interface OnePagerRepository {
    getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[] | undefined>;
}

export type ValidationError = "OLDER_THAN_SIX_MONTHS" | "MISSING_ENGLISH_VERSION" | "MISSING_GERMAN_VERSION";

export interface ValidationReporter {
    reportValid(id: EmployeeID): Promise<void>;
    reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void>;
    getResultFor(id: EmployeeID): Promise<ValidationError[]>;
}

export type ValidationRule = (onePager: OnePager | undefined) => Promise<ValidationError[]>;