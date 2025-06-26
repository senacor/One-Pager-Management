import { EmployeeID, LocalEnum } from '../src/functions/validator/DomainTypes';
import { initInMemoryOnePagers } from './OnePagerExemplars';

describe('FolderBasedOnePagers', () => {
    it('should return empty array for an unknown employee', async () => {
        const rep = await initInMemoryOnePagers({});
        const unknownEmployeeId: EmployeeID = '000'; // Example of an unknown employee ID

        await expect(rep.getAllOnePagersOfEmployee(unknownEmployeeId)).resolves.toEqual([]);
    });

    it('should return an empty array for an existing employee without any one-pager', async () => {
        const id: EmployeeID = '111';
        const rep = await initInMemoryOnePagers({ [id]: [] });

        await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
    });

    it('should return all one-pager of an existing employee', async () => {
        const id: EmployeeID = '111';
        const rep = await initInMemoryOnePagers({
            [id]: [
                {
                    lastUpdateByEmployee: new Date('2020-01-01'),
                    local: undefined,
                },
                {
                    lastUpdateByEmployee: new Date('2024-01-01'),
                    local: undefined,
                },
            ],
        });

        await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toHaveLength(2);
    });

    it('should not return one-pager of a different employee', async () => {
        const id: EmployeeID = '111';
        const rep = await initInMemoryOnePagers({
            [id]: [],
            '000': [{ lastUpdateByEmployee: new Date(), local: undefined }],
        });

        await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
    });

    it('should extract local of one-pager', async () => {
        const id: EmployeeID = '111';
        const rep = await initInMemoryOnePagers({
            [id]: [{ lastUpdateByEmployee: new Date(), local: LocalEnum.DE }],
        });
        const onePagers = await rep.getAllOnePagersOfEmployee(id);
        expect(onePagers).toHaveLength(1);
        expect(onePagers[0].local).toEqual(LocalEnum.DE);
    });

    it('should accept missing local', async () => {
        const id: EmployeeID = '111';
        const rep = await initInMemoryOnePagers({
            [id]: [{ lastUpdateByEmployee: new Date(), local: undefined }],
        });
        const onePagers = await rep.getAllOnePagersOfEmployee(id);
        expect(onePagers).toHaveLength(1);
        expect(onePagers[0].local).toBeFalsy();
    });
});
