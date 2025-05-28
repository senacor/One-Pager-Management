import { ClientSecretCredential } from "@azure/identity";
import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/InMemoryOnePagerRepository";
import { SharepointDriveOnePagerRepository } from "../src/functions/validator/adapter/SharepointDriveOnePagerRepository";
import { EmployeeID, OnePager, OnePagerRepository } from "../src/functions/validator/DomainTypes";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider";
import { Client } from "@microsoft/microsoft-graph-client";
import { DriveItem } from "@microsoft/microsoft-graph-types";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from 'node:os';
import { LocalFileOnePagerRepository } from "../src/functions/validator/adapter/LocalFileOnePagerRepository";

type RepoFactory = (onePagers: { [employeeId: EmployeeID]: OnePager[] }) => Promise<OnePagerRepository>;

const testFactory = (name: string, factory: RepoFactory) => {
    describe(name, () => {

        it("should return nothing for an unknown employee", async () => {
            const rep: OnePagerRepository = await factory({});
            const unknownEmployeeId: EmployeeID = "unknown-employee-id";

            await expect(rep.getAllOnePagersOfEmployee(unknownEmployeeId)).resolves.toEqual(undefined);
        });

        it("should return an empty array for an existing employee without any one-pager", async () => {
            const id: EmployeeID = "existing-employee-id";
            const rep: OnePagerRepository = await factory({ [id]: [] });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
        });

        it("should return all one-pager of an existing employee", async () => {
            const id: EmployeeID = "existing-employee-id";
            const rep: OnePagerRepository = await factory({
                [id]: [
                    { lastUpdateByEmployee: new Date(), downloadURL: "" },
                    { lastUpdateByEmployee: new Date(), downloadURL: "" }
                ]
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toHaveLength(2);
        });

        it("should not return one-pager of a different employee", async () => {
            const id: EmployeeID = "existing-employee-id";
            const rep: OnePagerRepository = await factory({
                other: [
                    { lastUpdateByEmployee: new Date(), downloadURL: "" }
                ]
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual(undefined);
        });

        it("should return one-pagers with  URLs as downloadURLs", async () => {
            const id: EmployeeID = "existing-employee-id";
            const rep: OnePagerRepository = await factory({
                [id]: [
                    { lastUpdateByEmployee: new Date(), downloadURL: "https://" }
                ]
            });
            let onePagers = await rep.getAllOnePagersOfEmployee(id);
            expect(onePagers).toHaveLength(1);
            expect((onePagers as OnePager[])[0].downloadURL.indexOf("https://")).toEqual(0);
        });
    });
}

testFactory("InMemoryOnePagerRepository", async (data) => new InMemoryOnePagerRepository(data));

if (process.env.SHAREPOINT_CLIENT_SECRET) {
    testFactory("SharepointDriveOnePagerRepository", async (data) => {
        const siteIDAlias: string = "senacor.sharepoint.com:/teams/MaInfoTest";

        const listName: string = "OnePagerAutomatedTestEnv";

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

        const siteID: string = (await client.api(`/sites/${siteIDAlias}`).get()).id as string;
        const onePagerDriveId: string = (await client.api(`/sites/${siteID}/drives`).get()).value.filter((drive: { "name": string }) => drive.name === listName)[0].id as string;

        const folders = (await client.api(`/drives/${onePagerDriveId}/root/children`).top(100000).get()).value as DriveItem[];

        for (let element of folders) {
            await client.api(`/drives/${onePagerDriveId}/items/${element.id}/permanentDelete`).post(null);
        }

        for (const employeeId in data) {
            // Ordner anlegen
            const requests = await client.api(`/drives/${onePagerDriveId}/items/root/children`).post({
                "name": `Name_Vorname_${employeeId}`,
                "folder": {},
                "@microsoft.graph.conflictBehavior": "rename"
            });
            for (let i = 0; i < data[employeeId].length; ++i) {
                await client.api(`/drives/${onePagerDriveId}/items/${requests.id}:/Name_Vorname_${i}.pptx:/content`).put("iwas");
            }
        }

        return await SharepointDriveOnePagerRepository.getInstance(client, siteIDAlias, listName);
    });
}

testFactory("LocalFileOnePagerRepository", async (data) => {
    const tmp = await fs.mkdtemp(path.join(tmpdir(), "validation-reports-"))
    const reporter = new LocalFileOnePagerRepository(tmp);

    for (const employeeId in data) {
        await reporter.saveOnePagersOfEmployee(employeeId, data[employeeId]);
    }

    return reporter;
});
