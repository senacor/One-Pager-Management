import { readFile } from "fs/promises";

export async function fetchOnePagerContent(onePager: { location: URL }): Promise<Buffer> {
    if (onePager.location.protocol === 'file:') {
        let filePath = onePager.location.pathname;
        filePath = decodeURIComponent(filePath);
        const fsPath = filePath.startsWith('//') ? filePath.slice(1) : process.cwd() + filePath;
        console.log(`Reading file from path: ${fsPath}`);
        return await readFile(fsPath);
    } else {
        // HTTP(S) fetch
        const response = await fetch(onePager.location.toString());
        return Buffer.from(await response.arrayBuffer());
    }
}
