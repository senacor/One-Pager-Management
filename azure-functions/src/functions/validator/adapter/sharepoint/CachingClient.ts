import { Client, GraphRequest } from "@microsoft/microsoft-graph-client";
import NodeCache from "node-cache";


export type SharepointClient = {
    api(path: string): GraphRequest
}

export class CachingClient {
    private readonly cache = new NodeCache({
        stdTTL: 60 * 5,
        checkperiod: 60,
        useClones: false,
        maxKeys: 5000
    });
    private readonly client: SharepointClient;

    constructor(client: SharepointClient) {
        this.client = client;
    }

    api(path: string): GraphRequest {
        const req = this.client.api(path);
        const original = req.get

        req.get = async () => {
            const url = (req as any).buildFullUrl()
            const cached = this.cache.get(url)
            if (cached) {
                return cached;
            }
            var resp = await original()
            if (resp) {
                this.cache.set(url, resp)
            }
            return resp;
        };


        return req;
    }
}
