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
        // const groupID = '2629c92d-7ccb-4308-9c38-06fa93cc13a0';
        const datasetID = 'ad3b6894-6d91-4556-be87-4260d71c6483';

        const token = await this.authProvider.getAccessToken();
        // console.log(token);

        // make sure that employeeID  is escaped
        if (!isEmployeeId(employeeId)) {
            throw new Error(`Invalid employee ID: ${employeeId}`);
        }

        // let escapedIdNum = escapedId.substring(1, escapedId.length-1);

        let resHandle = await fetch(`https://api.powerbi.com/v1.0/myorg/datasets/${datasetID}/executeQueries`, {
            method: 'POST',
            body: JSON.stringify({
                "queries": [
                    {
                    "query": `EVALUATE FILTER('employee one-pager', 'employee one-pager'[first_FIS_ID] = \"FIS${employeeId}\")`
                    }
                ],
                "serializerSettings": {
                    "includeNulls": true
                }
            }),
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json',
            }
        });



        let result = await resHandle.json();

        // this.logger.log(JSON.stringify(result));

        let data = result["results"][0]["tables"][0]["rows"];
        if (data.length === 0) {
            throw new Error(`No entry found for employee with ID: ${employeeId}`);
        }

        return {
            name: data[0]["employee one-pager[name]"],
            email: data[0]["employee one-pager[mail]"],
            position: data[0]["employee one-pager[first_FIS_ID]"]
        };
    }
}
