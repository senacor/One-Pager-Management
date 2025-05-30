import { Client } from "@microsoft/microsoft-graph-client";
import { DriveItem } from "@microsoft/microsoft-graph-types";
import { URL } from "node:url";
import { EmployeeID, EmployeeRepository, OnePager, OnePagerRepository } from "../../DomainTypes";

type SharePointFolder = string;
type OnePagerMap = { [employeeId: EmployeeID]: OnePager[] | SharePointFolder };
type DriveItemWithDownloadUrl = DriveItem & { "@microsoft.graph.downloadUrl"?: string };

export class SharepointDriveOnePagerRepository implements OnePagerRepository, EmployeeRepository {
    private readonly onePagers: OnePagerMap;
    private readonly client: Client;

    private constructor(client: Client, onePagers: OnePagerMap) {
        this.client = client;
        this.onePagers = onePagers;
    }

    public static async getInstance(client: Client, siteIDAlias: string, listName: string): Promise<SharepointDriveOnePagerRepository> {
        const siteID: string = (await client.api(`/sites/${siteIDAlias}`).get()).id as string;

        const onePagerDriveId: string = (await client.api(`/sites/${siteID}/drives`).get()).value.filter((drive: { "name": string }) => drive.name === listName)[0].id as string;
        const { value: folders } = await client.api(`/drives/${onePagerDriveId}/root/children`).top(100000).get() as { value?: DriveItem[] };

        if (folders === undefined) {
            throw new Error(`could not fetch folders of SharePoint drive with ID ${onePagerDriveId} for site ${siteIDAlias}`);
        }

        const onePagers: OnePagerMap = {};
        for (const folder of folders) {
            if (!folder.name) {
                continue;
            }

            const employeeId: EmployeeID = folder.name.split("_").pop() as string;
            onePagers[employeeId] = `/drives/${onePagerDriveId}/root:/${folder.name}:/children` as SharePointFolder;
        }

        return new SharepointDriveOnePagerRepository(client, onePagers);
    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        const folder = this.onePagers[employeeId];
        if (!folder) {
            return [];
        }

        if (Array.isArray(folder)) {
            return folder;
        }

        // load contents of one pager folder
        const { value: folderContents } = await this.client.api(folder).get() as { value?: DriveItemWithDownloadUrl[] };
        this.onePagers[employeeId] = [];
        if (folderContents) {
            for (const driveItem of folderContents) {
                // if the output does not have a date of last chage or is not a file, continue
                if (!driveItem.lastModifiedDateTime || !driveItem.file || !driveItem["@microsoft.graph.downloadUrl"]) {
                    continue;
                }
                let onePager: OnePager = {
                    lastUpdateByEmployee: new Date(driveItem.lastModifiedDateTime),
                    location: new URL(driveItem["@microsoft.graph.downloadUrl"])
                };
                this.onePagers[employeeId].push(onePager);
            }
        }
        return this.onePagers[employeeId];
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        return Object.keys(this.onePagers);
    }
}
