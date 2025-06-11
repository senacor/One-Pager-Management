import { createAuthProvider, createMSClient, MSClientOptions } from "./configuration/AppConfiguration"
import { PowerBIRepository } from "./validator/adapter/powerbi/PowerBIRepository"


(async function () {
    console.log('Starting Power BI experiments...');
    let authProvider = createAuthProvider(process.env as MSClientOptions, 'https://analysis.windows.net/powerbi/api/.default');

    let repo = new PowerBIRepository(authProvider, console);

    let data = await repo.getDataForEmployee('002');
    console.log(JSON.stringify(data));

})();
