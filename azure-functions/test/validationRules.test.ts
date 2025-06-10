import { URL } from 'node:url';
import { LoadedOnePager, ValidationError } from '../src/functions/validator/DomainTypes';
import {
    combineRules,
    lastModifiedRule,
    usesCurrentTemplate,
} from '../src/functions/validator/validationRules';
import { readdirSync } from 'node:fs';

const exampleOnePager: LoadedOnePager = {
    lastUpdateByEmployee: new Date(),
    fileLocation: new URL('http://example.com/onepager.pptx'),
    contentLanguage: 'DE',
    data: Buffer.from('example data'),
};

describe('validationRules', () => {
    describe('lastModifiedRule', () => {
        it('should report no error if lastUpdateByEmployee is within 6 months', async () => {
            exampleOnePager.lastUpdateByEmployee.setMonth(exampleOnePager.lastUpdateByEmployee.getMonth() - 3);
            await expect(lastModifiedRule(exampleOnePager)).resolves.toEqual([]);
        });
        it('should report an error if lastUpdateByEmployee is older than 6 months', async () => {
            exampleOnePager.lastUpdateByEmployee.setMonth(exampleOnePager.lastUpdateByEmployee.getMonth() - 7);
            await expect(lastModifiedRule(exampleOnePager)).resolves.toEqual(['OLDER_THAN_SIX_MONTHS']);
        });
    });

    const onePagerWithOldTemplates = [
        'file:///examples/Mustermann%2C%20Max%20DE_201028.pptx',
        'file:///examples/Mustermann%2C%20Max%20DE_190130.pptx',
    ];

    describe('usesCurrentTemplate', () => {
        it('should identify onepager using current template as valid', async () => {
            exampleOnePager.fileLocation = new URL('file:///examples/Mustermann%2C%20Max_DE_240209.pptx');
            await expect(usesCurrentTemplate()(exampleOnePager)).resolves.toEqual([]);
        });

        it.each(onePagerWithOldTemplates)('should identify onepager using old template as invalid: %s', async url => {
            exampleOnePager.fileLocation = new URL(url);
            await expect(usesCurrentTemplate()(exampleOnePager)).resolves.toEqual([
                'USING_UNKNOWN_TEMPLATE',
            ]);
        });

        const files = readdirSync('examples/non-exact-template').filter(file => file.endsWith('.pptx'));
        it.each(files)('should identify non-exact template usage in %s', async url => {
            exampleOnePager.fileLocation = new URL(`file:///examples/non-exact-template/${encodeURIComponent(url)}`);
            await expect(usesCurrentTemplate()(exampleOnePager)).resolves.toEqual([
                'USING_MODIFIED_TEMPLATE',
            ]);
        });
    });

    describe('combineRules', () => {
        it('combines multiple rules and flattens errors', async () => {
            const rule1 = async () => ['MISSING_ONE_PAGER' as ValidationError];
            const rule2 = async () => ['OLDER_THAN_SIX_MONTHS' as ValidationError];
            const combined = combineRules(rule1, rule2);
            await expect(combined(exampleOnePager)).resolves.toEqual(['MISSING_ONE_PAGER', 'OLDER_THAN_SIX_MONTHS']);
        });
    });
});
