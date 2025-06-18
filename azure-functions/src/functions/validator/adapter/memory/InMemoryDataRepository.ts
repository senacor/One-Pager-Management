import {
    EmployeeDataRepository,
    EmployeeData,
    EmployeeID,
    isEmployeeId,
    Logger
} from '../../DomainTypes';

export type InMemoryEmployeeData = { [employeeID: EmployeeID] : EmployeeData };

export class InMemoryDataRepository implements EmployeeDataRepository {
    private readonly logger: Logger;
    private dataRepo: InMemoryEmployeeData = {};

    /**
     * This constructor is private to enforce the use of the static `getInstance` method for instantiation.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param onePagers This is a map of employee IDs to their respective one-pager folders or files.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(logger: Logger = console) {
        this.logger = logger;
    }

    setData(data: InMemoryEmployeeData) {
        this.dataRepo = data;
    }

    async getDataForEmployee(employeeId: EmployeeID): Promise<EmployeeData> {
        if (!isEmployeeId(employeeId)) {
            throw new Error(`Invalid employee ID: ${employeeId}`);
        }

        return {...this.dataRepo[employeeId]};
    }
}
