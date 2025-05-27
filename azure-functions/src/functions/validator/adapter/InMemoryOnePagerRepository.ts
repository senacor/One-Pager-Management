import { EmployeeID, OnePager, OnePagerRepository } from "../DomainTypes";


type OnePagerMap = { [employeeId: EmployeeID]: OnePager[] };

export class InMemoryOnePagerRepository implements OnePagerRepository {
    readonly onePagers: OnePagerMap;

    constructor(onePagers: OnePagerMap) {
        this.onePagers = onePagers;
    }

    

    async getAllOnePagersOfEmployee(employeeId: EmployeeID) {
        return this.onePagers[employeeId];
    }
}
