import { Context, Middleware } from "@microsoft/microsoft-graph-client";
import NodeCache from "node-cache";

export const FORCE_REFRESH = { "cache-control": "max-age=0" };

type CacheEntry = {
    body: ArrayBuffer,
    headers: Headers
};

/**
 * CachingHandler is a middleware for caching HTTP responses in a Node.js environment.
 */
export class CachingHandler implements Middleware {

    private readonly cache = new NodeCache({
        stdTTL: 60 * 5,
        checkperiod: 60,
        useClones: false,
        forceString: false,
        maxKeys: 5000
    });
    private nextMiddleware?: Middleware;

    /**
     * Executes the caching logic for HTTP requests.
     * It checks if the response is cached and returns it if available.
     * If not cached, it calls the next middleware in the chain to fetch the response.
     * @param context The context containing the request and options.
     */
    async execute(context: Context): Promise<void> {
        const [url, method, headers] = typeof context.request === "string" ?
            [context.request, context.options?.method, context.options?.headers] :
            [context.request.url, context.request.method, context.request.headers];

        const cacheControl = new Headers(headers).get("cache-control")
        let maxAge: number | undefined;
        if (cacheControl) {
            if (cacheControl === "clear-all") { // used in tests
                console.info("(CachingHandler.ts: execute) clearing full http cache")
                this.cache.flushAll();
            }
            maxAge = cacheControl.split(',').reduce((ttl, v) => {
                const parts = v.trim().split('=');
                return parts[0] === 'max-age' ? parseInt(parts[1]) : ttl;
            }, undefined as undefined | number)
        }

        // a max-age of zero indicates that the data should be force refreshed
        // we never are using max-age=0 only sometimes for the same url, we therefor never need to cache these calls
        const canCache = method === "GET" && (maxAge !== 0);

        if (canCache) {
            if (maxAge) {
                console.info(`(CachingHandler.ts: execute) resetting ttls of cache entry "${url}" to ${maxAge}`)
                this.cache.ttl(url, maxAge); // a ttl of 0 has the meaning of infinity for node-cache
            }
            const entry = this.cache.get<CacheEntry>(url);
            if (entry) {
                console.info(`(CachingHandler.ts: execute) using cache entry for "${url}" to ${maxAge}`)
                context.response = new Response(entry?.body, { status: 200, headers: entry?.headers });
                return;
            }
        }

        if (!this.nextMiddleware) {
            throw new Error("(CachingHandler.ts: execute) CachingHandler expects a child middleware, it can not provide a response on it own!");
        }

        await this.nextMiddleware.execute(context)
        if (canCache && context.response?.status === 200) {
            const body = await context.response.arrayBuffer();
            this.cache.set<CacheEntry>(url, { body, headers: context.response.headers });
            context.response = new Response(body, { status: context.response?.status, headers: context.response?.headers });
        }
    }

    /**
     * Sets the next middleware in the chain.
     * @param middleware The next middleware to set.
     */
    setNext(middleware: Middleware) {
        this.nextMiddleware = middleware;
    }
}
