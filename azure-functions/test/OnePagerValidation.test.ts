import { ValidationError, ValidationReporter } from '../src/functions/validator/DomainTypes';
import { OnePagerValidation } from '../src/functions/validator/OnePagerValidation';
import { InMemoryOnePagerRepository } from '../src/functions/validator/adapter/memory/InMemoryOnePagerRepository';
import { InMemoryValidationReporter } from '../src/functions/validator/adapter/memory/InMemoryValidationReporter';

describe('OnePagerValidation', () => {
    let reporter: ValidationReporter;

    beforeEach(() => {
        reporter = new InMemoryValidationReporter();
    });

    it('should not report errors for unknown employee', async () => {
        const repo = new InMemoryOnePagerRepository({});
        const validation = new OnePagerValidation(repo, repo, reporter, async () => ['MISSING_ONE_PAGER']);

        await validation.validateOnePagersOfEmployee('000');

        await expect(await reporter.getResultFor('000')).toEqual([]);
    });

    it('should report errors for employee without one-pager', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({ [id]: [] });
        const validation = new OnePagerValidation(repo, repo, reporter, async op =>
            op === undefined ? ['MISSING_ONE_PAGER'] : [],
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(['MISSING_ONE_PAGER']);
    });

    it('should report errors for employee with invalid one-pager', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({
            [id]: [{ lastUpdateByEmployee: new Date() }],
        });
        const validation = new OnePagerValidation(repo, repo, reporter, async op =>
            op !== undefined ? ['OLDER_THAN_SIX_MONTHS'] : [],
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(['OLDER_THAN_SIX_MONTHS']);
    });

    it('should clean errors for employee when one-pager becomes valid', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({
            [id]: [{ lastUpdateByEmployee: new Date() }],
        });
        let callCounter = 0;
        const statefulValidator = async () =>
            callCounter++ === 0 ? (['OLDER_THAN_SIX_MONTHS'] as ValidationError[]) : [];
        const validation = new OnePagerValidation(repo, repo, reporter, statefulValidator);

        await validation.validateOnePagersOfEmployee(id);
        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    it('should validate newest one-pager', async () => {
        const id = '111';
        const repo = new InMemoryOnePagerRepository({
            [id]: [
                { lastUpdateByEmployee: new Date('2000-01-01') },
                { lastUpdateByEmployee: new Date('2025-01-01') },
                { lastUpdateByEmployee: new Date('2005-01-01') },
            ],
        });
        const validation = new OnePagerValidation(repo, repo, reporter, async op =>
            !op || op.lastUpdateByEmployee < new Date('2010-01-01') ? ['OLDER_THAN_SIX_MONTHS'] : [],
        );

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });
});
