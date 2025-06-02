import { readFile } from "fs/promises";
import { Logger } from "./DomainTypes";
import { HardenedFetch } from "hardened-fetch";

export async function fetchOnePagerContent(log: Logger, onePager: { fileLocation: URL }): Promise<Buffer> {
    if (onePager.fileLocation.protocol === 'file:') {
        let filePath = onePager.fileLocation.pathname;
        filePath = decodeURIComponent(filePath);
        const fsPath = filePath.startsWith('//') ? filePath.slice(1) : process.cwd() + filePath;
        log.log(`(fetcher.ts: fetchOnePagerContent) Reading file from path: ${fsPath}`);
        return await readFile(fsPath);
    } else {
        const client = new HardenedFetch({
            // Retry options
            maxRetries: 3,
            doNotRetry: [400, 401, 403, 404, 422, 451],
            // Rate limit options
            rateLimitHeader: 'retry-after',
            resetFormat: 'seconds',
        });
        // HTTP(S) fetch
        const url = onePager.fileLocation.toString();
   
        log.log(`(fetcher.ts: fetchOnePagerContent) Fetching file from URL: ${url}`);
        const response = await client.fetch(url);
        if (response.status !== 200) {
            throw new Error(`failed to fetch ${url}, returned with status ${response.status}: ${await response.text()}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        log.log(`Successfully fetched file with status ${response.status}, size: ${buffer.length} bytes`);
        return buffer;
    }
}
