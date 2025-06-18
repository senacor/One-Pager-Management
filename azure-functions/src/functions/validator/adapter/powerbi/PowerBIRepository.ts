import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import {
    DataRepository,
    EmployeeData,
    EmployeeID,
    isEmployeeId,
    Logger
} from '../../DomainTypes';

/**
 * Repository for retrieving information from Power BI.
 */
export class PowerBIRepository implements DataRepository {
    private readonly authProvider: AuthenticationProvider;
    private readonly logger: Logger;

    /**
     * This constructor is private to enforce the use of the static `getInstance` method for instantiation.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param onePagers This is a map of employee IDs to their respective one-pager folders or files.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(authProvider: AuthenticationProvider, logger: Logger = console) {
        this.authProvider = authProvider;
        this.logger = logger;
    }

    async getDataForEmployee(employeeId: EmployeeID): Promise<EmployeeData> {
        const datasetID = '17c9b3ab-752a-4d66-95bc-2488dd7c4560';

        const token = await this.authProvider.getAccessToken();
        this.logger.log(token);

        // make sure that employeeID  is escaped
        if (!isEmployeeId(employeeId)) {
            throw new Error(`Invalid employee ID: ${employeeId}`);
        }

        // let escapedIdNum = escapedId.substring(1, escapedId.length-1);

        const resHandle = await fetch(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetID}/executeQueries`, {
            method: 'POST',
            body: JSON.stringify({
                "queries": [
                    {
                    "query": `EVALUATE VALUES('current employee')`
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



        const result = await resHandle.json();

        // this.logger.log(JSON.stringify(result));

        const data = result.results[0].tables[0].rows;
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
