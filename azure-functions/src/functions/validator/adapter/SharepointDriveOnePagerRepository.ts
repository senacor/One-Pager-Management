import { EmployeeID, OnePager, OnePagerRepository } from "../DomainTypes";
import { Client } from "@microsoft/microsoft-graph-client";
import { DriveItem } from "@microsoft/microsoft-graph-types";

type SharePointFolder = string;
type OnePagerMap = { [employeeId: EmployeeID]:  OnePager[] | SharePointFolder };

export class SharepointDriveOnePagerRepository implements OnePagerRepository {
    private readonly onePagers: OnePagerMap;
    private readonly client: Client;

    private constructor(client: Client,  onePagers: OnePagerMap) {
        this.client = client;
        this.onePagers = onePagers;
    }

    public static async getInstance(client: Client, siteIDAlias: string, listName: string): Promise<SharepointDriveOnePagerRepository> {
        const siteID: string = (await client.api(`/sites/${siteIDAlias}`).get()).id as string;

        const onePagerDriveId: string = (await client.api(`/sites/${siteID}/drives`).get()).value.filter((drive: {"name": string}) => drive.name === listName)[0].id as string;
        const folders = (await client.api(`/drives/${onePagerDriveId}/root/children`).top(100000).get()).value as DriveItem[];

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

    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[] | undefined> {
        if (this.onePagers.hasOwnProperty(employeeId)) {
            const folder = this.onePagers[employeeId];

            if (typeof folder === "string") {
                // load contents of one pager folder
                let folderContents = (await this.client.api(folder).get()).value as DriveItem[];
                this.onePagers[employeeId] = [];
                for (const driveItem of folderContents) {
                    // if the output does not have a date of last chage or is not a file, continue
                    if (!driveItem.lastModifiedDateTime || !driveItem.file || !(driveItem as any)["@microsoft.graph.downloadUrl"]) {
                        continue;
                    } else {
                        let onePager: OnePager = {
                            lastUpdateByEmployee: new Date(driveItem.lastModifiedDateTime),
                            downloadURL: (driveItem as any)["@microsoft.graph.downloadUrl"] // this cannot be undefined since we checked via if-case
                        };
                        this.onePagers[employeeId].push(onePager);
                    }
                }
                return this.onePagers[employeeId];
            } else {
                // return cached version
                return folder;
            }
        }

        return undefined;
    }
}
