import { EmployeeID, EmployeeRepository, Logger, OnePager, OnePagerRepository, ValidationReporter, ValidationRule } from "./DomainTypes";

export class OnePagerValidation {
    private readonly logger: Logger;
    private readonly onePagers: OnePagerRepository;
    private readonly employees: EmployeeRepository;
    private readonly reporter: ValidationReporter;
    private readonly validationRule: ValidationRule;

    constructor(
        onePagers: OnePagerRepository, employees: EmployeeRepository,
        reporter: ValidationReporter, validationRule: ValidationRule, logger: Logger = console
    ) {
        this.logger = logger;
        this.onePagers = onePagers;
        this.employees = employees;
        this.reporter = reporter;
        this.validationRule = validationRule;
    }

    async validateOnePagersOfEmployee(id: EmployeeID) {
        if (!(await this.employees.getAllEmployees()).includes(id)) {
            this.logger.error(`(OnePagerValidation.ts: validateOnePagersOfEmployee) Employee ${id} does not exist.`);
            return;
        }

        const onePagers = await this.onePagers.getAllOnePagersOfEmployee(id);
        this.logger.log(`(OnePagerValidation.ts: validateOnePagersOfEmployee) Validating one-pagers for employee ${id}, found ${onePagers.length} one-pagers.`);

        const newest = this.selectNewestOnePager(onePagers);
        this.logger.log(`(OnePagerValidation.ts: validateOnePagersOfEmployee) Newest OnePager is ${newest?.lastUpdateByEmployee}!`);

        const errors = await this.validationRule(newest);

        if (errors.length === 0) {
            this.logger.log(`(OnePagerValidation.ts: validateOnePagersOfEmployee) Employee ${id} has valid OnePagers!`);
            await this.reporter.reportValid(id);
        } else {
            this.logger.log(`(OnePagerValidation.ts: validateOnePagersOfEmployee) Employee ${id} has the following errors: ${errors.join(' ')}!`);
            await this.reporter.reportErrors(id, newest, errors);
        }
    }

    private selectNewestOnePager(onePagers: OnePager[]): OnePager | undefined {
        if (onePagers.length === 0) {
            this.logger.log(`(OnePagerValidation.ts: selectNewestOnePager) No one-pagers found for current employee!`);
            return undefined;
        }

        return onePagers.reduce((newest, current) => {
            return current.lastUpdateByEmployee > newest.lastUpdateByEmployee ? current : newest;
        });
    }
}
