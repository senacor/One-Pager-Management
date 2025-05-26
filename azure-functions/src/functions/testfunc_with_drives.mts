import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";

import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider.js";
import { Client } from "@microsoft/microsoft-graph-client";





var logStr = '';

function log(...args) {

    args.forEach((el) => {
        if (typeof el == "object") {
            el = JSON.stringify({...el});
        }
        logStr += el;
    });
    console.log(...args);
}


export async function TestTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    context.log(`HTTP function processed request for url "${request.url}"`);

    await run();


    return { body: `Hello! ${logStr}` };
};

app.http('TestTrigger', {
    methods: ['GET', 'POST'],
    authLevel: 'function',
    handler: TestTrigger,
    extraOutputs: []
});




async function run() {
    console.time('ProgramRunTime');

    log('Starting!');

    const credential: ClientSecretCredential = new ClientSecretCredential(
        process.env.MSTenantID,
        process.env.MSClientID,
        process.env.MSClientSecret,
        );

    log("Credentials initialized")

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
    });
    log('Auth Provider initialized!');

    const client = Client.initWithMiddleware({
        debugLogging: true,
        authProvider,
    });
    log('Client initialized!');


    // log("Token:", await credential.getToken(['https://graph.microsoft.com/.default']));


    try {
        // -- One-Pager-Test-Folder (MaInfoTest): --
        // https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/lists/91b65748-3d1e-4a36-9652-06e2816d8b35/items
        // siteURL yields siteID: "senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac";

        // const siteIDAlias: string = "senacor.sharepoint.com:/teams/MaInfoTest";
        // const listID: string = "91b65748-3d1e-4a36-9652-06e2816d8b35";
        // const parentFolderReference: string = "88295fd0-63b5-45c7-bac0-600799919914"; // TODO: herausfinden, wie man diese automatisch bekommt
        

        // -- real One-Pager-Folder (MaInfo): --
        // real MAInfo: https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e/lists/c70c37c3-6fe6-4316-bb79-6c535e774478/items
        // siteURL yields siteID: "senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e"
        
        const siteIDAlias: string = "senacor.sharepoint.com:/sites/MaInfo/";
        const listID = "c70c37c3-6fe6-4316-bb79-6c535e774478";
        const parentFolderReferences: string = "d496d5a9-1ef4-4388-afbe-b54f8fdba5a5";


        let siteID: string = (await client.api(`/sites/${siteIDAlias}`).get()).id as string;
        log("siteID", siteID);

        const onePagerDriveId = (await client.api(`/sites/${siteID}/drives`).get()).value.filter(drive => drive.name === "01_OnePager")[0].id;
        const folders = (await client.api(`/drives/${onePagerDriveId}/root/children`).select("Name").top(100000).get()).value;
        
        log("Number of folders directly in 01_OnePager:", folders.length);

        let curDate: number = Date.now();
        let listOfPeopleWithoutUpToDateOnePagers: Array<string> = [];

        for (let i = 0; i < folders.length; ++i) {
            let folderContents =  (await client.api(`/drives/${onePagerDriveId}/root:/${folders[i].name}:/children`).get()).value;

            let numOfUpToDateFiles: number = 0;
            for (let j = 0; j < folderContents.length; ++j) {
             


                // check File
                // get dateTime; lastModifiedDateTime is of the form "2025-05-23T08:20:10Z"
                let lastModifiedDateTime: Date = new Date(folderContents[j].lastModifiedDateTime);
                
                // calc time diff in milliseconds and convert it to days by deviding by 24 hours * 60 minutes * 60 seconds * 1000 millisenconds
                let dateDiffInDays: number = Math.floor((curDate - lastModifiedDateTime.getTime())/(24*3600000)); 
                    
                // if file is younder than half a year (183 days)
                if (dateDiffInDays < 183) {
                    numOfUpToDateFiles++;
                }
            }

            break;

            // everyone needs at least 2 up to date one pagers: one in german and one in english
            if (numOfUpToDateFiles < 2) {
                listOfPeopleWithoutUpToDateOnePagers.push(folders[i].name);
            }

            break;
        }
        
        log(`${listOfPeopleWithoutUpToDateOnePagers.join("\n")}\nThis are ${listOfPeopleWithoutUpToDateOnePagers.length} People!`);
        // log(`This are ${listOfPeopleWithoutUpToDateOnePagers.length} People!`);

    } catch (e) {
        log(e);
    }

    console.timeEnd('ProgramRunTime');
}


// comment out when deployed
run();

// get elements via drives:
// https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/drives/b!1PlcT8K070KmOAfCbJJ6-9SE0avLYEhEngiiHtTIc6xIV7aRHj02SpZSBuKBbYs1/root:/Aaron_Sirup_1338:/children
