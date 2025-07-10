import { promises as fs } from 'fs';
import { tmpdir } from 'node:os';
import path from 'path';
import {
    createMSClient,
    hasSharepointClientOptions,
} from '../src/functions/configuration/AppConfiguration';
import { LocalFileValidationReporter } from '../src/functions/validator/adapter/localfile/LocalFileValidationReporter';
import { InMemoryValidationReporter } from '../src/functions/validator/adapter/memory/InMemoryValidationReporter';
import { SharepointListValidationReporter } from '../src/functions/validator/adapter/sharepoint/SharepointListValidationReporter';
import {
    Employee,
    EmployeeID,
    LocalEnum,
    OnePager,
    ValidatedOnePager,
    ValidationErrorEnum,
    ValidationReporter,
} from '../src/functions/validator/DomainTypes';

type ReporterFactory = () => Promise<ValidationReporter>;

const someOnePager: OnePager = {
    lastUpdateByEmployee: new Date(),
    data: async () => Buffer.from('This is a test one-pager.'),
    webLocation: new URL('https://example.com/onepager/web'),
    fileName: 'Mustermann, Max_DE_240209.pptx',
};

const someEmployeeData: Employee = {
    id: '111' as EmployeeID,
    name: 'Mustermann, Max',
    email: 'max.mustermann@senacor.com', //TODO: nach merge mit feature/mail in E-Mail-Adresse umwandeln
    entry_date: '2022-01-01T00:00:00.000Z',
    office: 'Hamburg',
    date_of_employment_change: null,
    position_current: 'Consultant',
    resource_type_current: 'Mitarbeiter Professional Services DE/AT',
    staffing_pool_current: 'Consultants',
    position_future: null,
    resource_type_future: null,
    staffing_pool_future: null,
    isGerman: true, // Indicates if the employee is from a german speaking country to know if german one-pager is required
};

const someValidatedOnePagerWithoutErrors: ValidatedOnePager = {
    onePager: undefined,
    errors: [],
    folderURL: undefined,
};

