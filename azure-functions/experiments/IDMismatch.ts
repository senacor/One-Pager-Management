import { loadConfigFromEnv } from "../src/functions/configuration/AppConfiguration";
import { FolderBasedOnePagers } from "../src/functions/validator/FolderBasedOnePagers";
import { EmployeeData, EmployeeID } from "../src/functions/validator/DomainTypes";
import { stringify } from "csv-stringify";
import * as fs from 'node:fs';
import { PowerBIRepository } from "../src/functions/validator/adapter/powerbi/PowerBIRepository";

(async () => {
    const config = loadConfigFromEnv(console, {
        STORAGE_SOURCE: 'sharepoint',
        SHAREPOINT_ONE_PAGER_SITE_NAME: "senacor.sharepoint.com:/sites/MaInfo",
        SHAREPOINT_VALIDATION_SITE_NAME: "senacor.sharepoint.com:/teams/MaInfoTest",
        SHAREPOINT_VALIDATION_RESULT_LIST_NAME: "onepager-status",
    });

    const employeeRepo = config.employeeRepo();
    const folderRepo = new FolderBasedOnePagers(await config.explorer(), console);

    if (!(employeeRepo instanceof PowerBIRepository)) {
        throw new Error('employeeRepo is not powerbi repo!');
    }

    const folderIDs = await folderRepo.getAllEmployees();
    const powerBIIDs = await employeeRepo?.getAllEmployees();

    if (!powerBIIDs) {
        throw new Error("Got no power bi IDs!");
    }

    const sortFunc = (el1: EmployeeID, el2: EmployeeID) => {
        return parseInt(el1,10) - parseInt(el2, 10);
    };

    folderIDs.sort(sortFunc);
    powerBIIDs.sort(sortFunc);

    const allPowerBIEmployeeData = await employeeRepo.getAllEmployeeData();

    type MisMatchEntry = {folderID: EmployeeID | null; powerBIID: EmployeeID | null; name: string | null, possibleMatches: null | string, matched: "MATCHED" | 'NON_MATCHED_NEWJOINER' | null};

    const replaceExtraChars = function (el: string) {
        return el.replace(/ä/g, "ae").replace(/ü/g, "ue").replace(/ö/g, "oe").replace(/ß/g, "ss").replace(/[\W]/g, "?");
    };

    const matchedIDs: EmployeeID[] = [];

    const mismatchIDsList = new Array<MisMatchEntry>();
    await Promise.all(folderIDs.map(async (id: EmployeeID): Promise<void> => {
        const employeeData: EmployeeData | undefined = await folderRepo.getDataForEmployee(id);
        if (!powerBIIDs.includes(id)) {
            const firstname = employeeData?.name.split('_')[0];
            const lastname = employeeData?.name.split('_')[1];
            let possibleMatchesList: EmployeeData[] = [];
            if (!!firstname && !!lastname) {
                possibleMatchesList = allPowerBIEmployeeData.filter((employee: EmployeeData) => {
                    return replaceExtraChars(employee.name).indexOf(replaceExtraChars(firstname)) > -1 &&
                        replaceExtraChars(employee.name).indexOf(replaceExtraChars(lastname)) > -1;
                });
            }
            possibleMatchesList.forEach((el) => {
                matchedIDs.push(el.id);
            });
            const possibleMatches = possibleMatchesList.map((el: EmployeeData) => {return el.name + " " + el.id}).join('; ');
            mismatchIDsList.push({folderID: id, powerBIID: null, name: employeeData?.name || null, possibleMatches: possibleMatches, matched: null});
        }
    }));

    const peopleWithOnePagers = [
        "Mitarbeiter Professional Services CH",
        "Mitarbeiter Professional Services DE/AT",
        "Mitarbeiter Professional Services PL",
        "Mitarbeiter Professional Services SK",
        "Partner Professional Services",
    ];

    await Promise.all(powerBIIDs.map(async (id: EmployeeID): Promise<void> => {
        if (!folderIDs.includes(id)) {
            const employeeData: EmployeeData | undefined = await employeeRepo?.getDataForEmployee(id);
            if (!!employeeData && !(!employeeData?.resource_type_current) && !peopleWithOnePagers.includes(employeeData?.resource_type_current)) {
                return;
            }

            mismatchIDsList.push({folderID: null, powerBIID: id, name: employeeData?.name || null, possibleMatches: null, matched: matchedIDs.includes(id) ? "MATCHED" : employeeData?.position_current === null ? 'NON_MATCHED_NEWJOINER': null});
        }
    }));
    stringify(mismatchIDsList, {
        delimiter: ",",
        header: true
    }, function (err, output) {
        console.log(output);
        fs.writeFileSync('./experiments/idData.csv', output, 'utf8');
    });
})();
