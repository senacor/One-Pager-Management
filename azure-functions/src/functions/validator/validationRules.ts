import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import { Logger, ValidationError, ValidationRule } from "./DomainTypes";
import { fetchOnePagerContent } from './fetcher';

// The path to the current template file used for OnePagers.
export const CURRENT_TEMPLATE_PATH = "src/templates/OP_Template_PPT_DE_240119.pptx"



/*
 * -------- Validation rules to check the metadata of a OnePager. --------
 *
 */
export const hasOnePager: ValidationRule = async onePager => onePager ? [] : ["MISSING_ONE_PAGER"];

export const lastModifiedRule: ValidationRule = whenPresent(async onePager => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return onePager?.lastUpdateByEmployee < sixMonthsAgo ? ["OLDER_THAN_SIX_MONTHS"] : [];
});







/*
 * -------- Validation rules concerning the content of a OnePager. --------
 */
export const usesCurrentTemplate: ContentValidationRule = async content => {
    const templateData = await readFile(CURRENT_TEMPLATE_PATH);
    const currentThemeHash = await calculateThemeHash(templateData);

    const hash = await calculateThemeHash(content);

    return currentThemeHash === hash ? [] : ["USING_OLD_TEMPLATE"];
};





/*
 * -------- Auxiliary functions to help in defining validation rules of OnePagers. --------
 */

/**
 * An auxiliary function to calculate the MD5 hash of the theme of a PowerPoint file.
 * @param pptxContent
 * @returns
 */
export async function calculateThemeHash(pptxContent: Buffer): Promise<string> {
    const zip = new JSZip();
    const pptx = await zip.loadAsync(pptxContent);
    const themes = Object.keys(pptx.files).filter(file => file.startsWith("ppt/theme/")).sort();

    const hash = createHash('md5');

    for (const t of themes) {
        hash.update(await pptx.files[t].async("base64"));
    }

    return hash.digest("hex");
}









/*
 * -------- Functions to combine all above rules into one validation rule. --------
 */



/**
 * A function combining all validation rules for a OnePager into one rule.
 * @param log
 * @returns
 */
export function allRules(log: Logger) {
    return combineRules(
        hasOnePager,
        lastModifiedRule,
        combineContentRules(log,
            usesCurrentTemplate
        )
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



/**
 * A function to fetch the content of a OnePager and apply a validation rule to it.
 */
type ContentValidationRule = (onePagerContent: Buffer) => Promise<ValidationError[]>;

/**
 * An auxiliary function to create a validation rule that only applies if the value is present.
 * @param fn The function to apply if its value is present.
 * @returns A function that takes a value and returns a promise of validation errors.
 */
function whenPresent<T>(fn: (value: T) => Promise<ValidationError[]>): (value: T | undefined) => Promise<ValidationError[]> {
    return value => value ? fn(value) : Promise.resolve([]);
}



/**
 * A function to convert multiple ContentValidationRules into one ValidationRule.
 * This rule will fetch the content of the OnePager and apply all rules to it.
 * @param log
 * @param rules The content validation rules to combine.
 * @returns The resulting validation rule.
 */
export function combineContentRules(log: Logger, ...rules: ContentValidationRule[]): ValidationRule {
    return whenPresent(async onePager => {
        const content = await fetchOnePagerContent(log, onePager);
        const errors = await Promise.all(rules.map(rule => rule(content)));
        return errors.flat();
    });
}
