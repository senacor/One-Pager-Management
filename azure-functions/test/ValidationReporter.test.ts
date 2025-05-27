import { ClientSecretCredential } from "@azure/identity";
import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../src/functions/validator/adapter/InMemoryValidationReporter";
import { SharepointListValidationReporter } from "../src/functions/validator/adapter/SharepointListValidationReporter";
import { EmployeeID, OnePagerRepository, ValidationReporter } from "../src/functions/validator/DomainTypes";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider";
import { Client } from "@microsoft/microsoft-graph-client";

type ReporterFactory = () => ValidationReporter;

const testFactory = (reporterFactory: ReporterFactory) => {
    describe("ValidationReporter", () => {

        it("should return no errors without any report", async () => {
            const reporter = reporterFactory();

            await expect(reporter.getResultFor("unknown-employee-id")).resolves.toEqual([]);
        });

        it("should return errors when reported", async () => {
            const reporter = reporterFactory();

            reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual(["OLDER_THAN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);
        });

        it("should clean up errors when valid is reported", async () => {
            const reporter = reporterFactory();

            reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS"]);
            reporter.reportValid("employee-id");

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual([]);
        });

        it("should not return errors of other employee", async () => {
            const reporter = reporterFactory();

            reporter.reportErrors("other-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual([]);
        });

        it("should not clean up errors when valid is reported for other employee", async () => {
            const reporter = reporterFactory();

            reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THAN_SIX_MONTHS"]);
            reporter.reportValid("other-id");

            await expect(reporter.getResultFor("employee-id")).resolves.toEqual(["OLDER_THAN_SIX_MONTHS"]);
        });

    });
}

testFactory(() => new InMemoryValidationReporter());
testFactory(() => {
    const siteIDAlias: string = "senacor.sharepoint.com:/teams/MaInfoTest";

    const credential: ClientSecretCredential = new ClientSecretCredential(
        process.env.SHAREPOINT_TENANT_ID as string,
        process.env.SHAREPOINT_CLIENT_ID as string,
        process.env.SHAREPOINT_CLIENT_SECRET as string,
    );

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
    });

    const client = Client.initWithMiddleware({
        debugLogging: true,
        authProvider,
    });

    return new SharepointListValidationReporter(client, "one-pager-status-automated-test-env")
});
