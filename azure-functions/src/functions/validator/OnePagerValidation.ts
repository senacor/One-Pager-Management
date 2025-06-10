import {
    EmployeeID,
    EmployeeRepository,
    Logger,
    OnePager,
    OnePagerRepository,
    ValidationError,
    ValidationReporter,
    ValidationRule,
} from './DomainTypes';

/**
 * Validates one-pagers of employees based on a given validation rule.
 */
export class OnePagerValidation {
    private readonly logger: Logger;
    private readonly onePagers: OnePagerRepository;
    private readonly employees: EmployeeRepository;
    private readonly reporter: ValidationReporter;
    private readonly validationRule: ValidationRule;

    /**
     * Creates an instance of OnePagerValidation.
     * @param onePagers The one pager repository to fetch one-pagers from.
     * @param employees A class for fetching all employee IDs.
     * @param reporter The reporter to report validation results.
     * @param validationRule The validation rule to apply to the one-pagers.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(
        onePagers: OnePagerRepository,
        employees: EmployeeRepository,
        reporter: ValidationReporter,
        validationRule: ValidationRule,
        logger: Logger = console,
    ) {
        this.logger = logger;
        this.onePagers = onePagers;
        this.employees = employees;
        this.reporter = reporter;
        this.validationRule = validationRule;
    }

    /**
     * The main function to validate all one-pagers of all employees.
     * It fetches all one-pager of a given employee, selects the newest and applies the validation rule.
     * @param id The employee ID to validate one-pagers for.
     */
    async validateOnePagersOfEmployee(id: EmployeeID): Promise<void> {
        if (!(await this.employees.getAllEmployees()).includes(id)) {
            this.logger.error(`Employee ${id} does not exist.`);
            return;
        }

        const onePagers = await this.onePagers.getAllOnePagersOfEmployee(id);
        this.logger.log(`Validating one-pagers for employee ${id}, found ${onePagers.length} one-pagers.`);

        const candidates = this.selectNewestOnePagers(onePagers);
        this.logger.log(`Identified ${candidates.length} candidate one-pagers for validation.`);

        const results =
            candidates.length === 0
                ? [{ onePager: undefined, errors: ['MISSING_ONE_PAGER'] as ValidationError[] }]
                : await Promise.all(
                    candidates.map(async op => ({
                        onePager: op,
                        errors: await this.validationRule(op),
                    })),
                );

        this.logger.log(`Validation results for employee ${id}:`, results);
        const errors = results.flatMap(r => r.errors);
        if (errors.length === 0) {
            this.logger.log(`Employee ${id} has valid OnePagers!`);
            await this.reporter.reportValid(id);
        } else {
            this.logger.log(`Employee ${id} has the following errors: ${errors.join(' ')}!`);
            await this.reporter.reportErrors(id, candidates[0], errors);
        }
    }

    /**
     * A function to select the newest one-pager.
     * @param onePagers The list of one-pagers to select from.
     * @returns The newest one-pager or undefined if no one-pagers are found.
     */
    private selectNewestOnePagers(onePagers: OnePager[]): OnePager[] {
        if (onePagers.length === 0) {
            this.logger.log(`No one-pagers found for current employee!`);
            return [];
        }

        const noLanguage = 'NO_LANGUAGE';

        const candidates = onePagers.reduce(
            (acc, current) => {
                const lang = current.local || noLanguage;
                const lastUpdate = acc[lang]?.lastUpdateByEmployee;
                if (!lastUpdate || current.lastUpdateByEmployee > lastUpdate) {
                    acc[lang] = current;
                }
                return acc;
            },
            {} as Record<string, OnePager>,
        );

        if (candidates[noLanguage]) {
            const newestLanTagged = [candidates.DE, candidates.EN]
                .filter(op => op !== undefined)
                .sort((a, b) => b.lastUpdateByEmployee.getTime() - a.lastUpdateByEmployee.getTime());

            if (
                newestLanTagged.length > 0 &&
                candidates[noLanguage].lastUpdateByEmployee < newestLanTagged[0].lastUpdateByEmployee
            ) {
                delete candidates[noLanguage];
            }
        }

        return Object.values(candidates);
    }
}
