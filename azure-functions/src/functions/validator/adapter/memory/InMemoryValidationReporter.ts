import { EmployeeID, Logger, ValidationError, ValidationReporter } from "../../DomainTypes";

export class InMemoryValidationReporter implements ValidationReporter {
    private readonly logger: Logger;
    private readonly reports: Map<EmployeeID, { name: string, errors?: ValidationError[] }> = new Map();

    constructor(logger: Logger = console) {
        this.logger = logger;
    }

    async reportValid(id: EmployeeID): Promise<void> {
        this.logger.log("(InMemoryValidationReporter) reportValid:", id);
        this.reports.delete(id);
    }

    async reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void> {
        this.logger.log("(InMemoryValidationReporter) reportErrors:", id, name, errors);
        this.reports.set(id, { name, errors });
    }

    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
        this.logger.log("(InMemoryValidationReporter) getResultFor:", id);
        return this.reports.get(id)?.errors || [];
    }
}
