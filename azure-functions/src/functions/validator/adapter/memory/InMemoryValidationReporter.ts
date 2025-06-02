import { EmployeeID, Logger, OnePager, ValidationError, ValidationReporter } from "../../DomainTypes";

export class InMemoryValidationReporter implements ValidationReporter {
    private readonly logger: Logger;
    private readonly reports: Map<EmployeeID, { onePager: OnePager | undefined, errors?: ValidationError[] }> = new Map();

    constructor(logger: Logger = console) {
        this.logger = logger;
    }

    async reportValid(id: EmployeeID): Promise<void> {
        this.logger.log("(InMemoryValidationReporter.ts: reportValid)", id);
        this.reports.delete(id);
    }

    async reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void> {
        this.logger.log("((InMemoryValidationReporter.ts: reportErrors)", id, onePager, errors);
        this.reports.set(id, { onePager, errors });
    }

    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
        this.logger.log("(InMemoryValidationReporter.ts: getResultFor)", id);
        return this.reports.get(id)?.errors || [];
    }
}
