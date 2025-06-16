import {
    LanguageDetector,
    LoadedOnePager,
    Local,
    OnePager,
    ValidationError,
    ValidationReporter,
} from '../src/functions/validator/DomainTypes';
import { OnePagerValidation } from '../src/functions/validator/OnePagerValidation';
import { InMemoryValidationReporter } from '../src/functions/validator/adapter/memory/InMemoryValidationReporter';
import { initInMemoryOnePagers } from './OnePagerExemplars';

class TestLanguageDetector implements LanguageDetector {
    async detectLanguage(): Promise<Local[]> {
        return ['DE'];
    }
}

function OnePager(local?: Local, lastUpdateByEmployee: Date = new Date()): OnePager {
    return {
        local,
        lastUpdateByEmployee,
        webLocation: new URL('file:///example.pptx'),
        data: async () => Buffer.from(''),
    };
}

describe('OnePagerValidation', () => {
    let reporter: ValidationReporter;

    beforeEach(() => {
        reporter = new InMemoryValidationReporter();
    });

    it('should not report errors for unknown employee', async () => {
        const repo = await initInMemoryOnePagers({});
        const validation = new OnePagerValidation(
            repo,
            repo,
            reporter,
            new TestLanguageDetector(),
            async () => ['USING_UNKNOWN_TEMPLATE']
        );

        await validation.validateOnePagersOfEmployee('000');

        await expect(await reporter.getResultFor('000')).toEqual([]);
    });

    it('should report errors for employee without one-pager', async () => {
        const id = '111';
        const repo = await initInMemoryOnePagers({ [id]: [] });
        const validation = new OnePagerValidation(
            repo,
            repo,
            reporter,
            new TestLanguageDetector(),
            async op => (op === undefined ? ['USING_UNKNOWN_TEMPLATE'] : [])
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([
            'MISSING_DE_VERSION',
            'MISSING_EN_VERSION',
        ]);
    });

    it('should report errors for employee with invalid one-pager', async () => {
        const id = '111';
        const repo = await initInMemoryOnePagers({
            [id]: [
                { lastUpdateByEmployee: new Date(), local: 'DE' },
                { lastUpdateByEmployee: new Date(), local: 'EN' },
            ],
        });
        const validation = new OnePagerValidation(
            repo,
            repo,
            reporter,
            new TestLanguageDetector(),
            async op => (op !== undefined ? ['OLDER_THAN_SIX_MONTHS'] : [])
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(['OLDER_THAN_SIX_MONTHS']);
    });

    it('should clean errors for employee when one-pager becomes valid', async () => {
        const id = '111';
        const repo = await initInMemoryOnePagers({
            [id]: [
                { lastUpdateByEmployee: new Date(), local: 'DE' },
                { lastUpdateByEmployee: new Date(), local: 'EN' },
            ],
        });
        let callCounter = 0;
        const statefulValidator = async () =>
            callCounter++ === 0 ? (['OLDER_THAN_SIX_MONTHS'] as ValidationError[]) : [];
        const validation = new OnePagerValidation(
            repo,
            repo,
            reporter,
            new TestLanguageDetector(),
            statefulValidator
        );

        await validation.validateOnePagersOfEmployee(id);
        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    it('should validate newest one-pager', async () => {
        const id = '111';
        const repo = await initInMemoryOnePagers({
            [id]: [
                { lastUpdateByEmployee: new Date('2000-01-01'), local: 'DE' },
                { lastUpdateByEmployee: new Date('2024-01-01'), local: 'DE' },
                { lastUpdateByEmployee: new Date('2024-01-01'), local: 'EN' },
                { lastUpdateByEmployee: new Date('2005-01-01'), local: 'EN' },
            ],
        });
        const validation = new OnePagerValidation(
            repo,
            repo,
            reporter,
            new TestLanguageDetector(),
            async op =>
                !op || op.lastUpdateByEmployee < new Date('2010-01-01')
                    ? ['OLDER_THAN_SIX_MONTHS']
                    : []
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    describe('selectNewestOnePagers', () => {
        it('should return empty array for no one-pagers', async () => {
            const result = (await validation()).selectNewestOnePagers([]);
            expect(result).toEqual([]);
        });

        it('should one-pager if one exists', async () => {
            const example = OnePager();

            const result = (await validation()).selectNewestOnePagers([example]);

            expect(result).toEqual([example]);
        });

        it('should select the newest one-pager when two exist', async () => {
            const older = OnePager('DE', new Date('2000-01-01'));
            const newer = OnePager('DE', new Date('2025-01-01'));

            const result = (await validation()).selectNewestOnePagers([older, newer]);

            expect(result).toEqual([newer]);
        });

        it('should select newest one-pagers per language', async () => {
            const deOlder = OnePager('DE', new Date('2000-01-01'));
            const deNewer = OnePager('DE', new Date('2025-01-01'));
            const enOlder = OnePager('EN', new Date('2000-01-01'));
            const enNewer = OnePager('EN', new Date('2025-01-01'));

            const result = (await validation()).selectNewestOnePagers([
                deOlder,
                deNewer,
                enOlder,
                enNewer,
            ]);

            assertSameItems(result, [deNewer, enNewer]);
        });

        it('should select two newest without language if none with language', async () => {
            const older = OnePager(undefined, new Date('2000-01-01'));
            const newer = OnePager(undefined, new Date('2025-01-01'));
            const evenNewer = OnePager(undefined, new Date('2026-01-01'));

            const result = (await validation()).selectNewestOnePagers([older, newer, evenNewer]);

            assertSameItems(result, [evenNewer, newer]);
        });

        it('should select without languages if newer than with language', async () => {
            const de = OnePager('DE', new Date('2023-01-01'));
            const withoutLang = OnePager(undefined, new Date('2024-01-01'));
            const en = OnePager('EN', new Date('2023-01-01'));
            const withoutLangNewer = OnePager(undefined, new Date('2024-02-01'));

            const result = (await validation()).selectNewestOnePagers([
                de,
                en,
                withoutLang,
                withoutLangNewer,
            ]);

            assertSameItems(result, [de, en, withoutLang, withoutLangNewer]);
        });

        it('should select one without language if newer than only one with language', async () => {
            const de = OnePager('DE', new Date('2023-01-01'));
            const withoutLang = OnePager(undefined, new Date('2024-01-01'));
            const en = OnePager('EN', new Date('2025-01-01'));
            const withoutLangNewer = OnePager(undefined, new Date('2024-02-01'));

            const result = (await validation()).selectNewestOnePagers([
                de,
                en,
                withoutLang,
                withoutLangNewer,
            ]);

            assertSameItems(result, [de, en, withoutLangNewer]);
        });

        it('should select no without language if older than with language', async () => {
            const de = OnePager('DE', new Date('2025-01-01'));
            const withoutLang = OnePager(undefined, new Date('2024-01-01'));
            const en = OnePager('EN', new Date('2025-01-01'));
            const withoutLangNewer = OnePager(undefined, new Date('2024-02-01'));

            const result = (await validation()).selectNewestOnePagers([
                de,
                en,
                withoutLang,
                withoutLangNewer,
            ]);

            assertSameItems(result, [de, en]);
        });
    });

    describe('validateRequiredVersions', () => {
        it('should report both languages missing if none exist', async () => {
            const result = (await validation()).validateRequiredVersions([]);

            assertSameItems(result, [
                { onePager: undefined, errors: ['MISSING_DE_VERSION'] },
                { onePager: undefined, errors: ['MISSING_EN_VERSION'] },
            ]);
        });

        function LoadedOnePager(local?: Local, contentLanguages?: [Local]): LoadedOnePager {
            return {
                local,
                contentLanguages: contentLanguages || (local ? [local] : []),
                lastUpdateByEmployee: new Date(),
                data: Buffer.from(''),
                webLocation: new URL('file:///example.pptx'),
            };
        }

        it('should report nothing missing if versions for each language exist', async () => {
            const result = (await validation()).validateRequiredVersions([
                LoadedOnePager('DE'),
                LoadedOnePager('EN'),
            ]);

            expect(result.map(r => r.errors)).toEqual([]);
        });

        it('should report nothing missing if versions for each language exist (indicated language takes precedence)', async () => {
            const result = (await validation()).validateRequiredVersions([
                LoadedOnePager('DE', ['DE']),
                LoadedOnePager('EN', ['DE']),
            ]);

            expect(result.map(r => r.errors)).toEqual([]);
        });

        it('should report nothing missing if versions for each language exist (content language is taken into account)', async () => {
            const result = (await validation()).validateRequiredVersions([
                LoadedOnePager('DE', ['DE']),
                LoadedOnePager(undefined, ['EN']),
            ]);

            expect(result.map(r => r.errors)).toEqual([]);
        });

        it.each([
            { lang: 'EN' as Local, error: 'MISSING_DE_VERSION' },
            { lang: 'DE' as Local, error: 'MISSING_EN_VERSION' },
        ])('should report missing DE version', async ({ lang, error }) => {
            const result = (await validation()).validateRequiredVersions([LoadedOnePager(lang)]);

            expect(result).toEqual([{ onePager: undefined, errors: [error] }]);
        });
    });
});

async function validation() {
    const repo = await initInMemoryOnePagers({});

    return new OnePagerValidation(
        repo,
        repo,
        new InMemoryValidationReporter(),
        new TestLanguageDetector(),
        async () => []
    );
}

function assertSameItems<T>(actual: T[], expected: T[]): void {
    expect(actual.length).toEqual(expected.length);
    expect(actual).toEqual(expect.arrayContaining(expected));
}
