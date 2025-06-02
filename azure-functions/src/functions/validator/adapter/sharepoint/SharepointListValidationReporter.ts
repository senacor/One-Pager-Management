import { Client } from "@microsoft/microsoft-graph-client";
import { List, ListItem, Site } from "@microsoft/microsoft-graph-types";
import { FORCE_REFRESH } from "../../../configuration/CachingHandler";
import { EmployeeID, OnePager, ValidationError, ValidationReporter } from "../../DomainTypes";

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
        const maInfoSite = await client.api(`/sites/${siteAlias}`).get() as Site | undefined;
        if (!maInfoSite || !maInfoSite.id) {
            throw new Error(`(SharepointListValidationReporter.ts: getInstance) Cannot find site with alias "${siteAlias}" !`);
        }

        const { value: lists } = await client.api(`/sites/${maInfoSite.id}/lists`).get() as { value?: List[] }
        if (!lists) {
            throw new Error(`(SharepointListValidationReporter.ts: getInstance) Cannot fetch lists for site with alias "${siteAlias}" !`);
        }

        const [{ id: listId }] = lists.filter(list => list.displayName === listDisplayName);
        if (!listId) {
            throw new Error(`(SharepointListValidationReporter.ts: getInstance) Cannot find list with name "${listDisplayName}" on site "${siteAlias}" !`);
        }
        return new SharepointListValidationReporter(client, listId, maInfoSite.id);
    }

    async reportValid(id: EmployeeID): Promise<void> {
        let itemId = await this.getItemIdOfEmployee(id);

        if (itemId !== undefined) {
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`).delete();
        }
    }

    async reportErrors(id: EmployeeID, onePager: OnePager | undefined, errors: ValidationError[]): Promise<void> {
        let itemId = await this.getItemIdOfEmployee(id);

        const onePagerUrl = onePager?.webLocation ? onePager.webLocation.toString() : "";
        if (itemId === undefined) {
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).post({
                fields: {
                    "MitarbeiterID": id,
                    "Festgestellte_Fehler": errors.join("\n"),
                    "Location": onePagerUrl,
                }
            });
        } else {
            await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}/fields`).patch({
                "Festgestellte_Fehler": errors.join("\n"),
                "Location": onePagerUrl,
            });
        }
    }

    async getResultFor(id: EmployeeID): Promise<ValidationError[]> {
        let itemId = await this.getItemIdOfEmployee(id);

        if (!itemId) {
            return [];
        }

        let item = await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${itemId}`).headers(FORCE_REFRESH).select("fields").get() as ListItem;
        if (!item.fields) {
            return [];
        } else {
            //TODO: runtime type check
            return (item.fields as { [key: string]: string })["Festgestellte_Fehler"].split("\n") as ValidationError[];
        }
    }

    private async getItemIdOfEmployee(id: EmployeeID): Promise<string | undefined> {
        const { value: entries } = await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).headers(FORCE_REFRESH).filter("fields/MitarbeiterID eq '" + id + "'").get() as { value?: ListItem[] };
        const [entry] = entries || [];
        return entry?.id;

    }

    async clearList(): Promise<void> {
        let { value: items } = await this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items`).headers(FORCE_REFRESH).get() as { value?: ListItem[] };

        if (items) {
            await Promise.all(items.map(item =>
                this.client.api(`/sites/${this.siteId}/lists/${this.listId}/items/${item.id}`).delete()
            ));
        }
    }
}
