import { EmployeeID, ValidationError, ValidationReporter } from "../DomainTypes";

export class InMemoryValidationReporter implements ValidationReporter {

    private readonly reports: Map<EmployeeID, { name: string, errors?: ValidationError[] }> = new Map();

    async reportValid(id: EmployeeID): Promise<void> {
        console.log("(InMemoryValidationReporter) reportValid:", id);
        this.reports.delete(id);
    }

    async reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void> {
        console.log("(InMemoryValidationReporter) reportErrors:", id, name, errors);
        this.reports.set(id, { name, errors });
    }

    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
        console.log("(InMemoryValidationReporter) getResultFor:", id);
        return this.reports.get(id)?.errors || [];
    }
}
