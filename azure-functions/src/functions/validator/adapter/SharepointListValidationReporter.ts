import { Client } from "@microsoft/microsoft-graph-client";
import { EmployeeID, ValidationError, ValidationReporter } from "../DomainTypes";
import { List, ListItem } from "@microsoft/microsoft-graph-types";

export class SharepointListValidationReporter implements ValidationReporter {
    private readonly listId: string;
    private readonly client: Client;
    private readonly siteId: string;

    constructor(client: Client, listId: string, siteId: string) {
        this.client = client;
        this.listId = listId;
        this.siteId = siteId;
    }

    public static async getInstance(client: Client, siteAlias: string, listDisplayName: string) {
        const maInfoSiteId = (await client.api(`/sites/${siteAlias}`).get()).id;
        const listId = ((await client.api(`/sites/${maInfoSiteId}/lists`).get()) as { value: List[] }).value
                .filter(list => list.displayName === listDisplayName)[0].id;
        if (!listId) {
            throw new Error(`Cannot find list with name ${listDisplayName} on site ${siteAlias}!`);
        }
        return new SharepointListValidationReporter(client, listId, maInfoSiteId);
    }

    async reportValid(id: EmployeeID): Promise<void> {
        let itemId = await this.getItemIdOfEmployee(id);

        if (itemId !== undefined) {
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`).delete();
        }
    }

    async reportErrors(id: EmployeeID, name: string, errors: ValidationError[]): Promise<void> {
        let itemId = await this.getItemIdOfEmployee(id);

        if (itemId === undefined) {
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
                fields: {
                    "MitarbeiterID": id,
                    "Festgestellte_Fehler": errors.join("\n")
                }
            });
        } else {
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}/fields`).patch({
                "Festgestellte_Fehler": errors.join("\n")
            });
        }
    }

    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
        let itemId = await this.getItemIdOfEmployee(id);

        if (!itemId) {
            return [];
        }

        let item: ListItem = await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`).select("fields").get() as ListItem;
        if (!item.fields) {
            return [];
        } else {
            //TODO: runtime type check
            return (item.fields as {[key: string]: string})["Festgestellte_Fehler"].split("\n") as ValidationError[];
        }
    }

    private async getItemIdOfEmployee(id: EmployeeID): Promise<string | undefined> {

        const entries = ((await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).filter("fields/MitarbeiterID eq '" + id + "'").get()) as { value: ListItem[] }).value;


        if (entries.length === 1) {
            return entries[0].id;
        }

        return undefined;

    }

    async clearList(): Promise<void> {
        let items = await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).get() as {value: ListItem[]};

        let promiseList = [];
        for (let item of items.value) {
            promiseList.push(this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${item.id}`).delete());
        }

        await Promise.all(promiseList);
    }
}
