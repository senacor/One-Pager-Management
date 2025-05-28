import { ClientSecretCredential } from "@azure/identity";
import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../src/functions/validator/adapter/InMemoryValidationReporter";
import { SharepointListValidationReporter } from "../src/functions/validator/adapter/SharepointListValidationReporter";
import { EmployeeID, OnePagerRepository, ValidationReporter } from "../src/functions/validator/DomainTypes";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider";
import { Client } from "@microsoft/microsoft-graph-client";
import { LocalFileValidationReporter } from "../src/functions/validator/adapter/LocalFileValidationReporter";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from 'node:os';
import { createSharepointClient, hasSharepointClientOptions, SharepointClientOptions } from "../src/functions/configuration/AppConfiguration";

type ReporterFactory = () => Promise<ValidationReporter>;

const testFactory = (name: string, reporterFactory: ReporterFactory) => {
    describe(name, () => {

        it("should return no errors without any report", async () => {
            const reporter = await reporterFactory();

            await expect(reporter.getResultFor("unknown-employee-id")).resolves.toEqual([]);
        });

        it("should return errors when reported", async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual(["OLDER_THAN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);
        });

        it("should clean up errors when valid is reported", async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS"]);
            await reporter.reportValid("employee-id");

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual([]);
        });

        it("should not return errors of other employee", async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors("other-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual([]);
        });

        it("should not clean up errors when valid is reported for other employee", async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS"]);
            await reporter.reportValid("other-id");

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual(["OLDER_THAN_SIX_MONTHS"]);
        });

        it("should replace previous error with new ones", async () => {
            const reporter = await reporterFactory();

            await reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS"]);
            await reporter.reportErrors("employee-id", "Employee Name", ["MISSING_ENGLISH_VERSION"]);


            await expect(reporter.getResultFor("employee-id")).resolves.toEqual(["MISSING_ENGLISH_VERSION"]);
        });

    });
}

testFactory("InMemoryValidationReporter", async () => new InMemoryValidationReporter());

const opts = process.env
if (hasSharepointClientOptions(opts)) {
    testFactory("SharepointListValidationReporter", async () => {
        const client = createSharepointClient(opts)

        let reporter = await SharepointListValidationReporter.getInstance(
            client, "senacor.sharepoint.com:/teams/MaInfoTest", "one-pager-status-automated-test-env"
        );

        await reporter.clearList();

        return reporter;
    });
}

testFactory("LocalFileValidationReporter", async () => {
    const tmp = await fs.mkdtemp(path.join(tmpdir(), "validation-reports-"))
    return new LocalFileValidationReporter(tmp);
});
