import { loadConfigFromEnv } from "../src/functions/configuration/AppConfiguration";
import { PowerBIRepository } from "../src/functions/validator/adapter/powerbi/PowerBIRepository";
import { Employee, EmployeeRepository } from "../src/functions/validator/DomainTypes";
import { stringify } from "csv-stringify";
import * as fs from 'node:fs';

(async function () {

    const config = loadConfigFromEnv(console, {
        STORAGE_SOURCE: 'sharepoint',
        SHAREPOINT_ONE_PAGER_SITE_NAME: "senacor.sharepoint.com:/sites/MaInfo",
        SHAREPOINT_VALIDATION_SITE_NAME: "senacor.sharepoint.com:/teams/MaInfoTest",
        SHAREPOINT_VALIDATION_RESULT_LIST_NAME: "onepager-status",
    });

    const employeeRepo: EmployeeRepository | undefined = config.employeeRepo();

    if (employeeRepo instanceof PowerBIRepository) {
        await employeeRepo.getAllEmployeeData();
        const employeeData: Employee[] = await employeeRepo.getAllEmployeeData();
        stringify(employeeData, {
            delimiter: ";",
            header: true
        }, function (err, output) {
            fs.writeFileSync('./experiments/employeeData.csv', output, 'utf8');
        });
    }
})();
