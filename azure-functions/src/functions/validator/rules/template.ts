import { readFile } from 'fs/promises';
import { CURRENT_TEMPLATE_PATH } from '.';
import { Logger, ValidationError, ValidationRule } from '../DomainTypes';
import JSZip from 'jszip';
import { createHash } from 'crypto';

let templateHashes: Promise<{
    names: string[];
    hashes: Record<string, string>;
}>;
function getTemplateHashes(logger: Logger) {
    if (!templateHashes) {
        templateHashes = readFile(CURRENT_TEMPLATE_PATH).then(templateData =>
            calculateThemeHash(logger, templateData)
        );
    }
    return templateHashes;
}

export const usesCurrentTemplate =
    (logger: Logger = console): ValidationRule =>
    async (onePager, employeeData) => {
        const templateHashes = await getTemplateHashes(logger);
        const contentHashes = await calculateThemeHash(logger, onePager.data);

        const templateKeys = Object.keys(templateHashes.hashes);
        const contentKeys = Object.keys(contentHashes.hashes);

        // no error if theme contents are equal
        if (
            templateKeys.length === contentKeys.length &&
            templateKeys.every(
                key =>
                    contentKeys.includes(key) &&
                    templateHashes.hashes[key] === contentHashes.hashes[key]
            )
        ) {
            return [];
        }

        const themeCountWithSameContent = templateKeys.filter(key =>
            contentKeys.includes(key)
        ).length;
        const hasSomeOriginalTemplateThemes = templateHashes.names.some(name =>
            contentHashes.names.includes(name)
        );

        // if we detect at least one theme of the template we consider the current one-pager based on it
        const error: ValidationError[] = [
            themeCountWithSameContent > 0 || hasSomeOriginalTemplateThemes
                ? 'USING_MODIFIED_TEMPLATE'
                : 'USING_UNKNOWN_TEMPLATE',
        ];
        return error;
    };

async function calculateThemeHash(
    logger: Logger,
    pptxContent: Buffer
): Promise<{ names: string[]; hashes: Record<string, string> }> {
    const zip = new JSZip();
    const pptx = await zip.loadAsync(pptxContent);
    const masterFiles = Object.keys(pptx.files)
        .filter(file => file.match(/ppt\/(theme)\//))
        .sort();

    const hashes: Record<string, string> = {};
    const names: string[] = [];

    const xmlContents = await Promise.all(
        masterFiles.map(async f => {
            const c = await pptx.files[f].async('string');
            return c;
        })
    );
    for (const [i, xmlContent] of xmlContents.entries()) {
        const match = xmlContent.match(/<a:theme [^>]+ name="(?:\d_)?([^"]+)">/);
        if (!match) {
            continue;
        }
        const [, themeName] = match;
        // these seem to be default themes we do not care about
        if (themeName.toLocaleLowerCase().includes('office')) {
            continue;
        }

        const hash = createHash('md5');
        hash.update(xmlContent);
        const digest = hash.digest('hex');

        hashes[digest] = masterFiles[i];
        names.push(themeName);
    }

    return { names, hashes };
}
