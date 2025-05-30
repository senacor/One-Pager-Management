import { DriveItem } from "@microsoft/microsoft-graph-types";
import { promises as fs } from "fs";
import { tmpdir } from 'node:os';
import path from "path";
import { createSharepointClient, hasSharepointClientOptions } from "../src/functions/configuration/AppConfiguration";
import { LocalFileOnePagerRepository } from "../src/functions/validator/adapter/localfile/LocalFileOnePagerRepository";
import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/memory/InMemoryOnePagerRepository";
import { SharepointDriveOnePagerRepository } from "../src/functions/validator/adapter/sharepoint/SharepointDriveOnePagerRepository";
import { EmployeeID, OnePagerRepository } from "../src/functions/validator/DomainTypes";

type RepoFactory = (onePagers: { [employeeId: EmployeeID]: { lastUpdateByEmployee: Date }[] }) => Promise<OnePagerRepository>;

const testFactory = (name: string, factory: RepoFactory) => {
    describe(name, () => {

        it("should return empty array for an unknown employee", async () => {
            const rep: OnePagerRepository = await factory({});
            const unknownEmployeeId: EmployeeID = "000"; // Example of an unknown employee ID

            await expect(rep.getAllOnePagersOfEmployee(unknownEmployeeId)).resolves.toEqual([]);
        });

        it("should return an empty array for an existing employee without any one-pager", async () => {
            const id: EmployeeID = "111";
            const rep: OnePagerRepository = await factory({ [id]: [] });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
        });

        it("should return all one-pager of an existing employee", async () => {
            const id: EmployeeID = "111";
            const rep: OnePagerRepository = await factory({
                [id]: [
                    { lastUpdateByEmployee: new Date("2020-01-01") },
                    { lastUpdateByEmployee: new Date("2024-01-01") }
                ]
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toHaveLength(2);
        });

        it("should not return one-pager of a different employee", async () => {
            const id: EmployeeID = "111";
            const rep: OnePagerRepository = await factory({
                [id]: [],
                "000": [
                    { lastUpdateByEmployee: new Date() }
                ]
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
        });

        it("should return one-pagers with URLs as downloadURLs", async () => {
            const id: EmployeeID = "111";
            const rep: OnePagerRepository = await factory({
                [id]: [
                    { lastUpdateByEmployee: new Date() }
                ]
            });
            let onePagers = await rep.getAllOnePagersOfEmployee(id);
            expect(onePagers).toHaveLength(1);
            expect(onePagers[0].location).not.toBeFalsy();
            expect(onePagers[0].location.pathname).not.toEqual("");
        });
    });
}

testFactory("InMemoryOnePagerRepository", async (data) => new InMemoryOnePagerRepository(data));

const opts = process.env
if (hasSharepointClientOptions(opts)) {
    testFactory("SharepointDriveOnePagerRepository", async (data) => {
        const siteIDAlias: string = "senacor.sharepoint.com:/teams/MaInfoTest";
        const listName: string = "OnePagerAutomatedTestEnv";

        const client = createSharepointClient(opts)

        const siteID: string = (await client.api(`/sites/${siteIDAlias}`).select("id").get()).id as string;
        const onePagerDriveId: string = (await client.api(`/sites/${siteID}/drives`).select(["id", "name"]).get()).value.filter((drive: { "name": string }) => drive.name === listName)[0].id as string;

        const folders = (await client.api(`/drives/${onePagerDriveId}/root/children`).select("id").top(100000).get()).value as DriveItem[];

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
            for (let i = 0; i < data[employeeId as EmployeeID].length; ++i) {
                await client.api(`/drives/${onePagerDriveId}/items/${requests.id}:/Name_Vorname_${i}.pptx:/content`).put("iwas");
            }
        }

        return await SharepointDriveOnePagerRepository.getInstance(client, siteIDAlias, listName);
    });
}

testFactory("LocalFileOnePagerRepository", async (data) => {
    const tmp = await fs.mkdtemp(path.join(tmpdir(), "validation-reports-"))
    console.log(`Using temporary directory: ${tmp}`);
    const repo = new LocalFileOnePagerRepository(tmp);

    for (const employeeId in data) {
        const id = employeeId as EmployeeID
        await repo.saveOnePagersOfEmployee(id, data[id].map(d => d.lastUpdateByEmployee));
    }

    return repo;
});
