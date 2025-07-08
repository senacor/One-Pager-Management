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
    LocalEnum,
    LocalToValidatedOnePager
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
        const onePagerFolderURL = await this.onePagers.getOnePagerFolderURLOfEmployee(id);
        this.logger.log(
            `Validating one-pagers for employee ${id}, found ${onePagers.length} one-pagers.`
        );

        const candidates = this.selectNewestOnePagers(onePagers);
        this.logger.log(`Identified ${candidates.length} candidate one-pagers for validation.`);

        const loadedCandidates: LoadedOnePager[] = (
            await Promise.all(candidates.map(c => this.loadOnePager(c)))
        ).flat();

        const selectedCandidates: Record<Local, LoadedOnePager> = loadedCandidates.reduce(
                (acc, current) => {
                    const langs = [current.onePager.local || current.contentLanguages].flat();
                    for (const lang of langs) {
                        if (
                            acc[lang] === undefined ||
                            acc[lang].onePager.lastUpdateByEmployee < current.onePager.lastUpdateByEmployee
                        ) {
                            acc[lang] = current;
                        }
                    }
                    return acc;
                },
                {} as Record<Local, LoadedOnePager>
            );

        this.logger.log(
            `Selected one-pagers for validation based on language and last update: ${selectedCandidates}`
        );

        // wrap each one pager with local in one ValidatedOnePager object and files with no language in name in multiple ValidatedOnePager objects based on contentLanguages
        const validatedOnePagers: LocalToValidatedOnePager = Object.assign({}, ...(await Promise.all(Object.values(LocalEnum).map(async lang => {
            const op = selectedCandidates[lang];
            if (!op) {
                this.logger.log(`No one-pager found for language ${lang} for employee ${id}.`);
                return {
                    [lang]: {
                        onePager: undefined,
                        errors: [`MISSING_${lang}_VERSION`] as ValidationError[],
                        folderURL: onePagerFolderURL
                    }
                };
            }
            return {
                [lang]: {
                    onePager: op.onePager,
                    errors: await this.validationRule(op, employeeData),
                    folderURL: onePagerFolderURL
                }
            };
        }))));


        const errors = Object.values(validatedOnePagers).flatMap(r => r.errors).filter(uniq);
        this.logger.log(`Validation results for employee ${id}:`, errors);

        await Promise.all(Object.values(LocalEnum).map(async (lang) => {

            if (!employeeData.isGerman && lang === LocalEnum.DE) {
                this.logger.log(`Employee ${id} is not German, skipping DE one-pager.`);
                return;
            }

            if (validatedOnePagers[lang].errors.length === 0) {
                this.logger.log(`Employee ${id} has valid OnePagers!`);
                await this.reporter.reportValid(id,validatedOnePagers[lang], lang, employeeData);
            } else {
                this.logger.log(`Employee ${id} has the following errors: ${errors.join(' ')}!`);
                await this.reporter.reportErrors(id, validatedOnePagers[lang], lang, employeeData);
            }
        }));
    }

    // validateRequiredVersions(
    //     candidates: LoadedOnePager[]
    // ): ValidatedOnePager[] {
    //     if (candidates.length === 0) {
    //         return [
    //             {
    //                 onePager: undefined,
    //                 errors: [ValidationErrorEnum.MISSING_DE_VERSION] as ValidationError[],
    //             },
    //             {
    //                 onePager: undefined,
    //                 errors: [ValidationErrorEnum.MISSING_EN_VERSION] as ValidationError[],
    //             },
    //         ];
    //     } else if (candidates.length === 1 && (candidates[0].contentLanguages.length === 1 || candidates[0].onePager.local)) {
    //         const missingLang: Local =
    //             (candidates[0].onePager.local || candidates[0].contentLanguages[0]) === LocalEnum.DE ? LocalEnum.EN : LocalEnum.DE;
    //         return [
    //             {
    //                 onePager: undefined,
    //                 errors: [`MISSING_${missingLang}_VERSION`] as ValidationError[],
    //             },
    //         ];
    //     } else {
    //         this.logger.log(`Found ${candidates.length} one-pagers:`, JSON.stringify(candidates.map(c => c.contentLanguages)));
    //         return [];
    //     }
    // }

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
            onePager: onePager,
            pptx,
            contentLanguages: await pptx.getContentLanguages(),
        };
    }
}

export function uniq<T>(item: T, pos: number, self: T[]): boolean {
    return self.indexOf(item) === pos;
}
