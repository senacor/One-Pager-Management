import { URL } from 'node:url';
import { OnePager, ValidationError } from '../src/functions/validator/DomainTypes';
import {
    combineContentRules,
    combineRules,
    lastModifiedRule,
    usesCurrentTemplate,
} from '../src/functions/validator/validationRules';
import { readdirSync } from 'node:fs';

const location = new URL('http://example.com/onepager.pptx');

describe('validationRules', () => {
    describe('lastModifiedRule', () => {
        it('should report no error if lastUpdateByEmployee is within 6 months', async () => {
            const recent = new Date();
            recent.setMonth(recent.getMonth() - 3);
            const onePager: OnePager = { lastUpdateByEmployee: recent, fileLocation: location };
            await expect(lastModifiedRule(onePager)).resolves.toEqual([]);
        });
        it('should report an error if lastUpdateByEmployee is older than 6 months', async () => {
            const old = new Date();
            old.setMonth(old.getMonth() - 7);
            const onePager: OnePager = { lastUpdateByEmployee: old, fileLocation: location };
            await expect(lastModifiedRule(onePager)).resolves.toEqual(['OLDER_THAN_SIX_MONTHS']);
        });
    });

    const onePagerWithOldTemplates = [
        'file:///examples/Mustermann%2C%20Max%20DE_201028.pptx',
        'file:///examples/Mustermann%2C%20Max%20DE_190130.pptx',
    ];

    describe('usesCurrentTemplate', () => {
        it('should identify onepager using current template as valid', async () => {
            const onePager: OnePager = {
                lastUpdateByEmployee: new Date(),
                fileLocation: new URL('file:///examples/Mustermann%2C%20Max_DE_240209.pptx'),
            };
            await expect(
                combineContentRules(console, usesCurrentTemplate)(onePager),
            ).resolves.toEqual([]);
        });

        it.each(onePagerWithOldTemplates)(
            'should identify onepager using old template as invalid: %s',
            async (url) => {
                const onePager: OnePager = {
                    lastUpdateByEmployee: new Date(),
                    fileLocation: new URL(url),
                };
                await expect(
                    combineContentRules(console, usesCurrentTemplate)(onePager),
                ).resolves.toEqual(['USING_UNKNOWN_TEMPLATE']);
            },
        );

        const files = readdirSync('examples/non-exact-template').filter((file) =>
            file.endsWith('.pptx'),
        );
        it.each(files)('should identify non-exact template usage in %s', async (url) => {
            const onePager: OnePager = {
                lastUpdateByEmployee: new Date(),
                fileLocation: new URL(
                    `file:///examples/non-exact-template/${encodeURIComponent(url)}`,
                ),
            };
            await expect(
                combineContentRules(console, usesCurrentTemplate)(onePager),
            ).resolves.toEqual(['USING_MODIFIED_TEMPLATE']);
        });
    });

    const exampleOnePager = {
        fileLocation: new URL('file:///examples/Mustermann%2C%20Max_DE_240209.pptx'),
        lastUpdateByEmployee: new Date(),
    };

    describe('combineRules', () => {
        it('combines multiple rules and flattens errors', async () => {
            const rule1 = async () => ['MISSING_ONE_PAGER' as ValidationError];
            const rule2 = async () => ['OLDER_THAN_SIX_MONTHS' as ValidationError];
            const combined = combineRules(rule1, rule2);
            await expect(combined(exampleOnePager)).resolves.toEqual([
                'MISSING_ONE_PAGER',
                'OLDER_THAN_SIX_MONTHS',
            ]);
        });
    });

    describe('combineContentRules', () => {
        it('combines multiple rules and flattens errors', async () => {
            const rule1 = async () => ['MISSING_ONE_PAGER' as ValidationError];
            const rule2 = async () => ['OLDER_THAN_SIX_MONTHS' as ValidationError];
            const combined = combineContentRules(console, rule1, rule2);
            await expect(combined(exampleOnePager)).resolves.toEqual([
                'MISSING_ONE_PAGER',
                'OLDER_THAN_SIX_MONTHS',
            ]);
        });
    });
});
