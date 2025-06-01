import { readFile } from "fs/promises";
import { Logger } from "./DomainTypes";

export async function fetchOnePagerContent(log: Logger, onePager: { location: URL }): Promise<Buffer> {
    if (onePager.location.protocol === 'file:') {
        let filePath = onePager.location.pathname;
        filePath = decodeURIComponent(filePath);
        const fsPath = filePath.startsWith('//') ? filePath.slice(1) : process.cwd() + filePath;
        log.log(`Reading file from path: ${fsPath}`);
        return await readFile(fsPath);
    } else {
        // HTTP(S) fetch
        const url = onePager.location.toString();
        log.log(`Fetching file from URL: ${url}`);
        const response = await fetch(url);
        if(!response.ok) {
            throw new Error(`failed to fetch ${url}, returned with status ${response.status}: ${await response.text()}`)
        }
        return Buffer.from(await response.arrayBuffer());
    }
}
