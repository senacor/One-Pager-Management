import { EmployeeID, ValidationError, Local } from '../../src/functions/validator/DomainTypes';
import { isOnePagerFile } from '../../src/functions/validator/adapter/DirectoryBasedOnePager';
import { fromYYMMDD } from '../../src/functions/validator/adapter/DirectoryBasedOnePager';
import { OnePagerValidation } from '../../src/functions/validator/OnePagerValidation';
import * as validationRules from '../../src/functions/validator/validationRules';
import { LocalFileEmployeeRepository } from '../../src/functions/validator/adapter/localfile/LocalFileEmployeeRepository';
import { LocalFileValidationReporter } from '../../src/functions/validator/adapter/localfile/LocalFileValidationReporter';
import { LocalFileOnePagerRepository } from '../../src/functions/validator/adapter/localfile/LocalFileOnePagerRepository';
import { promises as fs } from "fs";
import { tmpdir } from 'node:os';
import path from "path";
import { StepDefinitions } from 'jest-cucumber';
import assert from 'assert';


export const localOnePagerSteps: StepDefinitions = async ({ given, and, when, then }) => {
    let repo: LocalFileOnePagerRepository;
    let validator: OnePagerValidation;
    let employeeRepo: LocalFileEmployeeRepository;
    let reporter: LocalFileValidationReporter;

    beforeEach(async function () {

        let tmpDir: string = await fs.mkdtemp(path.join(tmpdir(), "validation-reports-"));
        console.log(`Using temporary directory: ${tmpDir}`);

        repo = new LocalFileOnePagerRepository(tmpDir);
        employeeRepo = new LocalFileEmployeeRepository(tmpDir);
        reporter = new LocalFileValidationReporter(tmpDir);
    });

    afterEach(function () {
        jest.useRealTimers();
    });

    given(/^today is "(.*)"$/, function (date: string) {
        let dateObj: Date = new Date(date);
        // jest.useFakeTimers({
        //     legacyFakeTimers: true
        // })
        jest.useFakeTimers({
            now: dateObj.getTime(),
            doNotFake: [
                // "Date",
                "hrtime",
                "nextTick",
                "performance",
                "queueMicrotask",
                "requestAnimationFrame",
                "cancelAnimationFrame",
                "requestIdleCallback",
                "cancelIdleCallback",
                "setImmediate",
                "clearImmediate",
                "setInterval",
                "clearInterval",
                "setTimeout",
                "clearTimeout"
            ],
        });
        jest.setSystemTime(dateObj);
    });

    given(/^a valid one-pager "(.*)" of an employee with Id "(\d+)" exists$/, async function (name: string, id: EmployeeID) {

        console.log(`Creating a valid onepager with name "${name}" for employee with Id "${id}"`);

        assert(isOnePagerFile(name)); // one pager has the form "FamilyName, Name_.._YYMMDD.pptx"

        const onePagerDate: Date = fromYYMMDD(name.split("_").slice(-1)[0].split(".")[0]); // extract date from file name
        let local: Local = name.split("_").slice(-2, -1)[0] as Local; // extract local from file name


        await repo.saveOnePagersOfEmployee(id, [{lastUpdateByEmployee: onePagerDate, local: local}]);

    });

    given(/^an one-pager "(.*)" of an employee with Id "(\d+)" exists based on an outdated template$/, async function (name: string, id: EmployeeID) {

        console.log(`Creating an onepager with name "${name}" for employee with Id "${id}" based on an outdated template`);

        assert(isOnePagerFile(name)); // one pager has the form "FamilyName, Name_.._YYMMDD.pptx"

        const onePagerDate: Date = fromYYMMDD(name.split("_").slice(-1)[0].split(".")[0]); // extract date from file name
        let local: Local = name.split("_").slice(-2, -1)[0] as Local; // extract local from file name

        // save one-pager based on an outdated template
        await repo.saveOnePagersOfEmployee(id, [{lastUpdateByEmployee: onePagerDate, local: local}], path.join(__dirname, "../../src/templates/OP_Template_PPT_DE_201028.pptx"));
    });

    given(/^a valid one-pager "(.*)" of an employee with Id "(\d+)" exists with slides in "(DE|EN)"$/, async function (name: string, id: EmployeeID, language: Local) {

        console.log(`Creating a valid onepager with name "${name}" for employee with Id "${id}" with slides in (DE|EN)`);

        assert(isOnePagerFile(name)); // one pager has the form "FamilyName, Name_.._YYMMDD.pptx"

        const onePagerDate: Date = fromYYMMDD(name.split("_").slice(-1)[0].split(".")[0]); // extract date from file name
        let local: Local = name.split("_").slice(-2, -1)[0] as Local; // extract local from file name

        // save one-pager with slides in english
        await repo.saveOnePagersOfEmployee(id, [{lastUpdateByEmployee: onePagerDate, local: local}], path.join(__dirname, `../../src/templates/OP_Template_PPT_${language}_240119.pptx`));
    });

    given(/^a valid one-pager "(.*)" of an employee with Id "(\d+)" exists with slides in "EN" and "DE"$/, async function (name: string, id: EmployeeID) {
        console.log(`Creating a valid onepager with name "${name}" for employee with Id "${id}" with slides in (DE|EN)`);

        assert(isOnePagerFile(name)); // one pager has the form "FamilyName, Name_.._YYMMDD.pptx"

        const onePagerDate: Date = fromYYMMDD(name.split("_").slice(-1)[0].split(".")[0]); // extract date from file name
        let local: Local = name.split("_").slice(-2, -1)[0] as Local; // extract local from file name

        // save one-pager with slides in english
        await repo.saveOnePagersOfEmployee(id, [{lastUpdateByEmployee: onePagerDate, local: local}], path.join(__dirname, `../../src/templates/OP_Template_PPT_MixedLang_240119.pptx`));
    });

    when(/^the one-pagers of the employee with Id "(\d+)" are validated$/, async function (id: EmployeeID) {
        validator = new OnePagerValidation(repo, employeeRepo, reporter, validationRules.allRules(console));
        await validator.validateOnePagersOfEmployee(id);
    });

    then(/no validation errors are reported for the employee with Id "(\d+)"$/, async function (id: EmployeeID) {
        let errors: ValidationError[] = await reporter.getResultFor(id);
        assert(errors.length === 0, `Expected no validation errors for employee with Id ${id}, but found ${errors.length} errors: ${JSON.stringify(errors)}`);
    });

    then(/^the following validation errors are reported for the employee with Id "(\d+)":$/, async function (id: EmployeeID, expected_errors_object: [{errors: ValidationError}]) {
        let errors: ValidationError[] = await reporter.getResultFor(id);
        // console.log(errors, id);
        let expected_errors: ValidationError[] = expected_errors_object.map(e => e.errors);

        // to check if two sets are equal, we have to check both inclusions

        // expected_errors subset of errors
        for (let expected_error of expected_errors) {
            assert(errors.includes(expected_error), `Expected validation error "${expected_error}" for employee with Id ${id}, but it was not found in the reported errors: ${JSON.stringify(errors)}`);
        }

        // errors subset of expected_errors
        for (let error of errors) {
            assert(expected_errors.includes(error), `Did not expect validation error "${error}" for employee with Id ${id}, but it was found in the reported errors: ${JSON.stringify(errors)}`);
        }
    });
// src/templates/OP_Template_PPT_DE_240119.pptx

    given(/^no_given$/, () => {});
    when(/^no_when$/, () => {});
    then(/^no_then$/, () => {});
    and(/^no_and$/, () => {});

};


// defineFeature(feature, function (test) {



// });
