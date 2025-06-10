import { Given, Then, When, defineParameterType, Before } from '@cucumber/cucumber';
import { OnePagerValidation } from '../../src/functions/validator/OnePagerValidation';
import { loadConfigFromEnv } from '../../src/functions/configuration/AppConfiguration';
import { allRules } from '../../src/functions/validator/validationRules';
import {
    EmployeeID,
    OnePagerRepository,
    ValidationReporter,
} from '../../src/functions/validator/DomainTypes';
import assert from 'assert';
import { LocalFileOnePagerRepository } from '../../src/functions/validator/adapter/localfile/LocalFileOnePagerRepository';

/* eslint-disable prefer-arrow-callback */

defineParameterType({
    name: 'errors',
    regexp: /\[(.*?)\]/,
    transformer: (s) => s.split(/\s*,\s*/),
});

type OnePagerExemplar = {
    name: string;
    templateVersion?: string;
    slideLanguage?: string;
};

type EmployeeExemplar = {
    id: EmployeeID;
    name: string;
    familyName: string;
};

type Context = {
    reporter: ValidationReporter;
    repo: OnePagerRepository;
    service: OnePagerValidation;
    getEmployee: (name: string) => EmployeeExemplar;
};

Before(async function (this: Context) {
    const conf = loadConfigFromEnv(console, { STORAGE_SOURCE: 'memory' });
    this.reporter = await conf.reporter();
    this.repo = await conf.onePagers();

    this.service = new OnePagerValidation(
        this.repo,
        await conf.employees(),
        this.reporter,
        allRules(console),
    );
});

Given('today is {string}', function (date) {
    // Write code here that turns the phrase above into concrete actions
    return 'pending';
});

Given('the following employees exist:', function (this: Context, employees: EmployeeExemplar[]) {
    this.getEmployee = (name: string) => {
        const found = employees.find((e) => e.name === name);
        if (!found) {
            throw new Error(`Employee ${name} not found`);
        }
        return found;
    };
});

Given('{string} has OnePager {string}', createOnePagers);

Given('{string} has the following OnePagers:', createOnePagers);

async function createOnePagers(
    this: Context,
    employeeName: string,
    onePagers: OnePagerExemplar | OnePagerExemplar[],
) {
    const { id } = this.getEmployee(employeeName);
    const dto = [onePagers].flat().map((op) => ({
        name: op.name,
        templateVersion: op.templateVersion,
        slideLanguage: op.slideLanguage,
    }));
    await (this.repo as LocalFileOnePagerRepository).saveOnePagersOfEmployee(id, dto);
}

When('we validate the OnePagers of {string}', async function (this: Context, employee: string) {
    await (this.service as OnePagerValidation).validateOnePagersOfEmployee(
        this.getEmployee(employee).id,
    );
});

Then('{string} OnePagers have no validation errors', checkErrors);

Then('{string} OnePagers have the validation error(s): {errors}', checkErrors);

async function checkErrors(this: Context, employee: string, errors?: string[]) {
    const { id } = this.getEmployee(employee);
    const results = await this.reporter.getResultFor(id);

    assert.deepEqual(
        results,
        errors || [],
        `Expected errors for ${id} to be ${JSON.stringify(errors)}, but got ${JSON.stringify(results)}`,
    );
}
