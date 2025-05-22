
import { ClientSecretCredential } from "@azure/identity";
import { AzureIdentityAuthenticationProvider } from "@microsoft/kiota-authentication-azure";
import { createGraphServiceClient, GraphRequestAdapter } from "@microsoft/msgraph-sdk";
// import "@microsoft/msgraph-sdk-users";
import "@microsoft/msgraph-sdk-sites";
// es gibt viele msgraph-sdk-* Packete als Unterpackete, welche die Funktionen der Elemente aus @microsoft/msgraph-sdk erweitern - abhängig davon, was man braucht.
// see https://github.com/microsoftgraph/msgraph-sdk-typescript/tree/main/packages
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider.js";
import { Client } from "@microsoft/microsoft-graph-client";

import { app, HttpRequest, HttpResponseInit, InvocationContext, output } from "@azure/functions";

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
    log('Starting!');

    const credential = new ClientSecretCredential(
        process.env.MSTenantID,
        process.env.MSClientID,
        process.env.MSClientSecret,
        );

    log("Credentials initialized")

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
    });

    log((await credential.getToken(['https://graph.microsoft.com/.default'])));


    const client = Client.initWithMiddleware({
        debugLogging: true,
        authProvider,
    });

    // console.log(await client.api("/sites/senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e/lists/c70c37c3-6fe6-4316-bb79-6c535e774478/items").get())
    log(
        await client.api("/sites/senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac/lists/91b65748-3d1e-4a36-9652-06e2816d8b35/items").get());

    // // const authProvider = new AzureIdentityAuthenticationProvider(credential, ["https://graph.microsoft.com/.default"]);



    // log('Auth Provider initialized!');

    // const requestAdapter = new GraphRequestAdapter(authProvider); // this creates an output
    // log('requestAdapter initliazed!');
    // const graphServiceClient = createGraphServiceClient(requestAdapter);
    // log("graphServiceClient initialitzed!");

    // try {
    //     // Es gibt keinen Token:
    //     authProvider.accessTokenProvider.getAuthorizationToken().then((mess) => {
    //         log("ok", mess)
    //     }).catch((err) => {
    //         console.log("Error", err);
    //     }).finally(() => {
    //         console.log("Finished!")
    //     });

    //     let result = await graphServiceClient.sites.bySiteId("senacor.sharepoint.com,4f5cf9d4-b4c2-42ef-a638-07c26c927afb,abd184d4-60cb-4448-9e08-a21ed4c873ac")
    //         .lists.byListId("91b65748-3d1e-4a36-9652-06e2816d8b35").items
    //         .get();

        

    //         // .then((done) => {
    //         //     log(done);
    //         //     log("Worked!");
    //         // }).catch((err) => {
    //         //     log(err);
    //         //     log("Error!");
    //         // }).finally(() => {
    //         //     log("finished");
    //         // });
    //     log(result);
    // } catch (e) {
    //     log(e);

    // }


        // graphServiceClient.me.get().then((done) => {
    //     console.log(done);
    // }).catch((err) => {
    //     console.error(err);
    // });

    // graphServiceClient.withUrl("https://graph.microsoft.com/v1.0/me").me.get()
    //     .then((done) => {
    //         console.log(done);
    //         console.log("Worked!");
    //     }).catch((err) => {
    //         console.error(err);
    //         console.log("Error!");
    //     });

    // real MAInfo: https://graph.microsoft.com/v1.0/sites/senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e/lists/c70c37c3-6fe6-4316-bb79-6c535e774478/items
    // graphServiceClient.sites.bySiteId("senacor.sharepoint.com,72337cf1-cf56-4998-aa64-52a47efdbf6e,f247cc86-41ce-4e54-895f-61d07d03751e").lists.get()

}

run();