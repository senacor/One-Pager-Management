import { Logger, ValidationErrorEnum, ValidationRule } from '../DomainTypes';
import { usesCurrentTemplate } from './template';
import config from '../../../../app_config/config.json';
import { checkImages } from './photo';

export const CURRENT_TEMPLATE_PATH = config.onePagerDETemplatePath;

export const lastModifiedRule: ValidationRule = async onePager => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return onePager.onePager.lastUpdateByEmployee < sixMonthsAgo ? [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS] : [];
};

export const contentLanguageIsIndicatedInName: ValidationRule = async onePager => {
    if (onePager.contentLanguages.length > 1) {
        return [ValidationErrorEnum.MIXED_LANGUAGE_VERSION];
    }

    switch (onePager.onePager.local) {
        case undefined:
            return [ValidationErrorEnum.MISSING_LANGUAGE_INDICATOR_IN_NAME];
        case onePager.contentLanguages[0]:
            return [];
        default:
            return [ValidationErrorEnum.WRONG_LANGUAGE_CONTENT];
    }
};

/**
 * Combination of all rules we have defined for the one-pager validation.
 */
export function allRules(log: Logger = console): ValidationRule {
    return combineRules(
        lastModifiedRule,
        contentLanguageIsIndicatedInName,
        usesCurrentTemplate(log),
        checkImages
    );
}

/**
 * An auxiliary function to combine multiple validation rules into one.
 * @param rules The validation rules to combine.
 * @returns The combined validation rule.
 */
export function combineRules(...rules: ValidationRule[]): ValidationRule {
    return async (onePager, employeeData) => {
        const errors = await Promise.all(rules.map(rule => rule(onePager, employeeData)));
        return errors.flat();
    };
}
