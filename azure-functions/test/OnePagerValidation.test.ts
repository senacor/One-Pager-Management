import { LanguageDetector, Local, OnePager, ValidationError, ValidationReporter } from '../src/functions/validator/DomainTypes';
import { OnePagerValidation } from '../src/functions/validator/OnePagerValidation';
import { InMemoryOnePagerRepository } from '../src/functions/validator/adapter/memory/InMemoryOnePagerRepository';
import { InMemoryValidationReporter } from '../src/functions/validator/adapter/memory/InMemoryValidationReporter';

class TestLanguageDetector implements LanguageDetector {
    async detectLanguage(): Promise<Local[]> {
        return ['DE'];
    }
}

describe('OnePagerValidation', () => {
    let reporter: ValidationReporter;

    beforeEach(() => {
        reporter = new InMemoryValidationReporter();
    });

    it('should not report errors for unknown employee', async () => {
        const repo = new InMemoryOnePagerRepository({});
        const validation = new OnePagerValidation(repo, repo, reporter, new TestLanguageDetector(), async () => ['USING_UNKNOWN_TEMPLATE']);

        await validation.validateOnePagersOfEmployee('000');

        await expect(await reporter.getResultFor('000')).toEqual([]);
    });

    it('should report errors for employee without one-pager', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({ [id]: [] });
        const validation = new OnePagerValidation(repo, repo, reporter, new TestLanguageDetector(), async op =>
            op === undefined ? ['USING_UNKNOWN_TEMPLATE'] : [],
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(['MISSING_DE_VERSION', 'MISSING_EN_VERSION']);
    });

    it('should report errors for employee with invalid one-pager', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({
            [id]: [
                { lastUpdateByEmployee: new Date(), local: 'DE' },
                { lastUpdateByEmployee: new Date(), local: 'EN' }
            ]
        });
        const validation = new OnePagerValidation(repo, repo, reporter, new TestLanguageDetector(), async op =>
            op !== undefined ? ['OLDER_THAN_SIX_MONTHS'] : [],
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(['OLDER_THAN_SIX_MONTHS']);
    });

    it('should clean errors for employee when one-pager becomes valid', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({
            [id]: [
                { lastUpdateByEmployee: new Date(), local: 'DE' },
                { lastUpdateByEmployee: new Date(), local: 'EN' }
            ],
        });
        let callCounter = 0;
        const statefulValidator = async () =>
            callCounter++ === 0 ? (['OLDER_THAN_SIX_MONTHS'] as ValidationError[]) : [];
        const validation = new OnePagerValidation(repo, repo, reporter, new TestLanguageDetector(), statefulValidator);

        await validation.validateOnePagersOfEmployee(id);
        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    it('should validate newest one-pager', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({
            [id]: [
                { lastUpdateByEmployee: new Date('2000-01-01'), local: 'DE' },
                { lastUpdateByEmployee: new Date('2024-01-01'), local: 'DE' },
                { lastUpdateByEmployee: new Date('2024-01-01'), local: 'EN' },
                { lastUpdateByEmployee: new Date('2005-01-01'), local: 'EN' },
            ],
        });
        const validation = new OnePagerValidation(repo, repo, reporter, new TestLanguageDetector(), async op =>
            !op || op.lastUpdateByEmployee < new Date('2010-01-01') ? ['OLDER_THAN_SIX_MONTHS'] : [],
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    describe('selectNewestOnePagers', () => {
        const repo = new InMemoryOnePagerRepository({});
        const validation = new OnePagerValidation(repo, repo, reporter, new TestLanguageDetector(), async () => []);

        it('should return empty array for no one-pagers', () => {
            const result = validation.selectNewestOnePagers([]);
            assertSelection(result, []);
        });

        it('should one-pager if one exists', () => {
            const onePager: OnePager = { local: 'DE', lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///example.pptx') };
            const result = validation.selectNewestOnePagers([onePager]);
            assertSelection(result, [onePager]);
        });

        it('should select the newest one-pager when two exist', () => {
            const older: OnePager = { local: 'DE', lastUpdateByEmployee: new Date('2000-01-01'), fileLocation: new URL('file:///older.pptx') };
            const newer: OnePager = { local: 'DE', lastUpdateByEmployee: new Date('2025-01-01'), fileLocation: new URL('file:///newer.pptx') };

            const result = validation.selectNewestOnePagers([older, newer]);

            assertSelection(result, [newer]);
        });

        it('should select newest one-pagers per language', () => {
            const deOlder: OnePager = { local: 'DE', lastUpdateByEmployee: new Date('2000-01-01'), fileLocation: new URL('file:///deOlder.pptx') };
            const deNewer: OnePager = { local: 'DE', lastUpdateByEmployee: new Date('2025-01-01'), fileLocation: new URL('file:///deNewer.pptx') };
            const enOlder: OnePager = { local: 'EN', lastUpdateByEmployee: new Date('2000-01-01'), fileLocation: new URL('file:///enOlder.pptx') };
            const enNewer: OnePager = { local: 'EN', lastUpdateByEmployee: new Date('2025-01-01'), fileLocation: new URL('file:///enNewer.pptx') };

            const result = validation.selectNewestOnePagers([deOlder, deNewer, enOlder, enNewer]);

            assertSelection(result, [deNewer, enNewer]);
        });

        it('should select two newest without language if none with language', () => {
            const older: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2000-01-01'), fileLocation: new URL('file:///older.pptx') };
            const newer: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2025-01-01'), fileLocation: new URL('file:///newer.pptx') };
            const evenNewer: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2026-01-01'), fileLocation: new URL('file:///evenNewer.pptx') };

            const result = validation.selectNewestOnePagers([older, newer, evenNewer]);

            assertSelection(result, [evenNewer, newer]);
        });

        it('should select without languages if newer than with language', () => {
            const de: OnePager = { local: 'DE', lastUpdateByEmployee: new Date('2023-01-01'), fileLocation: new URL('file:///de.pptx') };
            const withoutLang: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2024-01-01'), fileLocation: new URL('file:///withoutLang.pptx') };
            const en: OnePager = { local: 'EN', lastUpdateByEmployee: new Date('2023-01-01'), fileLocation: new URL('file:///en.pptx') };
            const withoutLangNewer: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2024-02-01'), fileLocation: new URL('file:///withoutLangNewer.pptx') };

            const result = validation.selectNewestOnePagers([de, en, withoutLang, withoutLangNewer]);

            assertSelection(result, [de, en, withoutLang, withoutLangNewer]);
        });

        it('should select one without language if newer than only one with language', () => {
            const de: OnePager = { local: 'DE', lastUpdateByEmployee: new Date('2023-01-01'), fileLocation: new URL('file:///de.pptx') };
            const withoutLang: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2024-01-01'), fileLocation: new URL('file:///withoutLang.pptx') };
            const en: OnePager = { local: 'EN', lastUpdateByEmployee: new Date('2025-01-01'), fileLocation: new URL('file:///en.pptx') };
            const withoutLangNewer: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2024-02-01'), fileLocation: new URL('file:///withoutLangNewer.pptx') };

            const result = validation.selectNewestOnePagers([de, en, withoutLang, withoutLangNewer]);

            assertSelection(result, [de, en, withoutLangNewer]);
        });

        it('should select no without language if older than with language', () => {
            const de: OnePager = { local: 'DE', lastUpdateByEmployee: new Date('2025-01-01'), fileLocation: new URL('file:///de.pptx') };
            const withoutLang: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2024-01-01'), fileLocation: new URL('file:///withoutLang.pptx') };
            const en: OnePager = { local: 'EN', lastUpdateByEmployee: new Date('2025-01-01'), fileLocation: new URL('file:///en.pptx') };
            const withoutLangNewer: OnePager = { local: undefined, lastUpdateByEmployee: new Date('2024-02-01'), fileLocation: new URL('file:///withoutLangNewer.pptx') };

            const result = validation.selectNewestOnePagers([de, en, withoutLang, withoutLangNewer]);

            assertSelection(result, [de, en]);
        });

        function assertSelection(actual: OnePager[], expected: OnePager[]) {
            const actualUrls = actual.map(op => op.fileLocation.toString()).sort();
            const expectedUrls = expected.map(op => op.fileLocation.toString()).sort();
            expect(actualUrls).toEqual(expectedUrls);
        }
    });

    describe('validateRequiredVersions', () => {
        const repo = new InMemoryOnePagerRepository({});
        const validation = new OnePagerValidation(repo, repo, reporter, new TestLanguageDetector(), async () => []);

        it('should report both languages missing if none exist', () => {
            const result = validation.validateRequiredVersions([]);

            expect(result).toEqual([
                { onePager: undefined, errors: ['MISSING_DE_VERSION'] },
                { onePager: undefined, errors: ['MISSING_EN_VERSION'] },
            ]);
        });

        it('should report nothing missing if versions for each language exist', () => {
            const result = validation.validateRequiredVersions([
                { local: 'DE', contentLanguages: ['DE'], lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///de.pptx'), data: Buffer.from('') },
                { local: 'EN', contentLanguages: ['EN'], lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///en.pptx'), data: Buffer.from('') },
            ]);

            expect(result.map(r => r.errors)).toEqual([]);
        });

        it('should report nothing missing if versions for each language exist (indicated language takes precedence)', () => {
            const result = validation.validateRequiredVersions([
                { local: 'DE', contentLanguages: ['DE'], lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///de.pptx'), data: Buffer.from('') },
                { local: 'EN', contentLanguages: ['DE'], lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///en.pptx'), data: Buffer.from('') },
            ]);

            expect(result.map(r => r.errors)).toEqual([]);
        });

        it('should report nothing missing if versions for each language exist (content language is taken into account)', () => {
            const result = validation.validateRequiredVersions([
                { local: 'DE', contentLanguages: ['DE'], lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///de.pptx'), data: Buffer.from('') },
                { local: undefined, contentLanguages: ['EN'], lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///en.pptx'), data: Buffer.from('') },
            ]);

            expect(result.map(r => r.errors)).toEqual([]);
        });

        it.each([
            { lang: 'EN' as Local, error: 'MISSING_DE_VERSION' },
            { lang: 'DE' as Local, error: 'MISSING_EN_VERSION' },
        ])('should report missing DE version', ({ lang, error }) => {
            const result = validation.validateRequiredVersions([
                { local: lang, contentLanguages: [lang], lastUpdateByEmployee: new Date(), fileLocation: new URL('file:///en.pptx'), data: Buffer.from('') },
            ]);

            expect(result).toEqual([
                { onePager: undefined, errors: [error] },
            ]);
        });
    });
});
