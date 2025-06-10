import { DriveItem } from '@microsoft/microsoft-graph-types';
import { promises as fs } from 'fs';
import { tmpdir } from 'node:os';
import path from 'path';
import { createSharepointClient, hasSharepointClientOptions } from '../src/functions/configuration/AppConfiguration';
import { onePagerFile } from '../src/functions/validator/adapter/DirectoryBasedOnePager';
import { LocalFileOnePagerRepository } from '../src/functions/validator/adapter/localfile/LocalFileOnePagerRepository';
import { InMemoryOnePagerRepository } from '../src/functions/validator/adapter/memory/InMemoryOnePagerRepository';
import { SharepointDriveOnePagerRepository } from '../src/functions/validator/adapter/sharepoint/SharepointDriveOnePagerRepository';
import { EmployeeID, Local, OnePagerRepository } from '../src/functions/validator/DomainTypes';

type RepoFactory = (
    onePagers: Record<EmployeeID, { lastUpdateByEmployee: Date; local: Local | undefined }[]>,
) => Promise<OnePagerRepository>;

const testFactory = (name: string, factory: RepoFactory) => {
    describe(name, () => {
        it('should return empty array for an unknown employee', async () => {
            const rep: OnePagerRepository = await factory({});
            const unknownEmployeeId: EmployeeID = '000'; // Example of an unknown employee ID

            await expect(rep.getAllOnePagersOfEmployee(unknownEmployeeId)).resolves.toEqual([]);
        });

        it('should return an empty array for an existing employee without any one-pager', async () => {
            const id: EmployeeID = '111';
            const rep: OnePagerRepository = await factory({ [id]: [] });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
        });

        it('should return all one-pager of an existing employee', async () => {
            const id: EmployeeID = '111';
            const rep: OnePagerRepository = await factory({
                [id]: [
                    { lastUpdateByEmployee: new Date('2020-01-01'), local: undefined },
                    { lastUpdateByEmployee: new Date('2024-01-01'), local: undefined },
                ],
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toHaveLength(2);
        });

        it('should not return one-pager of a different employee', async () => {
            const id: EmployeeID = '111';
            const rep: OnePagerRepository = await factory({
                [id]: [],
                '000': [{ lastUpdateByEmployee: new Date(), local: undefined }],
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
        });

        it('should return one-pagers with URLs as downloadURLs', async () => {
            const id: EmployeeID = '111';
            const rep: OnePagerRepository = await factory({
                [id]: [{ lastUpdateByEmployee: new Date(), local: undefined }],
            });
            const onePagers = await rep.getAllOnePagersOfEmployee(id);
            expect(onePagers).toHaveLength(1);
            expect(onePagers[0].fileLocation).not.toBeFalsy();
            expect(onePagers[0].fileLocation.pathname).not.toEqual('');
        });

        it('should extract local of one-pager', async () => {
            const id: EmployeeID = '111';
            const rep: OnePagerRepository = await factory({
                [id]: [{ lastUpdateByEmployee: new Date(), local: 'DE' }],
            });
            const onePagers = await rep.getAllOnePagersOfEmployee(id);
            expect(onePagers).toHaveLength(1);
            expect(onePagers[0].local).toEqual('DE');
        });

        it('should accept missing local', async () => {
            const id: EmployeeID = '111';
            const rep: OnePagerRepository = await factory({
                [id]: [{ lastUpdateByEmployee: new Date(), local: undefined }],
            });
            const onePagers = await rep.getAllOnePagersOfEmployee(id);
            expect(onePagers).toHaveLength(1);
            expect(onePagers[0].local).toBeFalsy();
        });
    });
};

testFactory('InMemoryOnePagerRepository', async data => new InMemoryOnePagerRepository(data));

const opts = process.env;
if (hasSharepointClientOptions(opts)) {
    testFactory('SharepointDriveOnePagerRepository', async data => {
        const siteIDAlias: string = 'senacor.sharepoint.com:/teams/MaInfoTest';
        const listName: string = 'OnePagerAutomatedTestEnv';

        const client = await createSharepointClient({ ...opts, SHAREPOINT_API_LOGGING: 'true' });

        const siteID: string = (await client.api(`/sites/${siteIDAlias}`).select('id').get()).id as string;
        const onePagerDriveId: string = (
            await client.api(`/sites/${siteID}/drives`).select(['id', 'name']).get()
        ).value.filter((drive: { name: string }) => drive.name === listName)[0].id as string;

        const folders = (await client.api(`/drives/${onePagerDriveId}/root/children`).select('id').top(100000).get())
            .value as DriveItem[];

        await Promise.all(
            folders.map(element => client.api(`/drives/${onePagerDriveId}/items/${element.id}/delete`).post(null)),
        );

        await Promise.all(
            Object.keys(data).map(async employeeId => {
                // Ordner anlegen
                const requests = await client.api(`/drives/${onePagerDriveId}/items/root/children`).post({
                    name: `Name_Vorname_${employeeId}`,
                    folder: {},
                    '@microsoft.graph.conflictBehavior': 'rename',
                });

                const employeeData = data[employeeId as EmployeeID];
                await Promise.all(
                    employeeData.map(async onePager => {
                        const fileName = onePagerFile('Vorname', 'Name', onePager.local, onePager.lastUpdateByEmployee);
                        await client
                            .api(`/drives/${onePagerDriveId}/items/${requests.id}:/${fileName}:/content`)
                            .put('iwas');
                    }),
                );
            }),
        );

        return await SharepointDriveOnePagerRepository.getInstance(client, siteIDAlias, listName, console);
    });
}

testFactory('LocalFileOnePagerRepository', async data => {
    const tmp = await fs.mkdtemp(path.join(tmpdir(), 'validation-reports-'));
    console.log(`Using temporary directory: ${tmp}`);
    const repo = new LocalFileOnePagerRepository(tmp);

    await Promise.all(
        Object.keys(data).map(async employeeId => {
            const id = employeeId as EmployeeID;
            await repo.saveOnePagersOfEmployee(id, data[id]);
        }),
    );

    return repo;
});
