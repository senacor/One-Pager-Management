import { Volume } from 'memfs';
import { FileSystem } from '../FileSystemStorageExplorer';
import { FsPromisesApi } from 'memfs/lib/node/types';

export class MemoryFileSystem implements FileSystem {
    private readonly volume: FsPromisesApi = new Volume().promises;

    readdir(path: string) {
        return this.volume.readdir(path) as Promise<string[]>;
    }
    mkdtemp(prefix: string) {
        return this.volume.mkdtemp(prefix) as Promise<string>;
    }
    mkdir(path: string) {
        return this.volume.mkdir(path);
    }
    writeFile(path: string, data: Buffer) {
        return this.volume.writeFile(path, data);
    }
    readFile(path: string) {
        return this.volume.readFile(path).then(data => {
            return typeof data === 'string' ? Buffer.from(data) : data;
        });
    }
}
