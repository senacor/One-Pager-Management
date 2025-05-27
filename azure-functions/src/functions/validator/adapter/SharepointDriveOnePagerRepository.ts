import { EmployeeID, OnePager, OnePagerRepository } from "../DomainTypes";
import { Client } from "@microsoft/microsoft-graph-client";
import { Drive, DriveItem } from "@microsoft/microsoft-graph-types";

type SharePointFolder = string;
type OnePagerMap = { [employeeId: EmployeeID]:  OnePager[] | SharePointFolder };

export class SharepointDriveOnePagerRepository implements OnePagerRepository {
    readonly onePagers: OnePagerMap;
    private loadedOnePagers: boolean = false;
    private client: Client;

    private constructor(client: Client,  folders: DriveItem[], onePagerDriveId: string) {
        this.onePagers = {};
        this.client = client;

        for (const folder of folders) {
            if (!folder.name) {
                continue;
            }

            const employeeId: EmployeeID = folder.name.split("_").pop() as string;
            this.onePagers[employeeId] = `/drives/${onePagerDriveId}/root:/${folder.name}:/children` as SharePointFolder;
        }
    }

    public static async getInstance(client: Client, siteIDAlias: string, listName: string): Promise<SharepointDriveOnePagerRepository> {
        const siteID: string = (await client.api(`/sites/${siteIDAlias}`).get()).id as string;

        const onePagerDriveId: string = (await client.api(`/sites/${siteID}/drives`).get()).value.filter((drive: {"name": string}) => drive.name === listName)[0].id as string;
        const folders = (await client.api(`/drives/${onePagerDriveId}/root/children`).top(100000).get()).value as DriveItem[];

        return new SharepointDriveOnePagerRepository(client, folders, onePagerDriveId);
    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        if (this.onePagers.hasOwnProperty(employeeId)) {
            const folder = this.onePagers[employeeId];

            if (typeof folder === "string") {
                // load contents of one pager folder
                let folderContents = (await this.client.api(folder).get()).value as DriveItem[];
                this.onePagers[employeeId] = [];
                for (const driveItem of folderContents) {
                    if (!driveItem.lastModifiedDateTime) {
                        continue;
                    } else {
                        this.onePagers[employeeId].push({ lastUpdateByEmployee: new Date(driveItem.lastModifiedDateTime) } as OnePager);
                    }
                }
                return this.onePagers[employeeId];
            } else {
                // return cached version
                return folder;
            }
        }

        return [];
    }
}
