import { EmployeeID, EmployeeRepository, OnePager, OnePagerRepository } from "../../DomainTypes";

type OnePagerMap = { [employeeId: EmployeeID]: OnePager[] };

export class InMemoryOnePagerRepository implements OnePagerRepository, EmployeeRepository {
    private readonly onePagers: OnePagerMap;

    constructor(onePagers: OnePagerMap) {
        this.onePagers = onePagers;
    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID) {
        return this.onePagers[employeeId] || [];
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        return Object.keys(this.onePagers);
    }
}
