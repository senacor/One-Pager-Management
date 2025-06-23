import { loadConfigFromEnv } from "../src/functions/configuration/AppConfiguration";
import { FolderBasedOnePagers } from "../src/functions/validator/FolderBasedOnePagers";

async function main() {
    const config = await loadConfigFromEnv(console, {
        STORAGE_SOURCE: 'sharepoint',
        SHAREPOINT_ONE_PAGER_SITE_NAME: "senacor.sharepoint.com:/sites/MaInfo",
        SHAREPOINT_VALIDATION_SITE_NAME: "senacor.sharepoint.com:/teams/MaInfoTest"
    });
    const onePagers = new FolderBasedOnePagers(await config.explorer());
    const powerBi = config.employeeRepo()

    if (powerBi) {
        const allExisting = await powerBi.getAllEmployees();
        const allWithOnePagers = await onePagers.getAllEmployees();

        const missing = allExisting.filter(id => !allWithOnePagers.includes(id));
        const outdated = allWithOnePagers.filter(id => !allExisting.includes(id));

        // for (const id of outdated) {
        //     const emp = await onePagers.getEmployee(id);
        //     console.log(`${id}, ${emp?.name ?? 'Unknown Name'}`);
        // }

        for (const id of missing) {
            const emp = await powerBi.getEmployee(id);
            console.log(`${id}, ${emp?.name ?? 'Unknown Name'}`);
        }
    }
}

main().catch(err => {
    console.error('Error in main:', err);
    process.exit(1);
});