const testFactory = (name: string, reporterFactory: ReporterFactory) => {
    describe(name, () => {
        it('should return no errors without any report', async () => {
            const reporter = await reporterFactory();
            const result = await reporter.getResultFor('111');
            expect(result[LocalEnum.DE].errors).toEqual([]);
            expect(result[LocalEnum.EN].errors).toEqual([]);
        });

        it('should return errors when reported', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS],
                folderURL: undefined
            }; // EN

            const anotherValidatedOnePager: ValidatedOnePager = {
                onePager: undefined,
                errors: [ValidationErrorEnum.MISSING_DE_VERSION],
                folderURL: undefined
            }; // DE

            await reporter.reportErrors(
                '111',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            await reporter.reportErrors(
                '111',
                anotherValidatedOnePager,
                LocalEnum.DE,
                someEmployeeData
            );

            const result = await reporter.getResultFor('111');

            expect(result[LocalEnum.DE].errors).toEqual([
                ValidationErrorEnum.MISSING_DE_VERSION,
            ]);
            expect(result[LocalEnum.EN].errors).toEqual([
                ValidationErrorEnum.OLDER_THAN_SIX_MONTHS,
            ]);
        });

        it('should clean up errors when valid is reported', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS],
                folderURL: undefined
            };

            await reporter.reportErrors(
                '111',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            await reporter.reportValid('111', someValidatedOnePagerWithoutErrors, LocalEnum.EN, someEmployeeData);

            const result = await reporter.getResultFor('111');

            expect(result[LocalEnum.EN].errors).toEqual([]);
            expect(result[LocalEnum.DE].errors).toEqual([]);
        });

        it('should not return errors of other employee', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS],
                folderURL: undefined
            };

            const anotherValidatedOnePager: ValidatedOnePager = {
                onePager: undefined,
                errors: [ValidationErrorEnum.MISSING_DE_VERSION],
                folderURL: undefined
            };

            await reporter.reportErrors(
                '000',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );

            await reporter.reportErrors(
                '000',
                anotherValidatedOnePager,
                LocalEnum.DE,
                someEmployeeData
            );
            const result = await reporter.getResultFor('111');

            expect(result[LocalEnum.DE].errors).toEqual([]);
            expect(result[LocalEnum.EN].errors).toEqual([]);
        });

        it('should return the correct folderURLs', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS],
                folderURL: undefined
            };

            const anotherValidatedOnePager: ValidatedOnePager = {
                onePager: undefined,
                errors: [ValidationErrorEnum.MISSING_DE_VERSION],
                folderURL: new URL('https://example.com/folder/de')
            };

            await reporter.reportErrors(
                '000',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );

            await reporter.reportErrors(
                '000',
                anotherValidatedOnePager,
                LocalEnum.DE,
                someEmployeeData
            );
            const result = await reporter.getResultFor('000');

            expect(result[LocalEnum.DE].folderURL?.toString()).toEqual('https://example.com/folder/de');
            expect(result[LocalEnum.EN].folderURL).toEqual(undefined);
        });

        it('should return the correct onePagerInfos', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [],
                folderURL: undefined
            };

            const anotherValidatedOnePager: ValidatedOnePager = {
                onePager: undefined,
                errors: [],
                folderURL: undefined
            };

            await reporter.reportErrors(
                '000',
                someValidatedOnePager,
                LocalEnum.DE,
                someEmployeeData
            );

            await reporter.reportErrors(
                '000',
                anotherValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            const result = await reporter.getResultFor('000');

            expect(result[LocalEnum.DE].onePager?.fileName).toEqual('Mustermann, Max_DE_240209.pptx');
            expect(result[LocalEnum.DE].onePager?.lastUpdateByEmployee?.toISOString().split('T')[0]).toEqual(someOnePager.lastUpdateByEmployee.toISOString().split('T')[0]);
            expect(result[LocalEnum.DE].onePager?.webLocation.toString()).toEqual(someOnePager.webLocation.toString());
            expect(result[LocalEnum.EN].onePager).toEqual(undefined);
        });

        it('should not clean up errors when valid is reported for other employee', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS],
                folderURL: undefined
            };

            await reporter.reportErrors(
                '111',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            await reporter.reportValid('000', someValidatedOnePagerWithoutErrors, LocalEnum.EN, someEmployeeData);
            const result = await reporter.getResultFor('111');

            expect(result[LocalEnum.EN].errors).toEqual([ValidationErrorEnum.OLDER_THAN_SIX_MONTHS]);
        });

        it('should replace previous error with new ones', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS],
                folderURL: undefined
            };

            const anotherValidatedOnePager: ValidatedOnePager = {
                onePager: undefined,
                errors: [ValidationErrorEnum.MISSING_DE_VERSION],
                folderURL: undefined
            };

            await reporter.reportErrors(
                '111',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            await reporter.reportErrors(
                '111',
                anotherValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            const result = await reporter.getResultFor('111');
            expect(result[LocalEnum.EN].errors).toEqual([ValidationErrorEnum.MISSING_DE_VERSION]);
        });
    });

    describe(`${name} - cleanUpValidationList`, () => {
        it('should remove all entries that are not in the list of valid employees', async () => {
            const reporter = await reporterFactory();

            const someValidatedOnePager: ValidatedOnePager = {
                onePager: someOnePager,
                errors: [ValidationErrorEnum.OLDER_THAN_SIX_MONTHS],
                folderURL: undefined
            };

            const anotherValidatedOnePager: ValidatedOnePager = {
                onePager: undefined,
                errors: [ValidationErrorEnum.MISSING_DE_VERSION],
                folderURL: undefined
            };

            await reporter.reportErrors(
                '111',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            await reporter.reportErrors(
                '111',
                anotherValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );

            await reporter.reportErrors(
                '110',
                someValidatedOnePager,
                LocalEnum.EN,
                someEmployeeData
            );
            await reporter.reportErrors(
                '112',
                anotherValidatedOnePager,
                LocalEnum.DE,
                someEmployeeData
            );
            await reporter.cleanUpValidationList(['112']);

            const result_111 = await reporter.getResultFor('111');
            const result_110 = await reporter.getResultFor('110');
            const result_112 = await reporter.getResultFor('112');

            expect(result_110[LocalEnum.EN].errors).toEqual([]);
            expect(result_110[LocalEnum.DE].errors).toEqual([]);

            expect(result_111[LocalEnum.EN].errors).toEqual([]);
            expect(result_111[LocalEnum.DE].errors).toEqual([]);

            expect(result_112[LocalEnum.DE].errors).toEqual([ValidationErrorEnum.MISSING_DE_VERSION]);
            expect(result_112[LocalEnum.EN].errors).toEqual([]);
        });
    });
};

testFactory('InMemoryValidationReporter', async () => new InMemoryValidationReporter());

const opts = process.env;
if (hasSharepointClientOptions(opts)) {
    testFactory('SharepointListValidationReporter', async () => {
        const client = createMSClient({
            ...opts,
            SHAREPOINT_API_LOGGING: 'true',
        });

        const reporter = await SharepointListValidationReporter.getInstance(
            client,
            'senacor.sharepoint.com:/teams/MaInfoTest',
            'one-pager-status-automated-test-env'
        );

        await reporter.clearList();

        return reporter;
    });
}

testFactory('LocalFileValidationReporter', async () => {
    const tmp = await fs.mkdtemp(path.join(tmpdir(), 'validation-reports-'));
    return new LocalFileValidationReporter(tmp);
});
