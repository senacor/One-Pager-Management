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
export const usesCurrentTemplate = async (content: Buffer) => {
    const templateData = await readFile(CURRENT_TEMPLATE_PATH);
    const templateHashes = await calculateThemeHash(templateData);
    const contentHashes = await calculateThemeHash(content);

    const templateKeys = Object.keys(templateHashes.hashes);
    const contentKeys = Object.keys(contentHashes.hashes);

    // no error if theme contents are equal
    if (templateKeys.length === contentKeys.length &&
        templateKeys.every(key => contentKeys.includes(key) && templateHashes.hashes[key] === contentHashes.hashes[key])) {
        console.log("No error: Template and content themes are equal.");
        return [];
    }

    const themeCountWithSameContent = templateKeys.filter(key => contentKeys.includes(key)).length;
    const hasSomeOriginalTemplateThemes = templateHashes.names.some(name => contentHashes.names.includes(name));

    console.log(`Template keys: ${templateKeys.length}, Content keys: ${contentKeys.length}, Matching themes: ${themeCountWithSameContent}, template names: ${templateHashes.names}, content names: ${contentHashes.names}`);

    // if we detect at least one theme of the template we consider the current one-pager based on it
    const error: ValidationError[] = [themeCountWithSameContent > 0 || hasSomeOriginalTemplateThemes ? "USING_MODIFIED_TEMPLATE" : "USING_UNKNOWN_TEMPLATE"];
    return error;
};

/*
 * -------- Auxiliary functions to help in defining validation rules of OnePagers. --------
 */
export async function calculateThemeHash(pptxContent: Buffer): Promise<{names: string[], hashes: Record<string, string>}> {
    const zip = new JSZip();
    const pptx = await zip.loadAsync(pptxContent);
    const masterFiles = Object.keys(pptx.files).filter(file => file.match(/ppt\/(theme)\//)).sort();

    const hashes: Record<string, string> = {};
    const names: string[] = [];
    for (const f of masterFiles) {
        const xmlContent = await pptx.files[f].async("string");

        const match = xmlContent.match(/<a:theme [^>]+ name="(?:\d_)?([^"]+)">/);
        if(!match) {
            continue;
        }
        const themeName = match[1];
        // these seem to be default themes we do not care about
        if(themeName.toLocaleLowerCase().includes("office")) {
            continue;
        }

        const hash = createHash('md5');
        hash.update(xmlContent);
        const digest = hash.digest("hex");

        hashes[digest] = f;
        names.push(themeName);
    }

    return { names, hashes };
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
