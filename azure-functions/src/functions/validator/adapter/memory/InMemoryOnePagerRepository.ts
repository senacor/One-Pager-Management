import { EmployeeID, EmployeeRepository, OnePager, OnePagerRepository } from "../../DomainTypes";
import { CURRENT_TEMPLATE_PATH } from "../../validationRules";

type OnePagerMap = { [employeeId: EmployeeID]: OnePager[] };

export class InMemoryOnePagerRepository implements OnePagerRepository, EmployeeRepository {
    private readonly onePagers: OnePagerMap;

    constructor(onePagers: { [employeeId: EmployeeID]: { lastUpdateByEmployee: Date }[] }) {
        this.onePagers = Object.fromEntries(
            Object.entries(onePagers).map(([employeeId, onePagersArr]) => [
                employeeId,
                onePagersArr.map(d => ({ ...d, fileLocation: new URL(`file:///${CURRENT_TEMPLATE_PATH}`) }))
            ])
        );
    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID) {
        return this.onePagers[employeeId] || [];
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        return Object.keys(this.onePagers) as EmployeeID[];
    }
}
