import { Given, Then, When, Before, After } from '@cucumber/cucumber';
import { OnePagerValidation } from '../../src/functions/validator/OnePagerValidation';
import {
    EmployeeID,
    EmployeeRepository,
    isLocal,
    isValidationError,
    Local,
    LocalEnum,
    LocalToValidatedOnePager,
    OnePagerRepository,
    ValidationReporter,
} from '../../src/functions/validator/DomainTypes';
import assert from 'assert';
import sinon, { SinonFakeTimers } from 'sinon';
import { promises as fs } from 'fs';
import { InMemoryValidationReporter } from '../../src/functions/validator/adapter/memory/InMemoryValidationReporter';
import {
    extractLanguageCode,
    FolderBasedOnePagers,
} from '../../src/functions/validator/FolderBasedOnePagers';
import { OnePagerExemplars } from '../OnePagerExemplars';
import { MemoryFileSystem } from '../../src/functions/validator/adapter/memory/MemoryFileSystem';
import { FileSystemStorageExplorer } from '../../src/functions/validator/adapter/FileSystemStorageExplorer';
import { allRules } from '../../src/functions/validator/rules';
import * as system from 'os';
import { ValidationError } from 'xml2js';

type OnePagerExemplar = {
    Name: string;
    TemplateVersion?: string;
    SlideLanguage?: string;
};

type EmployeeExemplar = {
    Id: EmployeeID;
    Name: string;
    FamilyName: string;
    Language: Local;
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

type ValidationErrorObject = {[local in Local]: ValidationError[]};

Before(async function (this: Context) {
    this.reporter = new InMemoryValidationReporter();
    const explorer = new FileSystemStorageExplorer(system.type().startsWith('Windows') ? 'C:/' : '/', new MemoryFileSystem());
    this.repo = new FolderBasedOnePagers(explorer);
    this.exemplars = new OnePagerExemplars(explorer);
    this.service = new OnePagerValidation(this.repo, this.repo, this.reporter, allRules());
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
    const file = `test/resources/onepager/example-${templateVersion || '2024'}-${language}.pptx`;
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
    return checkErrors.call(this, employee, Object.assign({}, ...Object.values(LocalEnum).map((lang) => ({[lang]: []}))));
});

Then(
    '{string} OnePagers have the validation errors:',
    async function (this: Context, employee: string, data: DataTable<{ Version: Local; Error: string }>) {
        const errorObj: ValidationErrorObject = data.hashes().reduce((acc, curr) => {
            const local = curr.Version as Local;
            if (!isLocal(local)) {
                throw new Error(`Invalid local ${local} in data table`);
            }
            if (!acc[local]) {
                acc[local] = [];
            }
            const error: unknown = curr.Error;
            if (!isValidationError(error)) {
                return acc; // Ignore invalid errors
            }
            acc[local].push(error as unknown as ValidationError);
            return acc;
        }, {} as Record<Local, ValidationError[]>);

        if (Object.values(LocalEnum).some((lang) => !errorObj[lang])) {
            throw new Error(`Error object must contain at least one entry for each local: ${JSON.stringify(errorObj)}`);
        }

        await checkErrors.call(this, employee, errorObj);
    }
)

// Generalized to accept up to two error strings, but works for all three step patterns
async function checkErrors(this: Context, employee: string, errorObj: ValidationErrorObject): Promise<void> {
    const { Id } = this.getEmployee(employee);
    const results: LocalToValidatedOnePager = await this.reporter.getResultFor(Id);
    const resultErrors: ValidationErrorObject = Object.assign({}, ...((Object.values(LocalEnum) as Local[]).map((lang) => {
        return {
            [lang]: results[lang].errors
        };
    })));


    assert.deepStrictEqual(
        resultErrors,
        errorObj,
        `Expected errors for ${Id} to be ${JSON.stringify(errorObj)}, but got ${JSON.stringify(resultErrors)}`
    );
}
