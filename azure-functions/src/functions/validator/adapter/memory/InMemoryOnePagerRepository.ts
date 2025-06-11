import {
    EmployeeID,
    EmployeeRepository,
    Logger,
    OnePager,
    OnePagerRepository,
} from '../../DomainTypes';
import { CURRENT_TEMPLATE_PATH } from '../../validationRules';

/**
 * A map that associates employee IDs with their respective one-pagers.
 * It is used to store and retrieve one-pagers for each employee.
 */
type OnePagerMap = Record<EmployeeID, OnePager[]>;

/**
 * This class implements an in-memory repository for storing and retrieving one-pagers of employees.
 * It can be used for testing purposes or in scenarios where persistence is not required.
 */
export class InMemoryOnePagerRepository implements OnePagerRepository, EmployeeRepository {
    private readonly onePagers: OnePagerMap;
    private readonly logger: Logger;

    /**
     * Creates an instance of InMemoryOnePagerRepository.
     * @param onePagers An object which keys are employee IDs and values are arrays of one-pagers.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(onePagers: Record<EmployeeID, Partial<OnePager>[]>, logger: Logger = console) {
        // Add file location to each one-pager and save it in memory
        this.onePagers = Object.fromEntries(
            Object.entries(onePagers).map(([employeeId, onePagersArr]) => [
                employeeId,
                onePagersArr.map(d => ({
                    lastUpdateByEmployee: new Date(),
                    fileLocation: new URL(`file:///${CURRENT_TEMPLATE_PATH}`),
                    ...d,
                })),
            ])
        );
        this.logger = logger;
    }

    /**
     * Retrieves all one-pagers of a given employee.
     * @param employeeId The ID of the employee whose one-pagers are to be retrieved.
     * @returns All one-pagers of the specified employee, or an empty array if none exist.
     */
    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        return this.onePagers[employeeId] || [];
    }

    /**
     * Retrieves all employee IDs that have one-pagers stored in the repository.
     * @returns An array of employee IDs.
     */
    async getAllEmployees(): Promise<EmployeeID[]> {
        return Object.keys(this.onePagers) as EmployeeID[];
    }
}
