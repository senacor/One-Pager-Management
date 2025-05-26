import "isomorphic-fetch"; // or import the fetch polyfill you installed
import { Client } from "@microsoft/microsoft-graph-client";
import { Drive, List, ListItem } from "@microsoft/microsoft-graph-types";
import { ClientSecretCredential, AzureAuthorityHosts } from "@azure/identity";
import { TokenCredentialAuthenticationProvider, TokenCredentialAuthenticationProviderOptions } from "@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials";

type APrefix = `A${string}`

async function main() {
  // Read credentials from environment variables
  const tenantId = process.env["SHAREPOINT_TENANT_ID"];
  const clientId = process.env["SHAREPOINT_CLIENT_ID"];
  const clientSecret = process.env["SHAREPOINT_CLIENT_SECRET"];
  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing SHAREPOINT_TENANT_ID, SHAREPOINT_CLIENT_ID, or SHAREPOINT_CLIENT_SECRET in environment variables.");
  }

  // Create an instance of the TokenCredential class that is imported
  const tokenCredential = new ClientSecretCredential(tenantId, clientId, clientSecret);

  // Set your scopes and options for TokenCredential.getToken (Check the ` interface GetTokenOptions` in (TokenCredential Implementation)[https://github.com/Azure/azure-sdk-for-js/blob/main/sdk/core/core-auth/src/tokenCredential.ts])

  const options: TokenCredentialAuthenticationProviderOptions = { scopes: ["https://graph.microsoft.com/.default"] };

  // Create an instance of the TokenCredentialAuthenticationProvider by passing the tokenCredential instance and options to the constructor
  const authProvider = new TokenCredentialAuthenticationProvider(tokenCredential, options);
  const client = Client.initWithMiddleware({
    debugLogging: true,
    authProvider: authProvider,
  });

  const maInfoSiteId = (await client.api(`/sites/senacor.sharepoint.com:/teams/MaInfoTest`).get()).id;
  const onePagerDriveId = ((await client.api(`/sites/${maInfoSiteId}/drives`).get()) as { value: Drive[] }).value.filter(drive => drive.name === "01_OnePager")[0].id;
  const folders = ((await client.api(`/drives/${onePagerDriveId}/root/children`).select("Name").get()) as { value: { name: string }[] }).value.map(item => item.name);
  const aaron = folders[0]
  const filesOfAaron = (await client.api(`/drives/b!1PlcT8K070KmOAfCbJJ6-9SE0avLYEhEngiiHtTIc6xIV7aRHj02SpZSBuKBbYs1/items/01536CT2QGMCSPDKAXZZA3JRX5X7PYIOWV`).get());
  console.log(JSON.stringify(filesOfAaron, undefined, 2));

  const statusListId = ((await client.api(`/sites/${maInfoSiteId}/lists`).get()) as { value: List[] }).value.filter(list => list.displayName === "onepager-status")[0].id;

  //const resp = await client.api(`/sites/${maInfoSiteId}/lists/${statusListId}`).expand("columns").get();
  // const resp = await client.api(`/sites/${maInfoSiteId}/lists/${statusListId}/items`).post({
  //   fields: {
  //     "Mitarbeiter": "Daniel Heinrich",
  //     "ValidOnePager": true,
  //     "Errors": "none\nnothing"
  //   }
  // });
  // const danielEntry = ((await client.api(`/sites/${maInfoSiteId}/lists/${statusListId}/items`).filter("fields/Mitarbeiter eq 'Daniel Heinrich'").get()) as { value: ListItem[] }).value[0].id;

  // const resp = await client.api(`/sites/${maInfoSiteId}/lists/${statusListId}/items/${danielEntry}/fields`).patch({
  //   "ValidOnePager": false,
  //   "Errors": "everything broken"
  // });
  //console.log(resp);
}

main()
  .then(() => console.log("done"))
  .catch((err) => console.error(err))
  .finally(() => process.exit(0));
