import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import { EmployeeData, EmployeeID, EmployeeRepository, Logger } from '../../DomainTypes';
import NodeCache from 'node-cache';
import { HardenedFetch } from 'hardened-fetch';

export type DatasetID = string;
export function isDatasetID(item: unknown): item is DatasetID {
    return typeof item === 'string' && item.match(/^([0-9a-zA-Z]+-){4}[0-9a-zA-Z]+$/) !== null;
}

type PowerBITableRow = {
    'current employee[fis_id_first]': EmployeeID;
    'current employee[name]': string;
    'current employee[email]': string;
    'current employee[entry_date]': string;
    'current employee[office]': string;
    'current employee[date_of_employment_change]': string | null;
    'current employee[position_current]': string | null;
    'current employee[resource_type_current]': string | null;
    'current employee[staffing_pool_current]': string | null;
    'current employee[position_future]': string | null;
    'current employee[resource_type_future]': string | null;
    'current employee[staffing_pool_future]': string | null;
};

type PowerBIOutput = {
    results: Array<{
        tables: Array<{
            rows: PowerBITableRow[];
        }>;
    }>;
};

const client = new HardenedFetch({
    // Retry options
    maxRetries: 3,
    doNotRetry: [400, 401, 403, 404, 422, 451],
    // Rate limit options
    rateLimitHeader: 'retry-after',
    resetFormat: 'seconds',
});

/**
 * Repository for retrieving information from Power BI.
 */
export class PowerBIRepository implements EmployeeRepository {
    private readonly authProvider: AuthenticationProvider;
    private readonly logger: Logger;
    private readonly datasetID: string;

    private readonly cache = new NodeCache({
        stdTTL: 10 * 60, // 10 minutes
        useClones: false,
    });

    /**
     * This constructor is private to enforce the use of the static `getInstance` method for instantiation.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param onePagers This is a map of employee IDs to their respective one-pager folders or files.
     * @param logger The logger to use for logging messages (default is console).
     */
    constructor(
        authProvider: AuthenticationProvider,
        datasetID: DatasetID,
        logger: Logger = console
    ) {
        this.authProvider = authProvider;
        this.logger = logger;
        this.datasetID = datasetID;
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        const data = await this.getAllEmployeeData();

        if (data.length === 0) {
            throw new Error(`No employees found!`);
        }

        return data.map(e => e.id);
    }

    async getDataForEmployee(id: EmployeeID): Promise<EmployeeData | undefined> {
        const data = await this.getAllEmployeeData();
        return data.find(e => e.id === id);
    }

    async getAllEmployeeData(): Promise<EmployeeData[]> {
        return await this.fetchDataByQuery(`EVALUATE VALUES('current employee')`);
    }

    private async fetchDataByQuery(query: string): Promise<EmployeeData[]> {
        const result = this.cache.get<EmployeeData[]>(query);
        if (result) {
            this.logger.log(`Cache hit for query: ${query}`);
            return result;
        }

        this.logger.log(`Cache miss for query: ${query}`);

        const token = await this.authProvider.getAccessToken();
        const resHandle = await client.fetch(
            `https://api.powerbi.com/v1.0/myorg/datasets/${this.datasetID}/executeQueries`,
            {
                method: 'POST',
                body: JSON.stringify({
                    queries: [
                        {
                            query: query,
                        },
                    ],
                    serializerSettings: {
                        includeNulls: true,
                    },
                }),
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json; charset=utf-8',
                    'Accept': 'application/json',
                },
            }
        );

        if (resHandle.status !== 200) {
            this.logger.error('Fetching data from Power BI failed!', resHandle);
            throw new Error('Fetching data from Power BI failed!');
        }
        const output: PowerBIOutput = await resHandle.json();
        const data = output.results[0].tables[0].rows.map(convertPowerBIRowToEmployeeData);

        this.cache.set(query, data);
        return data;
    }
}

function convertPowerBIRowToEmployeeData(data: PowerBITableRow) {
    const employeeData: EmployeeData = {
        id: data['current employee[fis_id_first]'],
        name: data['current employee[name]'],
        email: data['current employee[email]'],
        entry_date: data['current employee[entry_date]'],
        office: data['current employee[office]'],
        date_of_employment_change: data['current employee[date_of_employment_change]'],
        position_current: data['current employee[position_current]'],
        resource_type_current: data['current employee[resource_type_current]'],
        staffing_pool_current: data['current employee[staffing_pool_current]'],
        position_future: data['current employee[position_future]'],
        resource_type_future: data['current employee[resource_type_future]'],
        staffing_pool_future: data['current employee[staffing_pool_future]'],
    };
    return employeeData;
}
