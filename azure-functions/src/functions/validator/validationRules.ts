import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import fetch from 'isomorphic-fetch';
import JSZip from 'jszip';
import { ValidationError, ValidationRule } from "./DomainTypes";

export const hasOnePager: ValidationRule = async onePager => onePager ? [] : ["MISSING_ONE_PAGER"];

export const lastModifiedRule: ValidationRule = whenPresent(async onePager => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return onePager?.lastUpdateByEmployee < sixMonthsAgo ? ["OLDER_THAN_SIX_MONTHS"] : [];
});

export const alwaysFail: ValidationRule = async (onePager) => {
    return ["ALWAYS_FAIL"];
};

export const usesCurrentTemplate: ContentValidationRule = async content => {
    const templateData = await readFile("src/templates/OP_Template_PPT_DE_240119.pptx");
    const currentThemeHash = await calculateThemeHash(templateData);

    const hash = await calculateThemeHash(content);

    return currentThemeHash === hash ? [] : ["USING_OLD_TEMPLATE"];
};

export const allRules = combineRules(
    hasOnePager,
    lastModifiedRule,
    alwaysFail,
    combineContentRules(
        usesCurrentTemplate
    )
);

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

export function combineContentRules(...rules: ContentValidationRule[]): ValidationRule {
    return whenPresent(async onePager => {
        let content: Buffer;
        if (onePager.location.protocol === 'file:') {
            let filePath = onePager.location.pathname;
            filePath = decodeURIComponent(filePath);
            console.log(`Reading file from path: ${filePath}`);
            content = await readFile(process.cwd() + filePath);
        } else {
            // HTTP(S) fetch
            const response = await fetch(onePager.location.toString());
            content = Buffer.from(await response.arrayBuffer());
        }
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
