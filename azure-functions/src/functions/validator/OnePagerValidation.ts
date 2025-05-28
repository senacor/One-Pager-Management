import { EmployeeID, OnePager, OnePagerRepository, ValidationError, ValidationReporter, ValidationRule } from "./DomainTypes";



export class OnePagerValidation {
    private readonly repository: OnePagerRepository;
    private readonly reporter: ValidationReporter;
    private readonly validationRule: ValidationRule;

    constructor(repository: OnePagerRepository, reporter: ValidationReporter, validationRule: ValidationRule) {
        this.repository = repository;
        this.reporter = reporter;
        this.validationRule = validationRule;
    }

    async validateOnePagersOfEmployee(id: EmployeeID) {
        const onePagers = await this.repository.getAllOnePagersOfEmployee(id);
        console.log(`Validating one-pagers for employee ${id}, found ${onePagers ? onePagers.length : 0} one-pagers.`);
        if (!onePagers) {
            console.log(`No one-pagers found for employee ${id}.`);
            return;
        }

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
