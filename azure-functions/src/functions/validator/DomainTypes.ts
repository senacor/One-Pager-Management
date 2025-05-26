import { Url } from "url";

export type EmployeeID = string;

export function isEmployeeId(txt: string): txt is EmployeeID {
  return true;
}

export type OnePager = {
  lastUpdateByEmployee: Date;
};

export interface OnePagerRepository {
  getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[] | undefined>;
}

export type ValidationError = "OLDER_THEN_SIX_MONTHS" | "MISSING_ENGLISH_VERSION" | "MISSING_GERMAN_VERSION";

export interface ValidationReporter {
  reportValid(id: EmployeeID): Promise<void>;
  reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void>;
  getResultFor(id: EmployeeID): Promise<ValidationError[]>;
}
