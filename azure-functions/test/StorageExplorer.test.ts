import { StorageExplorer } from '../src/functions/validator/DomainTypes';
import * as fs from 'fs/promises';
import { tmpdir } from 'node:os';
import path from 'path';
import {
    createMSClient,
    hasSharepointClientOptions,
} from '../src/functions/configuration/AppConfiguration';
import { DriveItem } from '@microsoft/microsoft-graph-types';
import { SharepointStorageExplorer } from '../src/functions/validator/adapter/sharepoint/SharepointStorageExplorer';
import { MemoryFileSystem } from '../src/functions/validator/adapter/memory/MemoryFileSystem';
import {
    FileSystem,
    FileSystemStorageExplorer,
} from '../src/functions/validator/adapter/FileSystemStorageExplorer';

type Factory = () => Promise<StorageExplorer>;

const testFactory = (name: string, factory: Factory) => {
    describe(name, () => {
        describe('folders', () => {
            it('should return no folders if empty', async () => {
                const explorer = await factory();

                await expect(explorer.listFolders()).resolves.toEqual([]);
            });

            it('should return created folders', async () => {
                const explorer = await factory();

                const folders = ['foo', 'bar', 'baz'];
                await Promise.all(folders.map(folder => explorer.createFolder(folder)));

                const readFolders = await explorer.listFolders();
                expect(readFolders.sort()).toEqual(folders.sort());
            });

            it('should created folder indempotently', async () => {
                const explorer = await factory();
                await explorer.createFolder('foo');

                await explorer.createFolder('foo');

                const readFolders = await explorer.listFolders();
                expect(readFolders).toEqual(['foo']);
            });

            it('should created folder indempotently (check files)', async () => {
                const explorer = await factory();
                await explorer.createFolder('foo');
                await explorer.createFile('foo', 'test.txt', Buffer.from('Hello World'));

                await explorer.createFolder('foo');

                const [{ name }] = await explorer.listFiles('foo');
                expect(name).toEqual('test.txt');
            });
        });

        describe('files', () => {
            it('should return no files in empty folder', async () => {
                const explorer = await factory();
                await explorer.createFolder('foo');

                const readFiles = await explorer.listFiles('foo');

                expect(readFiles).toEqual([]);
            });

            it('should return no files for non existing folder', async () => {
                const explorer = await factory();

                const readFiles = await explorer.listFiles('non-existing');

                expect(readFiles).toEqual([]);
            });

            it('should return created file', async () => {
                const explorer = await factory();
                await explorer.createFolder('foo');

                await explorer.createFile('foo', 'test.txt', Buffer.from('Hello World'));

                const [file] = await explorer.listFiles('foo');
                expect(file).toEqual({
                    name: 'test.txt',
                    lastModified: expect.any(Date),
                    data: expect.any(Function),
                    url: expect.any(URL),
                });
            });

            it('should store data in created file', async () => {
                const explorer = await factory();
                await explorer.createFolder('foo');

                await explorer.createFile('foo', 'test.txt', Buffer.from('Hello World'));

                const [file] = await explorer.listFiles('foo');
                const data = await file.data();
                expect(data.toString()).toBe('Hello World');
            });

            it('should store data in created file', async () => {
                const explorer = await factory();
                await explorer.createFolder('foo');
                await explorer.createFile('foo', 'test.txt', Buffer.from('Hello World'));

                await explorer.createFile('foo', 'test.txt', Buffer.from('By World!'));

                const [file] = await explorer.listFiles('foo');
                const data = await file.data();
                expect(data.toString()).toBe('By World!');
            });

            it('should fail file creation if folder does not exist', async () => {
                const explorer = await factory();

                const creation = explorer.createFile(
                    'nonexistent',
                    'test.txt',
                    Buffer.from('Hello World')
                );

                await expect(creation).rejects.toThrow();
            });
        });
    });
};

type TestFileSystem = FileSystem & {
    mkdtemp: (prefix: string) => Promise<string>;
    tmpdir: () => string;
};

class TestMemFileSystem extends MemoryFileSystem implements TestFileSystem {
    tmpdir() {
        return '/';
    }
}

const LocalFileSystem: TestFileSystem = {
    ...fs,
    tmpdir,
};

const fileSystems: [string, TestFileSystem][] = [
    ['local', LocalFileSystem],
    ['mem', new TestMemFileSystem()],
];

fileSystems.forEach(([type, fileSystem]) => {
    testFactory(`FileSystemStorageExplorer(${type})`, async () => {
        const tmp = await fileSystem.mkdtemp(path.join(fileSystem.tmpdir(), 'storage-explorer-'));
        console.log(`Created temporary directory in ${type} fs: ${tmp}`);

        return new FileSystemStorageExplorer(tmp, fileSystem);
    });
});

const opts = process.env;
if (hasSharepointClientOptions(opts)) {
    testFactory('SharepointDriveOnePagerRepository', async () => {
        const siteIDAlias: string = 'senacor.sharepoint.com:/teams/MaInfoTest';
        const listName: string = 'OnePagerAutomatedTestEnv';

        const client = createMSClient({
            ...opts,
            SHAREPOINT_API_LOGGING: 'false',
        });

        const siteID: string = (await client.api(`/sites/${siteIDAlias}`).select('id').get())
            .id as string;
        const onePagerDriveId: string = (
            await client.api(`/sites/${siteID}/drives`).select(['id', 'name']).get()
        ).value.filter((drive: { name: string }) => drive.name === listName)[0].id as string;

        const folders = (
            await client
                .api(`/drives/${onePagerDriveId}/root/children`)
                .select(['id'])
                .top(100000)
                .get()
        ).value as DriveItem[];

        await Promise.all(
            folders.map(element =>
                client.api(`/drives/${onePagerDriveId}/items/${element.id}`).delete()
            )
        );

        return await SharepointStorageExplorer.getInstance(client, siteIDAlias, listName, console, false); // no caching for tests
    });
}
