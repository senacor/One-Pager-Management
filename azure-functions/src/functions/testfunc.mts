import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";

import { ClientSecretCredential } from "@azure/identity";
// import { AzureIdentityAuthenticationProvider } from "@microsoft/kiota-authentication-azure";
// import { createGraphServiceClient, GraphRequestAdapter, GraphServiceClient } from "@microsoft/msgraph-sdk";
// import "@microsoft/msgraph-sdk-users";
// import "@microsoft/msgraph-sdk-sites";
// import "@microsoft/msgraph-sdk-teams";
// import "@microsoft/msgraph-sdk-filteroperators";
// es gibt viele msgraph-sdk-* Packete als Unterpackete, welche die Funktionen der Elemente aus @microsoft/msgraph-sdk erweitern - abhängig davon, was man braucht.
// see https://github.com/microsoftgraph/msgraph-sdk-typescript/tree/main/packages



// andere Möglichkeit für die Verwendung von Graph-API: Packet @microsoft/microsoft-graph-client muss neu installiert werden.
// dieses ist die Legancy-Bibliothek, die zum Großteil deprecated ist und vom obigen Weg abgelöst wird.
// andererseits gibt es kaum Doku zur aktuellen Methode.
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
    const client = Client.initWithMiddleware({
        debugLogging: true,
        authProvider,
    });

    // console.log(await client.api("/sites/senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e/lists/c70c37c3-6fe6-4316-bb79-6c535e774478/items").get())
    // log(
    //     await client.api("/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/lists/91b65748-3d1e-4a36-9652-06e2816d8b35/items").get());

    // const authProvider: AzureIdentityAuthenticationProvider = new AzureIdentityAuthenticationProvider(credential, ["https://graph.microsoft.com/.default"]);

    

    // log('Auth Provider initialized!');

    // log("Token:", await credential.getToken(['https://graph.microsoft.com/.default']));

    // const requestAdapter: GraphRequestAdapter = new GraphRequestAdapter(authProvider); // this creates an output
    // log('requestAdapter initliazed!');
    // const graphServiceClient: GraphServiceClient = createGraphServiceClient(requestAdapter);
    // log("graphServiceClient initialitzed!");

    try {
        
        // let MaInfoID = (await graphServiceClient.withUrl("https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com:/sites/MaInfo/"));
        
        const URL_Prefix = "https://graph.microsoft.com/v1.0/sites/";

        // -- One-Pager-Test-Folder (MaInfoTest): --
        // https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/lists/91b65748-3d1e-4a36-9652-06e2816d8b35/items
        // siteURL yields siteID: "senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac";

        // let siteIDAlias: string = "senacor.sharepoint.com:/teams/MaInfoTest";
        // let listID: string = "91b65748-3d1e-4a36-9652-06e2816d8b35";
        // let parentFolderReference: Array<string> = [
        //     "88295fd0-63b5-45c7-bac0-600799919914"
        // ]; // TODO: herausfinden, wie man diese automatisch bekommt
        

        // -- real One-Pager-Folder (MaInfo): --
        // real MAInfo: https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e/lists/c70c37c3-6fe6-4316-bb79-6c535e774478/items
        // siteURL yields siteID: "senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e"
        
        let siteIDAlias: string = "senacor.sharepoint.com:/sites/MaInfo/";
        let listID = "c70c37c3-6fe6-4316-bb79-6c535e774478";
        let parentFolderReferences: Array<string> = [
            "d496d5a9-1ef4-4388-afbe-b54f8fdba5a5",

        ];


        // let siteID: string = (await graphServiceClient.sites.bySiteId(siteIDAlias).get()).id;

        // let siteID: string = (await graphServiceClient.withUrl(URL_Prefix + siteIDAlias).sites.get()).additionalData.id as string;
        let siteID: string = (await client.api("/sites/" + siteIDAlias).get()).id as string;
        log("siteID", siteID);

        // Get all items.
        let onePagerFoldersQuery = client.api(`/sites/${siteID}/lists/${listID}/items`).top(100000); // top 100000 means that we take a maximum of 100000 entries
        // let onePagerFoldersQuery = graphServiceClient.sites.bySiteId(siteID)
        //     .lists.byListId(listID).items;


        // In this variable, there are all folders, documents and subfolders (all elements that can be found recoursively)
        let onePagerItems = await onePagerFoldersQuery.get();

        log("Number of OnePagerItems:", onePagerItems.value.length);
        
        // get all elements that are directly in 01_OnePager by checking if the parentID matches that of 01_OnePager
        let onePagerFolders = onePagerItems.value.filter((el) => {
            return parentFolderReferences.includes(el.parentReference.id);
        });

        log("Number of folders directly in 01_OnePager:", onePagerFolders.length);

        let curDate: number = Date.now();
        let listOfPeopleWithoutUpToDateOnePagers: Array<string> = [];

        for (let i = 0; i < onePagerFolders.length; ++i) {
            // get id of folder
            // they are saved as eTags in the following form: '"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx,d"' where x are [0-9a-z] and d is a digit [0-9]
            let folderID: string = onePagerFolders[i].eTag.replace(/\"/g, "").split(",")[0];
            let numOfUpToDateFiles: number = 0;
            for (let j = 0; j < onePagerItems.value.length; ++j) {
                if (onePagerItems.value[j].parentReference.id != folderID) {
                    continue;
                }
                if (onePagerItems.value[j].contentType.name === "Ordner") {
                    // TODO: There is a file directly in 01_OnePager, so do something
                    continue;
                }
                // check File
                // get dateTime; lastModifiedDateTime is of the form "2025-05-23T08:20:10Z"
                let lastModifiedDateTime: Date = new Date(onePagerItems.value[j].lastModifiedDateTime);
                
                // calc time diff in milliseconds and convert it to days by deviding by 24 hours * 60 minutes * 60 seconds * 1000 millisenconds
                let dateDiffInDays: number = Math.floor((curDate - lastModifiedDateTime.getTime())/(24*3600000)); 
                    
                // if file is younder than half a year (183 days)
                if (dateDiffInDays < 183) {
                    numOfUpToDateFiles++;
                }
            }

            // everyone needs at least 2 up to date one pagers: one in german and one in english
            if (numOfUpToDateFiles < 2) {
                listOfPeopleWithoutUpToDateOnePagers.push(onePagerFolders[i].webUrl.split("/").pop());
            }
            // log(onePagerFolders[i]);
        }
        
        log(`${listOfPeopleWithoutUpToDateOnePagers.join("\n")}\nThis are ${listOfPeopleWithoutUpToDateOnePagers.length} People!`);
        // log(`This are ${listOfPeopleWithoutUpToDateOnePagers.length} People!`);
        // log(onePagerItems);

    } catch (e) {
        log(e);
    }

    console.timeEnd('ProgramRunTime');
}

// https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/drives/b!1PlcT8K070KmOAfCbJJ6-9SE0avLYEhEngiiHtTIc6xIV7aRHj02SpZSBuKBbYs1/root:/Aaron_Sirup_1338:/children

// comment out when deployed
run();