import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import {
    EmployeeData,
    EmployeeID,
    EmployeeRepository,
    isEmployeeId,
    Logger
} from '../../DomainTypes';

export type DatasetID = string;
export function isDatasetID(item: unknown): item is DatasetID {
    return typeof item === "string" && item.match(/^([0-9a-zA-Z]+-){4}[0-9a-zA-Z]+$/) !== null;
}

type PowerBITableRow = {
    "current employee[fis_id_first]": EmployeeID;
    "current employee[name]": string;
    "current employee[email]": string;
    "current employee[entry_date]": string;
    "current employee[office]": string;
    "current employee[date_of_employment_change]": string | null;
    "current employee[position_current]": string | null;
    "current employee[resource_type_current]": string | null;
    "current employee[staffing_pool_current]": string | null;
    "current employee[position_future]": string | null;
    "current employee[resource_type_future]": string | null;
    "current employee[staffing_pool_future]": string | null;
};

/**
 * Repository for retrieving information from Power BI.
 */
export class PowerBIRepository implements EmployeeRepository {
    private readonly authProvider: AuthenticationProvider;
    private readonly logger: Logger;
    private readonly datasetID: string;
    private readonly fetchURL: string;

    /**
     * This constructor is private to enforce the use of the static `getInstance` method for instantiation.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param onePagers This is a map of employee IDs to their respective one-pager folders or files.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(authProvider: AuthenticationProvider, datasetID: DatasetID, logger: Logger = console) {
        this.authProvider = authProvider;
        this.logger = logger;
        this.datasetID = datasetID;
        this.fetchURL = `https://api.powerbi.com/v1.0/myorg/datasets/${this.datasetID}/executeQueries`;
    }


    async getAllEmployees(): Promise<EmployeeID[]> {
        const token = await this.authProvider.getAccessToken();
        // this.logger.log(token);

        const resHandle = await fetch(this.fetchURL, {
            method: 'POST',
            body: JSON.stringify({
                "queries": [
                    {
                        // "query": `EVALUATE VALUES('current employee')` // this gets all infos about all rows
                        "query": `EVALUATE SELECTCOLUMNS('current employee', 'current employee'[fis_id_first])` // we only select the column containing the id
                    }
                ],
                "serializerSettings": {
                    "includeNulls": true
                }
            }),
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
            }
        });

        if (resHandle.status !== 200) {
            this.logger.error("Fetching data from Power BI failed!", resHandle);
            throw new Error("Fetching data from Power BI failed!");
        }



        const result = await resHandle.json();

        // this.logger.log("Employee Data: ", JSON.stringify(result));

        const data = result.results[0].tables[0].rows;
        if (data.length === 0) {
            throw new Error(`No employees found!`);
        }
        return data.map((employeeData: PowerBITableRow) => employeeData["current employee[fis_id_first]"]);

    }

    async getDataForEmployee(employeeId: EmployeeID): Promise<EmployeeData> {

        const token = await this.authProvider.getAccessToken();
        // this.logger.log(token);

        // make sure that employeeID  is escaped
        if (!isEmployeeId(employeeId)) {
            throw new Error(`Invalid employee ID: ${employeeId}`);
        }

        const resHandle = await fetch(this.fetchURL, {
            method: 'POST',
            body: JSON.stringify({
                "queries": [
                    {
                    "query": `EVALUATE FILTER('current employee', 'current employee'[fis_id_first] = "${employeeId}")`
                    }
                ],
                "serializerSettings": {
                    "includeNulls": true
                }
            }),
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
            }
        });

        if (resHandle.status !== 200) {
            this.logger.error("Fetching data from Power BI failed!", resHandle);
            throw new Error("Fetching data from Power BI failed!");
        }



        const result = await resHandle.json();

        this.logger.log("Employee Data: ", JSON.stringify(result));

        const data: PowerBITableRow[] = result.results[0].tables[0].rows;
        if (data.length === 0) {
            throw new Error(`No entry found for employee with ID: ${employeeId}`);
        }

        const employeeData: EmployeeData = {
            name: data[0]["current employee[name]"],
            email: data[0]["current employee[email]"], //TODO: nach merge mit feature/mail in E-Mail-Adresse umwandeln
            entry_date: data[0]["current employee[entry_date]"],
            office: data[0]["current employee[office]"],
            date_of_employment_change: data[0]["current employee[date_of_employment_change]"],
            position_current: data[0]["current employee[position_current]"],
            resource_type_current: data[0]["current employee[resource_type_current]"],
            staffing_pool_current: data[0]["current employee[staffing_pool_current]"],
            position_future: data[0]["current employee[position_future]"],
            resource_type_future: data[0]["current employee[resource_type_future]"],
            staffing_pool_future: data[0]["current employee[staffing_pool_future]"]
        };

        return employeeData;
    }
}
