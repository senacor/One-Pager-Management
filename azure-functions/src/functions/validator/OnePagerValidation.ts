import {
    EmployeeID,
    EmployeeRepository,
    LoadedOnePager,
    Local,
    Logger,
    OnePager,
    OnePagerRepository,
    ValidationError,
    ValidationReporter,
    ValidationRule,
} from './DomainTypes';
import { Pptx } from './rules/Pptx';

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
        logger: Logger = console
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
        const employeeData = await this.employees.getEmployee(id);
        if (!employeeData) {
            this.logger.error(`Employee ${id} does not exist.`);
            return;
        }

        const onePagers = await this.onePagers.getAllOnePagersOfEmployee(id);
        this.logger.log(
            `Validating one-pagers for employee ${id}, found ${onePagers.length} one-pagers.`
        );

        const candidates = this.selectNewestOnePagers(onePagers);
        this.logger.log(`Identified ${candidates.length} candidate one-pagers for validation.`);

        const loadedCandidates = (
            await Promise.all(candidates.map(c => this.loadOnePager(c)))
        ).flat();

        const selectedCandidates = Object.values(
            loadedCandidates.reduce(
                (acc, current) => {
                    const langs = [current.local || current.contentLanguages].flat();
                    for (const lang of langs) {
                        if (
                            acc[lang] === undefined ||
                            acc[lang].lastUpdateByEmployee < current.lastUpdateByEmployee
                        ) {
                            acc[lang] = current;
                        }
                    }
                    return acc;
                },
                {} as Record<Local, LoadedOnePager>
            )
        ).filter(uniq);

        this.logger.log(
            `Selected one-pagers for validation based on language and last update: ${selectedCandidates.map(op => `${op.local || op.contentLanguages.join('+')} (${op.webLocation})`).join(', ')}`
        );

        const validationResults = await Promise.all(
            selectedCandidates.map(async op => ({
                onePager: op,
                errors: await this.validationRule(op, employeeData),
            }))
        );

        const results = [
            ...validationResults,
            ...this.validateRequiredVersions(selectedCandidates),
        ];

        const errors = results.flatMap(r => r.errors).filter(uniq);
        this.logger.log(`Validation results for employee ${id}:`, errors);
        if (errors.length === 0) {
            this.logger.log(`Employee ${id} has valid OnePagers!`);
            await this.reporter.reportValid(id);
        } else {
            this.logger.log(`Employee ${id} has the following errors: ${errors.join(' ')}!`);
            await this.reporter.reportErrors(id, candidates[0], errors, employeeData);
        }
    }

    validateRequiredVersions(
        candidates: LoadedOnePager[]
    ): { onePager: undefined; errors: ValidationError[] }[] {
        if (candidates.length === 0) {
            return [
                {
                    onePager: undefined,
                    errors: ['MISSING_DE_VERSION'] as ValidationError[],
                },
                {
                    onePager: undefined,
                    errors: ['MISSING_EN_VERSION'] as ValidationError[],
                },
            ];
        } else if (candidates.length === 1 && candidates[0].contentLanguages.length === 1) {
            const missingLang =
                (candidates[0].local || candidates[0].contentLanguages[0]) === 'DE' ? 'EN' : 'DE';
            return [
                {
                    onePager: undefined,
                    errors: [`MISSING_${missingLang}_VERSION`] as ValidationError[],
                },
            ];
        } else {
            return [];
        }
    }

    /**
     * A function to select the newest one-pager.
     * @param onePagers The list of one-pagers to select from.
     * @returns The newest one-pager or undefined if no one-pagers are found.
     */
    selectNewestOnePagers(onePagers: OnePager[]): OnePager[] {
        if (onePagers.length === 0) {
            this.logger.log(`No one-pagers found for current employee!`);
            return [];
        }

        const candidates = onePagers.reduce(
            (acc, current) => {
                const lang = current.local;
                if (lang) {
                    const lastUpdate = acc[lang]?.lastUpdateByEmployee;
                    if (!lastUpdate || current.lastUpdateByEmployee > lastUpdate) {
                        acc[lang] = current;
                    }
                }
                return acc;
            },
            {} as Record<Local, OnePager>
        );
        const { DE, EN } = candidates;

        const without = onePagers.filter(op => op.local === undefined);

        const extraDe = without.filter(
            op => op.lastUpdateByEmployee > (DE?.lastUpdateByEmployee || new Date(0))
        );
        const extraEn = without.filter(
            op => op.lastUpdateByEmployee > (EN?.lastUpdateByEmployee || new Date(0))
        );

        const select = Math.sign(extraDe.length) + Math.sign(extraEn.length);

        const extra = extraDe
            .concat(extraEn)
            .filter(uniq)
            .sort((a, b) => (a.lastUpdateByEmployee > b.lastUpdateByEmployee ? -1 : 1))
            .slice(0, select);

        return Object.values(candidates).concat(extra);
    }

    private async loadOnePager(onePager: OnePager): Promise<LoadedOnePager> {
        this.logger.log(`Loading one-pager from ${onePager.webLocation}`);
        const pptx = await onePager.data().then(data => Pptx.load(data, this.logger));
        return {
            ...onePager,
            pptx,
            contentLanguages: await pptx.getContentLanguages(),
        };
    }
}

export function uniq<T>(item: T, pos: number, self: T[]): boolean {
    return self.indexOf(item) === pos;
}
