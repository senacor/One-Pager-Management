import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import { Logger, ValidationError, ValidationRule } from "./DomainTypes";
import { fetchOnePagerContent } from './fetcher';

export const CURRENT_TEMPLATE_PATH = "src/templates/OP_Template_PPT_DE_240119.pptx"

export const hasOnePager: ValidationRule = async onePager => onePager ? [] : ["MISSING_ONE_PAGER"];

export const lastModifiedRule: ValidationRule = whenPresent(async onePager => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return onePager?.lastUpdateByEmployee < sixMonthsAgo ? ["OLDER_THAN_SIX_MONTHS"] : [];
});

export const usesCurrentTemplate: ContentValidationRule = async content => {
    const templateData = await readFile(CURRENT_TEMPLATE_PATH);
    const currentThemeHash = await calculateThemeHash(templateData);

    const hash = await calculateThemeHash(content);

    return currentThemeHash === hash ? [] : ["USING_OLD_TEMPLATE"];
};

export function allRules(log: Logger) {
    return combineRules(
        hasOnePager,
        lastModifiedRule,
        combineContentRules(log,
            usesCurrentTemplate
        )
    );
}

export function combineRules(...rules: ValidationRule[]): ValidationRule {
    return async onePager => {
        const errors = await Promise.all(rules.map(rule => rule(onePager)));
        return errors.flat();
    };
}

function whenPresent<T>(fn: (value: T) => Promise<ValidationError[]>): (value: T | undefined) => Promise<ValidationError[]> {
    return value => value ? fn(value) : Promise.resolve([]);
}

type ContentValidationRule = (onePagerContent: Buffer) => Promise<ValidationError[]>;

export function combineContentRules(log: Logger, ...rules: ContentValidationRule[]): ValidationRule {
    return whenPresent(async onePager => {
        const content = await fetchOnePagerContent(log, onePager);
        const errors = await Promise.all(rules.map(rule => rule(content)));
        return errors.flat();
    });
}

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
