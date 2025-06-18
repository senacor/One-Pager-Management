// import { createAuthProvider, MSClientOptions } from "./configuration/AppConfiguration"
// import { DatasetID, PowerBIRepository } from "./validator/adapter/powerbi/PowerBIRepository"
// import { EmployeeData } from "./validator/DomainTypes";


// (async function () {
//     console.log('Starting Power BI experiments...');
//     const authProvider = createAuthProvider(process.env as MSClientOptions, 'https://analysis.windows.net/powerbi/api/.default');

//     const repo = new PowerBIRepository(authProvider, process.env.POWERBI_DATASET_ID as DatasetID, console);

//     const data: EmployeeData = await repo.getDataForEmployee('9560');
//     console.log(data);

// })();
