import { readFile } from 'fs/promises';
import { Logger } from './DomainTypes';
import { HardenedFetch } from 'hardened-fetch';

/**
 * An auxiliary function to fetch the content of a OnePager file.
 * @param logger The logger to use for logging messages.
 * @param onePager The OnePager to fetch.
 * @returns A promise that resolves to the content of the OnePager file as a Buffer.
 */
export async function fetchOnePagerContent(
    logger: Logger,
    onePager: { fileLocation: URL }
): Promise<Buffer> {
    if (onePager.fileLocation.protocol === 'file:') {
        let filePath = onePager.fileLocation.pathname;
        filePath = decodeURIComponent(filePath);
        const fsPath = filePath.startsWith('/') ? filePath.slice(1) : process.cwd() + filePath; // pathname always starts with a slash
        logger.log(`Reading file from path: ${fsPath}`);
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

        logger.log(`Fetching file from URL: ${url}`);
        const response = await client.fetch(url);
        if (response.status !== 200) {
            throw new Error(
                `Failed to fetch "${url}"! It returned with status "${response.status}": "${await response.text()}"!`
            );
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        logger.log(
            `Successfully fetched file with status ${response.status}, size: ${buffer.length} bytes!`
        );
        return buffer;
    }
}
