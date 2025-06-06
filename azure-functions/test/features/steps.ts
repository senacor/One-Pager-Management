import { Given, Then, When, defineParameterType } from '@cucumber/cucumber';

defineParameterType({
  name: 'errors',
  regexp: /\[(.*?)\]/,
  transformer: (s) => s.split(/\s*,\s*/)
});

type OnePagerExemplar = {
    name: string
    templateVersion?: string
    slideLanguage?: string
};

type EmployeeExemplar = {
    id: string
    name: string
    familyName: string
};

Given('today is {string}', async (date) => {
    // Write code here that turns the phrase above into concrete actions
    return 'pending';
});

Given('the following employees exist:', async (employees: EmployeeExemplar[]) => {
    // Write code here that turns the phrase above into concrete actions
    return 'pending';
});

Given('{string} has OnePager {string}', async (employee, onePager) => {
    return await createOnePagers(employee, [{ name: onePager }]);
});

Given('{string} has the following OnePagers:', async (employee, onePagers) => {
    return await createOnePagers(employee, onePagers as OnePagerExemplar[]);
});

async function createOnePagers(employeeName: string, onePagers: OnePagerExemplar[]) {
    return 'pending';
}

When('we validate the OnePagers of {string}', async (employee: string) => {
    // Write code here that turns the phrase above into concrete actions
    return 'pending';
});

Then('{string} OnePagers have no validation errors', async (employee: string) => {
    // Write code here that turns the phrase above into concrete actions
    return 'pending';
});

Then('{string} OnePagers have the validation error(s): {errors}', async (employee: string, errors: string[]) => {
    // Write code here that turns the phrase above into concrete actions
    return 'pending';
});
