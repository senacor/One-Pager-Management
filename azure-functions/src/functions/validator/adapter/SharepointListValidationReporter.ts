import { Client } from "@microsoft/microsoft-graph-client";
import { EmployeeID, ValidationError, ValidationReporter } from "../DomainTypes";
import { List } from "@microsoft/microsoft-graph-types";

export class SharepointListValidationReporter implements ValidationReporter {
  readonly listDisplayName: string;
  readonly client: Client;
  private _listId: string | undefined;

  constructor(client: Client, listDisplayName: string) {
    this.client = client;
    this.listDisplayName = listDisplayName;
  }

  reportValid(id: EmployeeID): Promise<void> {
    throw new Error("Method not implemented.");
  }

  reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void> {
    throw new Error("Method not implemented.");
  }

  getResultFor(id: EmployeeID): Promise<ValidationError[]> {
    throw new Error("Method not implemented.");
  }

  private async getListId(): Promise<string> {
    if(this._listId) {
      this._listId;
    }

//   //const resp = await client.api(`/sites/${maInfoSiteId}/lists/${statusListId}`).expand("columns").get();
//   // const resp = await client.api(`/sites/${maInfoSiteId}/lists/${statusListId}/items`).post({
//   //   fields: {
//   //     "Mitarbeiter": "Daniel Heinrich",
//   //     "ValidOnePager": true,
//   //     "Errors": "none\nnothing"
//   //   }
//   // });
//   // const danielEntry = ((await client.api(`/sites/${maInfoSiteId}/lists/${statusListId}/items`).filter("fields/Mitarbeiter eq 'Daniel Heinrich'").get()) as { value: ListItem[] }).value[0].id;

    const maInfoSiteId = (await this.client.api(`/sites/senacor.sharepoint.com:/teams/MaInfoTest`).get()).id;
    this._listId = ((await this.client.api(`/sites/${maInfoSiteId}/lists`).get()) as { value: List[] }).value
      .filter(list => list.displayName === this.listDisplayName)[0].id;

    if(this._listId ) {
      return this._listId;
    } else {
      throw new Error(`List with display name ${this.listDisplayName} not found.`);
    }
  }
}
