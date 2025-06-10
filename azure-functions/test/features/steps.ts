import { Given, Then, When, Before, After } from '@cucumber/cucumber';
import { OnePagerValidation } from '../../src/functions/validator/OnePagerValidation';
import path from 'path';
import { allRules, CURRENT_TEMPLATE_PATH } from '../../src/functions/validator/validationRules';
import { EmployeeID, ValidationReporter } from '../../src/functions/validator/DomainTypes';
import assert from 'assert';
import sinon, { SinonFakeTimers } from 'sinon';
import { LocalFileOnePagerRepository } from '../../src/functions/validator/adapter/localfile/LocalFileOnePagerRepository';
import { promises as fs } from 'fs';
import { tmpdir } from 'node:os';
import { LocalFileEmployeeRepository } from '../../src/functions/validator/adapter/localfile/LocalFileEmployeeRepository';
import { InMemoryValidationReporter } from '../../src/functions/validator/adapter/memory/InMemoryValidationReporter';

/* eslint-disable prefer-arrow-callback */

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
    repo: LocalFileOnePagerRepository;
    service: OnePagerValidation;
    getEmployee: (name: string) => EmployeeExemplar;
};

type DataTable<T> = {
    hashes: () => T[];
};

Before(async function (this: Context) {
    const tmp = await fs.mkdtemp(path.join(tmpdir(), 'validation-reports-'));
    console.log(`Using temporary directory: ${tmp}`);

    this.reporter = new InMemoryValidationReporter();
    this.repo = new LocalFileOnePagerRepository(tmp);
    this.service = new OnePagerValidation(
        this.repo,
        new LocalFileEmployeeRepository(tmp),
        this.reporter,
        allRules()
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

Given('the following employees exist:', function (this: Context, employees: DataTable<EmployeeExemplar>) {
    this.getEmployee = (name: string) => {
        const found = employees.hashes().find(e => e.Name === name);
        if (!found) {
            throw new Error(`Employee ${name} not found`);
        }
        return found;
    };
});

Given('{string} has OnePager {string}', createOnePagers);

Given('{string} has the following OnePagers:', createOnePagers);

async function createOnePagers(this: Context, employeeName: string, data: string | DataTable<OnePagerExemplar>) {
    const { Id } = this.getEmployee(employeeName);

    let onePagers: OnePagerExemplar[];
    if (typeof data === 'string') {
        onePagers = [{ Name: data }];
    } else {
        onePagers = data.hashes();
    }

    await Promise.all(onePagers.map(async onePager => {
        const template = onePager.TemplateVersion? templatePath(onePager.TemplateVersion) : CURRENT_TEMPLATE_PATH
        await this.repo.createOnePagerForEmployee(Id, onePager.Name, template);
    }));
}

function templatePath(templateVersion: string): string {
    switch (templateVersion) {
        case '2024':
            return 'examples/Mustermann, Max_DE_240209.pptx';
        case '2020':
            return 'examples/Mustermann, Max DE_201028.pptx';
        default:
            throw new Error(`Unknown template version: ${templateVersion}`);
    }
}

When('we validate the OnePagers of {string}', async function (this: Context, employee: string) {
    await (this.service as OnePagerValidation).validateOnePagersOfEmployee(this.getEmployee(employee).Id);
});

Then('{string} OnePagers have no validation errors', function (this: Context, employee: string) {
    return checkErrors.call(this, employee);
});

Then(
    '{string} OnePagers have the validation error {string}',
    function (this: Context, employee: string, error: string) {
        return checkErrors.call(this, employee, error);
    },
);

Then(
    '{string} OnePagers have the validation errors {string} and {string}',
    function (this: Context, employee: string, error1: string, error2: string) {
        return checkErrors.call(this, employee, error1, error2);
    },
);

// Generalized to accept up to two error strings, but works for all three step patterns
async function checkErrors(this: Context, employee: string, ...errors: string[]) {
    const { Id } = this.getEmployee(employee);
    // Collect errors, filter out undefined
    const results = await this.reporter.getResultFor(Id);

    assert.deepEqual(
        results,
        errors,
        `Expected errors for ${Id} to be ${JSON.stringify(errors)}, but got ${JSON.stringify(results)}`,
    );
}
