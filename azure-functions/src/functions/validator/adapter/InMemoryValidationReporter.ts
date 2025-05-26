import { EmployeeID, ValidationError, ValidationReporter } from "../DomainTypes";

export class InMemoryValidationReporter implements ValidationReporter {

  private readonly reports: Map<EmployeeID, { name: string, errors?: ValidationError[] }> = new Map();

  async reportValid(id: EmployeeID): Promise<void> {
    this.reports.delete(id);
  }

  async reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void> {
    this.reports.set(id, { name, errors });
  }

  async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
    return this.reports.get(id)?.errors || [];
  }
}
