import assert from 'assert';
import { Given, When, Then, BeforeAll, Before, After, AfterAll } from '@cucumber/cucumber';
// import { createSharepointClient } from '../../src/functions/configuration/AppConfiguration';
// import { DriveItem } from '@microsoft/microsoft-graph-types';
// import { SharepointDriveOnePagerRepository } from '../../src/functions/validator/adapter/sharepoint/SharepointDriveOnePagerRepository';
// import { Client } from '@microsoft/microsoft-graph-client';
import { LocalFileOnePagerRepository } from '../../src/functions/validator/adapter/localfile/LocalFileOnePagerRepository';
import { promises as fs } from "fs";
import { tmpdir } from 'node:os';
import path from "path";
import { EmployeeID, ValidationError, Local } from '../../src/functions/validator/DomainTypes';
import { isOnePagerFile } from '../../src/functions/validator/adapter/DirectoryBasedOnePager';
import { fromYYMMDD } from '../../src/functions/validator/adapter/DirectoryBasedOnePager';
import { OnePagerValidation } from '../../src/functions/validator/OnePagerValidation';
import * as validationRules from '../../src/functions/validator/validationRules';
import { LocalFileEmployeeRepository } from '../../src/functions/validator/adapter/localfile/LocalFileEmployeeRepository';
import { LocalFileValidationReporter } from '../../src/functions/validator/adapter/localfile/LocalFileValidationReporter';
import { jest } from '@jest/globals';

// let opts:NodeJS.ProcessEnv;
// let siteIDAlias: string, listName: string, client: Client, onePagerDriveId: string;
let repo: LocalFileOnePagerRepository;
let validator: OnePagerValidation;
let employeeRepo: LocalFileEmployeeRepository;
let reporter: LocalFileValidationReporter;

BeforeAll(async function () {
    // opts = process.env;
    // siteIDAlias = "senacor.sharepoint.com:/teams/MaInfoTest";
    // listName = "OnePagerAutomatedTestEnv";

    // client = createSharepointClient({...opts, SHAREPOINT_API_LOGGING: "true"});

    // let siteID: string = (await client.api(`/sites/${siteIDAlias}`).select("id").get()).id as string;
    // onePagerDriveId = (await client.api(`/sites/${siteID}/drives`).select(["id", "name"]).get()).value.filter((drive: { "name": string }) => drive.name === listName)[0].id as string;




});

Before(async function () {
    // delete all folders in the onepager drive
    // const folders = (await this.client.api(`/drives/${this.onePagerDriveId}/root/children`).select("id").top(100000).get()).value as DriveItem[];

    // for (let element of folders) {
    //     await this.client.api(`/drives/${this.onePagerDriveId}/items/${element.id}/permanentDelete`).post(null);
    // }

    let tmpDir: string = await fs.mkdtemp(path.join(tmpdir(), "validation-reports-"));
    console.log(`Using temporary directory: ${tmpDir}`);

    repo = new LocalFileOnePagerRepository(tmpDir);
    employeeRepo = new LocalFileEmployeeRepository(tmpDir);
    reporter = new LocalFileValidationReporter(tmpDir);
});

Given("today is {string}", function (date: string) {
    let dateObj: Date = new Date(date);
    jest.setSystemTime(dateObj);
});

Given('a valid one-pager {string} of an employee with Id {string} exists', async function (name: string, id: EmployeeID) {

    console.log(`Creating a valid onepager with name "${name}" for employee with Id "${id}"`);

    assert(isOnePagerFile(name)); // one pager has the form "FamilyName, Name_.._YYMMDD.pptx"

    const onePagerDate: Date = fromYYMMDD(name.split("_").slice(-1)[0].split(".")[0]); // extract date from file name
    let local: Local = name.split("_").slice(-2, -1)[0] as Local; // extract local from file name


    await repo.saveOnePagersOfEmployee(id, [{lastUpdateByEmployee: onePagerDate, local: local}]);



    // // Ordner anlegen
    // const requests = await client.api(`/drives/${onePagerDriveId}/items/root/children`).post({
    //     "name": name,
    //     "folder": {},
    //     "@microsoft.graph.conflictBehavior": "rename"
    // });

    // await client.api(`/drives/${onePagerDriveId}/items/${requests.id}:/${name}:/content`).put("iwas");

    // return await SharepointDriveOnePagerRepository.getInstance(client, siteIDAlias, listName, console);
});

When('the one-pagers of the employee with Id {string} are validated', async function (id: EmployeeID) {

    validator = new OnePagerValidation(repo, employeeRepo, reporter, validationRules.allRules(console));
    await validator.validateOnePagersOfEmployee(id);
});

Then('no validation errors are reported for the employee with Id {string}', async function (id: EmployeeID) {
    let errors: ValidationError[] = await reporter.getResultFor(id);
    assert(errors.length === 0, `Expected no validation errors for employee with Id ${id}, but found ${errors.length} errors: ${JSON.stringify(errors)}`);
});




Given(`nothing`, function () {
    // console.log('Creating a greeter');
});

When('nothing', function () {
    // console.log('Greeter says hello!');
    //   this.whatIHeard = new Greeter().sayHello()
});


Then('nothing', function (expectedResponse) {
    // console.log('Expected response:', expectedResponse);
    //assert.equal("hello", expectedResponse);
});

Then('the following validation errors are reported for the employee with Id {string}:', (s: string) => {
  // Write code here that turns the phrase above into concrete actions
});

Given('an one-pager {string} of an employee with Id {string} exists based on an outdated template', (s: string, s2: string) => {
  // Write code here that turns the phrase above into concrete actions
})

Given('a valid one-pager {string} of an employee with Id {string} exists with slides in {string}', (s: string, s2: string, lang: string) => {
  // Write code here that turns the phrase above into concrete actions
})

Given('a valid one-pager {string} of an employee with Id {string} exists with slides in {string} and {string}', (s: string, s2: string, s3: string, s4: string) => {
  // Write code here that turns the phrase above into concrete actions
})
