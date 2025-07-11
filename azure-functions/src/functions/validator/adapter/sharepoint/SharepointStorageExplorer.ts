import { Client, GraphError } from '@microsoft/microsoft-graph-client';
import { Logger, StorageExplorer, StorageFile, StorageFolder, stringToDate } from '../../DomainTypes';
import { Drive, DriveItem, Site } from '@microsoft/microsoft-graph-types';
import { HardenedFetch } from 'hardened-fetch';
import NodeCache from 'node-cache';

type DriveItemWithDownloadUrl = DriveItem & {
    '@microsoft.graph.downloadUrl'?: string;
};

const cache = new NodeCache({
    stdTTL: 10 * 60, // 10 minutes
    useClones: false,
});

export class SharepointStorageExplorer implements StorageExplorer {
    private readonly client: Client;
    private readonly driveId: string;
    private readonly logger: Logger;
    private readonly useCaching: boolean;

    private constructor(client: Client, driveId: string, logger: Logger, useCaching: boolean = true) {
        this.client = client;
        this.driveId = driveId;
        this.logger = logger;
        this.useCaching = useCaching;
    }

    public static async getInstance(
        client: Client,
        siteAlias: string,
        listName: string,
        logger: Logger = console,
        useCaching: boolean = true
    ): Promise<SharepointStorageExplorer> {
        if (useCaching && cache.has('sharepointStorageDriveID')) {
            return new SharepointStorageExplorer(client, cache.get<string>('sharepointStorageDriveID') as string, logger, useCaching);
        }

        const site = (await client.api(`/sites/${siteAlias}`).get()) as Site | undefined;
        if (!site || !site.id) {
            throw new Error(`Cannot find site with alias ${siteAlias}!`);
        }

        const [{ id: driveId }] = (await client.api(`/sites/${site.id}/drives`).get()).value.filter(
            (drive: { name: string }) => drive.name === listName
        ) as Drive[];

        if (!driveId) {
            throw new Error(`Cannot find drive with name ${listName} in site ${siteAlias}!`);
        }

        cache.set<string>('sharepointStorageDriveID', driveId);

        return new SharepointStorageExplorer(client, driveId, logger, useCaching);
    }

    async createFolder(folder: string): Promise<void> {
        await this.client.api(`/drives/${this.driveId}/items/root/children`).post({
            'name': folder,
            'folder': {},
            '@microsoft.graph.conflictBehavior': 'Replace',
        });
    }

    private async folderExists(folder: string): Promise<boolean> {
        try {
            const resp = await this.client.api(`/drives/${this.driveId}/root:/${folder}`).get();
            this.logger.log(
                `Folder "${folder}" exists in SharePoint drive with ID "${this.driveId}"!: ${JSON.stringify(resp)}`
            );
            return true;
        } catch (error) {
            this.silenceNotFound(error);
            return false;
        }
    }

    private async silenceNotFound(error: unknown) {
        if (!(error instanceof GraphError && error.code === 'itemNotFound')) {
            this.logger.log(`Throwing ${JSON.stringify(error)}`);
            throw error;
        }
    }

    async createFile(folder: string, name: string, content: Buffer): Promise<void> {
        if (!(await this.folderExists(folder))) {
            throw new Error(
                `Folder "${folder}" does not exist in SharePoint drive with ID "${this.driveId}"!`
            );
        }
        await this.client
            .api(`/drives/${this.driveId}/items/root:/${folder}/${name}:/content`)
            .put(content);
    }

    async listFolders(): Promise<string[]> {
        return (await this.listFoldersWithURLs()).map(folder => folder.name);
    }

    async listFiles(folder: string): Promise<StorageFile[]> {
        // load contents of one pager folder
        const resource = `/drives/${this.driveId}/root:/${folder}:/children`;
        let folderContents;

        try {
            folderContents = (
                (await this.client.api(resource).get()) as {
                    value?: DriveItemWithDownloadUrl[];
                }
            ).value;
        } catch (error) {
            this.silenceNotFound(error);
            this.logger.warn(
                `Folder "${folder}" does not exist in SharePoint drive with ID "${this.driveId}"!`
            );
            return [];
        }

        if (folderContents === undefined) {
            return [];
        }

        return folderContents.flatMap(item => {
            if (
                !item.lastModifiedDateTime ||
                !item.name ||
                !item.file ||
                !item['@microsoft.graph.downloadUrl']
            ) {
                this.logger.log(`Skipping non one-pager drive item: ${JSON.stringify(item)}`);
                return [];
            }

            return [
                {
                    name: item.name,
                    lastModified: stringToDate(item.lastModifiedDateTime) as Date,
                    data: fetchUrl(item['@microsoft.graph.downloadUrl'], this.logger),
                    url: item.webUrl ? new URL(item.webUrl) : undefined,
                },
            ];
        });
    }

    async listFoldersWithURLs(): Promise<StorageFolder[]> {
        // if (this.useCaching && cache.has(`/drives/${this.driveId}/root/children`)) {
        //     return cache.get<StorageFolder[]>(`/drives/${this.driveId}/root/children`) as StorageFolder[];
        // }

        const { value: folders } = (await this.client
            .api(`/drives/${this.driveId}/root/children`)
            .top(100000)
            .get()) as {
            value?: DriveItem[];
        };

        if (folders === undefined) {
            throw new Error(
                `Could not fetch folders of SharePoint drive with ID "${this.driveId}"!`
            );
        }
        const storageFolders: StorageFolder[] = folders.flatMap(f => f.name ? [{name: f.name, webLocation: f.webUrl ? new URL(f.webUrl) : undefined} as StorageFolder] : []);
        // cache.set<StorageFolder[]>(`/drives/${this.driveId}/root/children`, storageFolders);

        return storageFolders;
    }
}

const client = new HardenedFetch({
    maxConcurrency: 1,
    // Retry options
    maxRetries: 3,
    doNotRetry: [400, 401, 403, 404, 422, 451],
    // Rate limit options
    rateLimitHeader: 'retry-after',
    resetFormat: 'seconds',
});

const fetchUrl = (url: string, logger: Logger) => async () => {
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
};
