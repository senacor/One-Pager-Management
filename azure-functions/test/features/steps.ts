import { Given, Then, When, Before, After } from '@cucumber/cucumber';
import { OnePagerValidation } from '../../src/functions/validator/OnePagerValidation';
import {
    EmployeeID,
    EmployeeRepository,
    OnePagerRepository,
    ValidationReporter,
} from '../../src/functions/validator/DomainTypes';
import assert from 'assert';
import sinon, { SinonFakeTimers } from 'sinon';
import { promises as fs } from 'fs';
import { InMemoryValidationReporter } from '../../src/functions/validator/adapter/memory/InMemoryValidationReporter';
import { PptxContentLanguageDetector } from '../../src/functions/validator/adapter/PptxContentLanguageDetector';
import {
    extractLanguageCode,
    FolderBasedOnePagers,
} from '../../src/functions/validator/FolderBasedOnePagers';
import { OnePagerExemplars } from '../OnePagerExemplars';
import { MemoryFileSystem } from '../../src/functions/validator/adapter/memory/MemoryFileSystem';
import { FileSystemStorageExplorer } from '../../src/functions/validator/adapter/FileSystemStorageExplorer';
import { allRules } from '../../src/functions/validator/rules';
import { InMemoryDataRepository } from '../../src/functions/validator/adapter/memory/InMemoryDataRepository';

type OnePagerExemplar = {
    Name: string;
    TemplateVersion?: string;
    SlideLanguage?: string;
};

type EmployeeExemplar = {
    Id: EmployeeID;
    Name: string;
    FamilyName: string;
};

type Context = {
    clock: SinonFakeTimers;
    reporter: ValidationReporter;
    repo: OnePagerRepository & EmployeeRepository;
    exemplars: OnePagerExemplars;
    service: OnePagerValidation;
    getEmployee: (name: string) => EmployeeExemplar;
};

type DataTable<T> = {
    hashes: () => T[];
};

Before(async function (this: Context) {
    this.reporter = new InMemoryValidationReporter();
    const explorer = new FileSystemStorageExplorer('/', new MemoryFileSystem());
    this.repo = new FolderBasedOnePagers(explorer);
    this.exemplars = new OnePagerExemplars(explorer);
    this.service = new OnePagerValidation(
        this.repo,
        this.repo,
        this.reporter,
        new PptxContentLanguageDetector(),
        allRules(),
        new InMemoryDataRepository()
    );
});

After(async function (this: Context) {
    this.clock.restore();
});

Given('today is {string}', function (this: Context, date: string) {
    this.clock = sinon.useFakeTimers({
        now: new Date(date),
        shouldAdvanceTime: true,
    });
});

Given('the following employees exist:', initEmployees);

function initEmployees(this: Context, employees: DataTable<EmployeeExemplar>) {
    this.getEmployee = (name: string) => {
        const found = employees.hashes().find(e => e.Name === name);
        if (!found) {
            throw new Error(`Employee ${name} not found`);
        }
        return found;
    };
}

Given('{string} has OnePager {string}', createOnePagers);

Given('{string} has the following OnePagers:', createOnePagers);

async function createOnePagers(
    this: Context,
    employeeName: string,
    data: string | DataTable<OnePagerExemplar>
) {
    const { Id } = this.getEmployee(employeeName);

    let onePagers: OnePagerExemplar[];
    if (typeof data === 'string') {
        onePagers = [{ Name: data }];
    } else {
        onePagers = data.hashes();
    }

    await Promise.all(
        onePagers.map(async onePager => {
            const language = onePager.SlideLanguage || extractLanguageCode(onePager.Name);
            if (!language) {
                throw new Error(
                    `A language for the OnePager must either be defined by the use of a local in the name or by provinding the SlideLanguage property.`
                );
            }
            const file = await templatePath(language, onePager.TemplateVersion);
            await this.exemplars.createOnePagerForEmployee(Id, onePager.Name, file);
        })
    );
}

async function templatePath(language: string, templateVersion?: string): Promise<string> {
    const file = `test/onepager/example-${templateVersion || '2024'}-${language}.pptx`;
    try {
        await fs.access(file);
    } catch {
        throw new Error(
            `No test example OnePager for language ${language} and template version ${templateVersion} found in "test/onepager"`
        );
    }
    return file;
}

When('we validate the OnePagers of {string}', async function (this: Context, employee: string) {
    await (this.service as OnePagerValidation).validateOnePagersOfEmployee(
        this.getEmployee(employee).Id
    );
});

Then('{string} OnePagers have no validation errors', function (this: Context, employee: string) {
    return checkErrors.call(this, employee);
});

Then(
    '{string} OnePagers have the validation error {string}',
    function (this: Context, employee: string, error: string) {
        return checkErrors.call(this, employee, error);
    }
);

Then(
    '{string} OnePagers have the validation errors {string} and {string}',
    function (this: Context, employee: string, error1: string, error2: string) {
        return checkErrors.call(this, employee, error1, error2);
    }
);

// Generalized to accept up to two error strings, but works for all three step patterns
async function checkErrors(this: Context, employee: string, ...errors: string[]) {
    const { Id } = this.getEmployee(employee);
    // Collect errors, filter out undefined
    const results = await this.reporter.getResultFor(Id);

    assert.deepEqual(
        results.sort(),
        errors.sort(),
        `Expected errors for ${Id} to be ${JSON.stringify(errors)}, but got ${JSON.stringify(results)}`
    );
}
