import { EmployeeID, EmployeeRepository, OnePager, OnePagerRepository, ValidationReporter, ValidationRule } from "./DomainTypes";

export class OnePagerValidation {
    private readonly onePagers: OnePagerRepository;
    private readonly employees: EmployeeRepository;
    private readonly reporter: ValidationReporter;
    private readonly validationRule: ValidationRule;

    constructor(onePagers: OnePagerRepository, employees: EmployeeRepository, reporter: ValidationReporter, validationRule: ValidationRule) {
        this.onePagers = onePagers;
        this.employees = employees;
        this.reporter = reporter;
        this.validationRule = validationRule;
    }

    async validateOnePagersOfEmployee(id: EmployeeID) {
        if (!(await this.employees.getAllEmployees()).includes(id)) {
            console.log(`Employee ${id} does not exist.`);
            return;
        }

        const onePagers = await this.onePagers.getAllOnePagersOfEmployee(id);
        console.log(`Validating one-pagers for employee ${id}, found ${onePagers.length} one-pagers.`);

        const newest = this.selectNewestOnePager(onePagers);
        console.log(`Newest OnePager is ${newest?.lastUpdateByEmployee}!`);

        const errors = await this.validationRule(newest);

        if (errors.length === 0) {
            console.log(`Employee ${id} has valid OnePagers!`);
            await this.reporter.reportValid(id);
        } else {
            console.log(`Employee ${id} has the following errors: ${errors.join(' ')}!`);
            await this.reporter.reportErrors(id, "<not yet implemented>", errors);
        }
    }

    private selectNewestOnePager(onePagers: OnePager[]): OnePager | undefined {
        if (onePagers.length === 0) {
            return undefined;
        }

        return onePagers.reduce((newest, current) => {
            return current.lastUpdateByEmployee > newest.lastUpdateByEmployee ? current : newest;
        });
    }

}
