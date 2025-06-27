import { loadConfigFromEnv } from "../src/functions/configuration/AppConfiguration";
import { FolderBasedOnePagers } from "../src/functions/validator/FolderBasedOnePagers";
import { Employee, EmployeeID } from "../src/functions/validator/DomainTypes";
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

    const matchedIDs: {folderID: EmployeeID | null; powerBIID: EmployeeID | null}[] = [];

    const mismatchIDsList = new Array<MisMatchEntry>();
    await Promise.all(folderIDs.map(async (id: EmployeeID): Promise<void> => {
        const employeeData: Employee | undefined = await folderRepo.getEmployee(id);
        if (!powerBIIDs.includes(id)) {
            const firstname = employeeData?.name.split(' ')[0];
            const lastname = employeeData?.name.split(' ').pop();
            let possibleMatchesList: Employee[] = [];
            if (!!firstname && !!lastname) {
                possibleMatchesList = allPowerBIEmployeeData.filter((employee: Employee) => {
                    return replaceExtraChars(employee.name).indexOf(replaceExtraChars(firstname)) > -1 &&
                        replaceExtraChars(employee.name).indexOf(replaceExtraChars(lastname)) > -1;
                });
            }
            // possibleMatchesList contains powerBI IDs
            possibleMatchesList.forEach((el) => {
                matchedIDs.push({folderID: id, powerBIID: el.id});
            });
            const possibleMatches = possibleMatchesList.map((el: Employee) => {return el.name + " " + el.id}).join('; ');
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
            const employeeData: Employee | undefined = await employeeRepo?.getEmployee(id);
            if (
                employeeData === undefined
                || employeeData?.resource_type_current === null
                || !peopleWithOnePagers.includes(employeeData?.resource_type_current)
            ) {
                return;
            }
            const matches = matchedIDs.filter((el) => el.powerBIID === id).map((el) => el.folderID).join(', ');

            mismatchIDsList.push({folderID: null, powerBIID: id, name: employeeData?.name || null, possibleMatches: matches, matched: matchedIDs.filter((el) => el.powerBIID === id).length > 0 ? "MATCHED" : employeeData?.position_current === null ? 'NON_MATCHED_NEWJOINER': null});
        }
    }));
    stringify(mismatchIDsList, {
        delimiter: ";",
        header: true
    }, function (err, output) {
        console.log(output);
        fs.writeFileSync('./experiments/idData.csv', output, 'utf8');
    });
})();
