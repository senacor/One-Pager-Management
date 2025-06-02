import { readFile } from "fs/promises";
import { Logger } from "./DomainTypes";

export async function fetchOnePagerContent(log: Logger, onePager: { fileLocation: URL }): Promise<Buffer> {
    if (onePager.fileLocation.protocol === 'file:') {
        let filePath = onePager.fileLocation.pathname;
        filePath = decodeURIComponent(filePath);
        const fsPath = filePath.startsWith('//') ? filePath.slice(1) : process.cwd() + filePath;
        log.log(`Reading file from path: ${fsPath}`);
        return await readFile(fsPath);
    } else {
        // HTTP(S) fetch
        const url = onePager.fileLocation.toString();
        log.log(`Fetching file from URL: ${url}`);
        const response = await fetch(url);
        if(response.status !== 200) {
            throw new Error(`failed to fetch ${url}, returned with status ${response.status}: ${await response.text()}`)
        }
        return Buffer.from(await response.arrayBuffer());
    }
}
