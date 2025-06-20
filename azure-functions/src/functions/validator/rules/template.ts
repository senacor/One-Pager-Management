import { readFile } from 'fs/promises';
import { CURRENT_TEMPLATE_PATH } from '.';
import { Logger, ValidationError, ValidationRule } from '../DomainTypes';
import { Pptx, PptxTheme } from './Pptx';

let templateHashes: Promise<PptxTheme[]>;

function getTemplateHashes(logger: Logger) {
    if (!templateHashes) {
        templateHashes = readFile(CURRENT_TEMPLATE_PATH)
            .then(data => Pptx.load(data, logger))
            .then(pptx => pptx.getOnePagerThemes());
    }
    return templateHashes;
}

export function usesCurrentTemplate(logger: Logger = console): ValidationRule {
    return async onePager => {
        const templateThemes = await getTemplateHashes(logger);
        const contentThemes = await onePager.pptx.getOnePagerThemes();

        const templateThemeDigests = templateThemes.map(theme => theme.digest);
        const contentThemeDigests = contentThemes.map(theme => theme.digest);

        // no error content uses only themes from the template
        if (contentThemeDigests.every(key => templateThemeDigests.includes(key))) {
            return [];
        }

        const contentThemesWithSameDigest = contentThemes.filter(t =>
            templateThemes.some(tt => tt.digest === t.digest)
        );
        const contentThemesWithSameName = contentThemes.filter(ct =>
            templateThemes.some(tt => tt.name === ct.name)
        );

        logger.warn(`
        Content uses themes not part of the template.
        Content themes:  ${JSON.stringify(contentThemes)}
        Template themes: ${JSON.stringify(templateThemes)}
        ${contentThemesWithSameDigest.length} themes with same digest and ${contentThemesWithSameName.length} themes with same name found.
    `);

        // if we detect at least one theme of the template we consider the current one-pager based on it
        const error: ValidationError[] = [
            contentThemesWithSameDigest.length > 0 || contentThemesWithSameName.length > 0
                ? 'USING_MODIFIED_TEMPLATE'
                : 'USING_UNKNOWN_TEMPLATE',
        ];
        return error;
    };
}
