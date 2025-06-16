import { Logger, StorageExplorer, StorageFile } from '../DomainTypes';
import { promises as pfs } from 'fs';

export interface FileSystem {
    readdir(path: string): Promise<string[]>;
    mkdir(path: string): Promise<unknown>;
    writeFile(path: string, content: Buffer): Promise<void>;
    readFile(path: string): Promise<Buffer>;
}

export class FileSystemStorageExplorer implements StorageExplorer {
    private readonly baseDir: string;
    private readonly fs: FileSystem;
    private readonly logger: Logger;

    constructor(baseDir: string, fs: FileSystem = pfs, logger: Logger = console) {
        this.baseDir = baseDir;
        this.fs = fs;
        this.logger = logger;
    }

    async createFolder(folder: string): Promise<void> {
        try {
            await this.fs.mkdir(`${this.baseDir}/${folder}`);
        } catch (error) {
            this.silenceError(error, 'EEXIST'); // we ignore that the folder already exists, beacause we want to be indempotent
        }
    }

    private silenceError(error: unknown, code: string) {
        const isError =
            Boolean(error) &&
            typeof error === 'object' &&
            (error as Record<string, unknown>).code === code;
        if (!isError) {
            throw error;
        }
    }

    listFolders(): Promise<string[]> {
        return this.fs.readdir(this.baseDir);
    }

    createFile(folder: string, name: string, content: Buffer): Promise<void> {
        const filePath = `${this.baseDir}/${folder}/${name}`;
        return this.fs.writeFile(filePath, content);
    }

    async listFiles(folder: string): Promise<StorageFile[]> {
        const folderPath = `${this.baseDir}/${folder}`;

        let files: string[] = [];
        try {
            files = await this.fs.readdir(folderPath);
        } catch (error) {
            this.silenceError(error, 'ENOENT'); // we continue if the folder does not exist, this part of the interface contract
        }

        return files.map(file => {
            const filePath = `${folderPath}/${file}`;
            const urlPath = filePath.split('/').map(encodeURIComponent).join('/');
            const url = new URL(`file:///${urlPath}`);

            return {
                name: file,
                lastModified: this.dateFromOnePagerFile(file),
                data: () => this.fs.readFile(filePath),
                url,
            };
        });
    }

    private dateFromOnePagerFile(file: string): Date {
        const match = file.match(/_(\d{6})\.pptx$/);
        if (!match) {
            this.logger.log(
                `File "${file}" does not match expected one-pager format! Defaulting to current date.`
            );
            return new Date();
        }
        return this.fromYYMMDD(match[1]);
    }

    private fromYYMMDD(yyMMdd: string): Date {
        if (!/^\d{6}$/.test(yyMMdd)) {
            throw new Error(`Invalid yyMMdd date string: "${yyMMdd}"!`);
        }
        const year = Number(yyMMdd.slice(0, 2));
        const month = Number(yyMMdd.slice(2, 4)) - 1; // JS months are 0-based
        const day = Number(yyMMdd.slice(4, 6));
        // Assume 2000-2099 for 2-digit years
        const fullYear = year + 2000;
        return new Date(fullYear, month, day);
    }
}
