import { ValidationRule } from "./DomainTypes";

export const hasOnePager: ValidationRule = async onePager => onePager ? [] : ["MISSING_ONE_PAGER"];

export const lastModifiedRule: ValidationRule = async onePager => {
    if(!onePager) {
        return [];
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return onePager?.lastUpdateByEmployee < sixMonthsAgo ? ["OLDER_THAN_SIX_MONTHS"] : [];
};

export const alwaysFail: ValidationRule = async (onePager) => {
    return ["ALWAYS_FAIL"];
};

export const validationRules = {
    hasOnePager,
    lastModifiedRule,
    alwaysFail
};

export const allRules = combineRules(...Object.values(validationRules));

export function combineRules(...rules: ValidationRule[]): ValidationRule {
    return async onePager => {
        const errors = await Promise.all(rules.map(rule => rule(onePager)));
        return errors.flat();
    };
}
