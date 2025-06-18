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
import { OnePager, ValidationReporter } from '../src/functions/validator/DomainTypes';

type ReporterFactory = () => Promise<ValidationReporter>;

const someOnePager: OnePager = {
    lastUpdateByEmployee: new Date(),
    data: async () => Buffer.from('This is a test one-pager.'),
    webLocation: new URL('https://example.com/onepager/web'),
};

const testFactory = (name: string, reporterFactory: ReporterFactory) => {
    describe(name, () => {
        it('should return no errors without any report', async () => {
            const reporter = await reporterFactory();

            await expect(reporter.getResultFor('000')).resolves.toEqual([]);
        });

        it('should return errors when reported', async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors('111', someOnePager, [
                'OLDER_THAN_SIX_MONTHS',
                'MISSING_DE_VERSION',
            ]);

            await expect(reporter.getResultFor('111')).resolves.toEqual([
                'OLDER_THAN_SIX_MONTHS',
                'MISSING_DE_VERSION',
            ]);
        });

        it('should clean up errors when valid is reported', async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors('111', someOnePager, ['OLDER_THAN_SIX_MONTHS']);
            await reporter.reportValid('111');

            await expect(reporter.getResultFor('111')).resolves.toEqual([]);
        });

        it('should not return errors of other employee', async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors('000', someOnePager, [
                'OLDER_THAN_SIX_MONTHS',
                'MISSING_DE_VERSION',
            ]);

            await expect(reporter.getResultFor('111')).resolves.toEqual([]);
        });

        it('should not clean up errors when valid is reported for other employee', async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors('111', someOnePager, ['OLDER_THAN_SIX_MONTHS']);
            await reporter.reportValid('000');

            await expect(reporter.getResultFor('111')).resolves.toEqual(['OLDER_THAN_SIX_MONTHS']);
        });

        it('should replace previous error with new ones', async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors('111', someOnePager, ['OLDER_THAN_SIX_MONTHS']);
            await reporter.reportErrors('111', someOnePager, ['MISSING_DE_VERSION']);

            await expect(reporter.getResultFor('111')).resolves.toEqual(['MISSING_DE_VERSION']);
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
