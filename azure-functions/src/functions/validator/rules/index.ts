import { Logger, ValidationRule } from '../DomainTypes';
import { hasPhoto, hasQualityPhoto } from './photo';
import { usesCurrentTemplate } from './template';

// The path to the current template file used for OnePagers.
export const CURRENT_TEMPLATE_PATH = 'src/templates/OP_Template_PPT_DE_240119.pptx';

/*
 * -------- Validation rules to check the metadata of a OnePager. --------
 *
 */

export const lastModifiedRule: ValidationRule = async onePager => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return onePager.lastUpdateByEmployee < sixMonthsAgo ? ['OLDER_THAN_SIX_MONTHS'] : [];
};

export const contentLanguageIsIndicatedInName: ValidationRule = async onePager => {
    if (onePager.contentLanguages.length > 1) {
        return ['MIXED_LANGUAGE_VERSION'];
    }

    switch (onePager.local) {
        case undefined:
            return ['MISSING_LANGUAGE_INDICATOR_IN_NAME'];
        case onePager.contentLanguages[0]:
            return [];
        default:
            return ['WRONG_LANGUAGE_CONTENT'];
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
        hasPhoto(log),
        hasQualityPhoto(log)
    );
}

/**
 * An auxiliary function to combine multiple validation rules into one.
 * @param rules The validation rules to combine.
 * @returns The combined validation rule.
 */
export function combineRules(...rules: ValidationRule[]): ValidationRule {
    return async onePager => {
        const errors = await Promise.all(rules.map(rule => rule(onePager)));
        return errors.flat();
    };
}
