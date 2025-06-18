import { LoadedOnePager, ValidationError } from '../src/functions/validator/DomainTypes';
import { promises, readdirSync, readFileSync } from 'node:fs';
import { combineRules, lastModifiedRule } from '../src/functions/validator/rules';
import { usesCurrentTemplate } from '../src/functions/validator/rules/template';
import { hasLowQuality, hasPhoto } from '../src/functions/validator/rules/photo';

const exampleOnePager: LoadedOnePager = {
    lastUpdateByEmployee: new Date(),
    contentLanguages: ['DE'],
    data: readFileSync('test/onepager/example-2024-DE.pptx'),
    webLocation: new URL('https://example.com/onepager.pptx'),
};
const employeeData =  {
    name: "",
    email: "", //TODO: nach merge mit feature/mail in E-Mail-Adresse umwandeln
    entry_date: "",
    office: "",
    date_of_employment_change: "",
    position_current: "",
    resource_type_current: "",
    staffing_pool_current: "",
    position_future: "",
    resource_type_future: "",
    staffing_pool_future: ""
};

describe('validationRules', () => {
    describe('lastModifiedRule', () => {
        it('should report no error if lastUpdateByEmployee is within 6 months', async () => {
            const withingSixMonths = new Date();
            withingSixMonths.setMonth(withingSixMonths.getMonth() - 3);
            const recent = {
                ...exampleOnePager,
                lastUpdateByEmployee: withingSixMonths,
            };


            const errors = lastModifiedRule(recent, employeeData);

            await expect(errors).resolves.toEqual([]);
        });
        it('should report an error if lastUpdateByEmployee is older than 6 months', async () => {
            const olderThenSixMonths = new Date();
            olderThenSixMonths.setMonth(olderThenSixMonths.getMonth() - 7);
            const old = {
                ...exampleOnePager,
                lastUpdateByEmployee: olderThenSixMonths,
            };

            const errors = lastModifiedRule(old, employeeData);

            await expect(errors).resolves.toEqual(['OLDER_THAN_SIX_MONTHS']);
        });
    });

    describe('usesCurrentTemplate', () => {
        it('should identify onepager using current template as valid', async () => {
            const currentTemplate = {
                ...exampleOnePager,
                data: readFileSync('examples/Mustermann, Max_DE_240209.pptx'),
            };

            const errors = usesCurrentTemplate()(currentTemplate, employeeData);

            await expect(errors).resolves.toEqual([]);
        });

        it.each(['201028.pptx', '190130.pptx'])(
            'should identify onepager using old template as invalid: %s',
            async file => {
                const oldTemplate = {
                    ...exampleOnePager,
                    data: readFileSync(`examples/Mustermann, Max DE_${file}`),
                };

                const errors = usesCurrentTemplate()(oldTemplate, employeeData);

                await expect(errors).resolves.toEqual(['USING_UNKNOWN_TEMPLATE']);
            }
        );

        it.each(readdirSync('examples/non-exact-template').filter(file => file.endsWith('.pptx')))(
            'should identify non-exact template usage in %s',
            async file => {
                const nonExact = {
                    ...exampleOnePager,
                    data: readFileSync(`examples/non-exact-template/${file}`),
                };

                const errors = usesCurrentTemplate()(nonExact, employeeData);

                await expect(errors).resolves.toEqual(['USING_MODIFIED_TEMPLATE']);
            }
        );
    });

    describe('hasPhoto', () => {
        it('should report an error if no photo is present', async () => {
            const onePagerWithoutPhoto = {
                ...exampleOnePager,
                data: readFileSync('test/onepager/example-2024-DE-no-photo.pptx'),
            };

            const errors = hasPhoto()(onePagerWithoutPhoto, employeeData);

            await expect(errors).resolves.toEqual(expect.arrayContaining(['MISSING_PHOTO']));
        });

        it('should report no error if photo is found', async () => {
            const onePagerWithPhoto = exampleOnePager;

            const errors = hasPhoto()(onePagerWithPhoto, employeeData);

            await expect(errors).resolves.toEqual([]);
        });
    });

    describe('hasQualityPhoto', () => {
        it('should report an error if photo does not fit our criteria', async () => {
            const badPhoto = {
                name: 'bad.jpg',
                data: () => promises.readFile('test/photos/bad.jpg'),
            };

            const isLow = hasLowQuality(badPhoto);

            await expect(isLow).resolves.toEqual(true);
        });

        it('should report no error if photo is good', async () => {
            const goodPhoto = {
                name: 'good.jpg',
                data: () => promises.readFile('test/photos/good.jpg'),
            };

            const isLow = hasLowQuality(goodPhoto);

            await expect(isLow).resolves.toEqual(false);
        });
    });

    describe('combineRules', () => {
        it('combines multiple rules and flattens errors', async () => {
            const rule1 = async () => ['MISSING_ONE_PAGER' as ValidationError];
            const rule2 = async () => ['OLDER_THAN_SIX_MONTHS' as ValidationError];
            const combined = combineRules(rule1, rule2);

            const errors = combined(exampleOnePager, employeeData);

            await expect(errors).resolves.toEqual(['MISSING_ONE_PAGER', 'OLDER_THAN_SIX_MONTHS']);
        });
    });
});
