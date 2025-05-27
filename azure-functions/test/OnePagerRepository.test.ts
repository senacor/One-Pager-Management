import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/InMemoryOnePagerRepository";
import { EmployeeID, OnePager, OnePagerRepository } from "../src/functions/validator/DomainTypes";

type RepoFactory = (onePagers: { [employeeId: EmployeeID]: OnePager[] }) => OnePagerRepository;

const testFactory = (factory: RepoFactory) => {
    describe("OnePagerRepository", () => {

        it("should return nothing for an unknown employee", async () => {
            const rep: OnePagerRepository = new InMemoryOnePagerRepository({});
            const unknownEmployeeId: EmployeeID = "unknown-employee-id";

            await expect(rep.getAllOnePagersOfEmployee(unknownEmployeeId)).resolves.toEqual(undefined);
        });

        it("should return an empty array for an existing employee without any one-pager", async () => {
            const id: EmployeeID = "existing-employee-id";
            const rep: OnePagerRepository = new InMemoryOnePagerRepository({ [id]: [] });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual([]);
        });

        it("should return all one-pager of an existing employee", async () => {
            const id: EmployeeID = "existing-employee-id";
            const rep: OnePagerRepository = new InMemoryOnePagerRepository({
                [id]: [
                    { lastUpdateByEmployee: new Date() },
                    { lastUpdateByEmployee: new Date() }
                ]
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toHaveLength(2);
        });

        it("should not return one-pager of a different employee", async () => {
            const id: EmployeeID = "existing-employee-id";
            const rep: OnePagerRepository = new InMemoryOnePagerRepository({
                other: [
                    { lastUpdateByEmployee: new Date() }
                ]
            });

            await expect(rep.getAllOnePagersOfEmployee(id)).resolves.toEqual(undefined);
        });

    });
}

testFactory(data => new InMemoryOnePagerRepository(data));
