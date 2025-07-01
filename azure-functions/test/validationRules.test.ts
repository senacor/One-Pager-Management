import {
    EmployeeID,
    LoadedOnePager,
    LocalEnum,
    ValidationError,
    ValidationErrorEnum
} from '../src/functions/validator/DomainTypes';
import { promises, readdirSync } from 'node:fs';
import { combineRules, lastModifiedRule } from '../src/functions/validator/rules';
import { usesCurrentTemplate } from '../src/functions/validator/rules/template';
import { Pptx } from '../src/functions/validator/rules/Pptx';
import { readFile } from 'node:fs/promises';
import {
    checkImages,
    QUALITY_THRESHOLD,
    scoreQuality,
} from '../src/functions/validator/rules/photo';
import { labelImageAvailable } from '../src/functions/validator/rules/ai';

let _exampleOnePager: Promise<LoadedOnePager>;
function exampleOnePager(): Promise<LoadedOnePager> {
    if (!_exampleOnePager) {
        _exampleOnePager = readFile('test/resources/onepager/example-2024-DE.pptx').then(
            async data => ({
                onePager: {
                    lastUpdateByEmployee: new Date(),
                    local: LocalEnum.DE,
                    data: () => Promise.resolve(data),
                    webLocation: new URL('https://example.com/onepager.pptx'),
                    name: 'Mustermann, Max_DE_240209.pptx',
                    folderURL: new URL('https://example.com/onepager/folder'),
                },
                contentLanguages: [LocalEnum.DE],
                pptx: await Pptx.load(data),
                errors: [],
                })
        );
    }
    return _exampleOnePager;
}

const employeeData = {
    id: '123456' as EmployeeID,
    name: '',
    email: '',
    entry_date: '',
    office: '',
    date_of_employment_change: '',
    position_current: '',
    resource_type_current: '',
    staffing_pool_current: '',
    position_future: '',
    resource_type_future: '',
    staffing_pool_future: '',
    isGerman: true,
};

describe('validationRules', () => {
    describe('lastModifiedRule', () => {
        it('should report no error if lastUpdateByEmployee is within 6 months', async () => {
            const withingSixMonths = new Date();
            withingSixMonths.setMonth(withingSixMonths.getMonth() - 3);
            const recent = {
                ...(await exampleOnePager()),
                lastUpdateByEmployee: withingSixMonths,
            };

            const errors = lastModifiedRule(recent, employeeData);

            await expect(errors).resolves.toEqual([]);
        });
        it('should report an error if lastUpdateByEmployee is older than 6 months', async () => {
            const olderThenSixMonths = new Date();
            olderThenSixMonths.setMonth(olderThenSixMonths.getMonth() - 7);
            const old = {
                ...(await exampleOnePager()),
            };
            old.onePager.lastUpdateByEmployee = olderThenSixMonths;

            const errors = lastModifiedRule(old, employeeData);

            await expect(errors).resolves.toEqual([ValidationErrorEnum.OLDER_THAN_SIX_MONTHS]);
        });
    });

    describe('usesCurrentTemplate', () => {
        it('should identify onepager using current template as valid', async () => {
            const currentTemplate = {
                ...(await exampleOnePager()),
                pptx: await readFile('test/resources/examples/Mustermann, Max_DE_240209.pptx').then(
                    Pptx.load
                ),
            };

            const errors = usesCurrentTemplate()(currentTemplate, employeeData);

            await expect(errors).resolves.toEqual([]);
        });

        it.each(['201028.pptx', '190130.pptx'])(
            'should identify onepager using old template as invalid: %s',
            async file => {
                const oldTemplate = {
                    ...(await exampleOnePager()),
                    pptx: await readFile(`test/resources/examples/Mustermann, Max DE_${file}`).then(
                        Pptx.load
                    ),
                };

                const errors = usesCurrentTemplate()(oldTemplate, employeeData);

                await expect(errors).resolves.toEqual([ValidationErrorEnum.USING_UNKNOWN_TEMPLATE]);
            }
        );

        it.each(
            readdirSync('test/resources/examples/non-exact-template').filter(file =>
                file.endsWith('.pptx')
            )
        )('should identify non-exact template usage in %s', async file => {
            const nonExact = {
                ...(await exampleOnePager()),
                pptx: await readFile(`test/resources/examples/non-exact-template/${file}`).then(
                    Pptx.load
                ),
            };

            const errors = usesCurrentTemplate()(nonExact, employeeData);

            await expect(errors).resolves.toEqual([ValidationErrorEnum.USING_MODIFIED_TEMPLATE]);
        });
    });

    describe('hasPhoto', () => {
        it('should report an error if no photo is present', async () => {
            const onePagerWithoutPhoto = {
                ...(await exampleOnePager()),
                pptx: await readFile(`test/resources/onepager/example-2024-DE-no-photo.pptx`).then(
                    Pptx.load
                ),
            };

            const errors = checkImages(onePagerWithoutPhoto, employeeData);

            await expect(errors).resolves.toEqual(expect.arrayContaining([ValidationErrorEnum.MISSING_PHOTO]));
        });

        it('should report no error if photo is found', async () => {
            const onePagerWithPhoto = await exampleOnePager();

            const errors = checkImages(onePagerWithPhoto, employeeData);

            await expect(errors).resolves.toEqual([]);
        });
    });

    if (labelImageAvailable()) {
        describe('hasQualityPhoto', () => {
            it('should report an error if photo does not fit our criteria', async () => {
                const badPhoto = {
                    path: 'bad.jpg',
                    data: () => promises.readFile('test/resources/photos/bad.jpg'),
                };

                const isLow = scoreQuality(badPhoto);

                await expect(isLow).resolves.toBeLessThan(QUALITY_THRESHOLD);
            });

            it('should report no error if photo is good', async () => {
                const goodPhoto = {
                    path: 'good.jpg',
                    data: () => promises.readFile('test/resources/photos/good.jpg'),
                };

                const isLow = scoreQuality(goodPhoto);

                await expect(isLow).resolves.toBeGreaterThan(QUALITY_THRESHOLD);
            });
        });
    }

    describe('combineRules', () => {
        it('combines multiple rules and flattens errors', async () => {
            const rule1 = async () => ['MISSING_ONE_PAGER' as ValidationError];
            const rule2 = async () => [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS as ValidationError];
            const combined = combineRules(rule1, rule2);

            const errors = combined(await exampleOnePager(), employeeData);

            await expect(errors).resolves.toEqual(['MISSING_ONE_PAGER', ValidationErrorEnum.OLDER_THAN_SIX_MONTHS]);
        });
    });
});
