import { EmployeeID, OnePager, OnePagerRepository } from "../DomainTypes";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider.js";
import { Client } from "@microsoft/microsoft-graph-client";


type OnePagerMap = { [employeeId: EmployeeID]: OnePager[] };

export class GraphAPIRepository implements OnePagerRepository {
    readonly onePagers: OnePagerMap;
    private loadedOnePagers: boolean = false;

    constructor() {
        this.onePagers = {};

    }

    async loadOnePagers(): Promise<void> {
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

        try {
            // -- One-Pager-Test-Folder (MaInfoTest): --
            // https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/lists/91b65748-3d1e-4a36-9652-06e2816d8b35/items
            // siteURL yields siteID: "senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac";

            const siteIDAlias: string = "senacor.sharepoint.com:/teams/MaInfoTest";            

            // -- real One-Pager-Folder (MaInfo): --
            // real MAInfo: https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e/lists/c70c37c3-6fe6-4316-bb79-6c535e774478/items
            // siteURL yields siteID: "senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e"
            
            // const siteIDAlias: string = "senacor.sharepoint.com:/sites/MaInfo/";

            const siteID: string = (await client.api(`/sites/${siteIDAlias}`).get()).id as string;

            const onePagerDriveId: string = (await client.api(`/sites/${siteID}/drives`).get()).value.filter((drive: {"name": string}) => drive.name === "01_OnePager")[0].id as string;
            const folders = (await client.api(`/drives/${onePagerDriveId}/root/children`).top(100000).get()).value;
            
            let _this = this;
            for (let folder of folders) {
            // folders.forEach(async (folder: {name: string}) => {
                const employeeId: EmployeeID = folder.name.split("_").pop() as string;

                let folderContents =  (await client.api(`/drives/${onePagerDriveId}/root:/${folder.name}:/children`).get()).value;
                
                _this.onePagers[employeeId] = [] as OnePager[];

                folderContents.forEach((contentElement: {lastModifiedDateTime: string}) => {
                    _this.onePagers[employeeId].push({ lastUpdateByEmployee: new Date(contentElement.lastModifiedDateTime) } as OnePager);
                });
                
            // });
            }
            

        } catch (e) {
            console.error(e);
        }

    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        if (!this.loadedOnePagers) {
            this.loadedOnePagers = true;
            await this.loadOnePagers();
        }
        // console.log(employeeId, JSON.stringify(this.onePagers),this.onePagers.hasOwnProperty(employeeId));
        return this.onePagers.hasOwnProperty(employeeId) ? this.onePagers[employeeId] : [];
    }
}
