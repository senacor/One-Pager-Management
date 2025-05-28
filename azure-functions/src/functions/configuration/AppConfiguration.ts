import { InMemoryOnePagerRepository } from "../validator/adapter/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../validator/adapter/InMemoryValidationReporter";
import { LocalFileOnePagerRepository } from "../validator/adapter/LocalFileOnePagerRepository";
import { LocalFileValidationReporter } from "../validator/adapter/LocalFileValidationReporter";
import { OnePagerRepository, ValidationReporter } from "../validator/DomainTypes";
import { promises as fs } from "fs";
import path from "path";
import { tmpdir } from 'node:os';
import { SharepointDriveOnePagerRepository } from "../validator/adapter/SharepointDriveOnePagerRepository";
import { SharepointListValidationReporter } from "../validator/adapter/SharepointListValidationReporter";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider";
import { Client } from "@microsoft/microsoft-graph-client";
import { ProcessEnvOptions } from "node:child_process";

export type AppConfiguration = {
    repository: OnePagerRepository;
    reporter: ValidationReporter;
}

type Env = {[key: string]: string | undefined}

export async function loadConfigFromEnv(options?: Env): Promise<AppConfiguration> {
    const env = options ? {...process.env, ...options } : {...process.env};

    switch (env.STORAGE_SOURCE) {
        case "memory":
            console.log("Using in-memory storage");
            return {
                repository: new InMemoryOnePagerRepository({}),
                reporter: new InMemoryValidationReporter()
            };
        case "localfile":
            const dataDir = env.DATA_DIR || process.cwd();
            console.log(`Using local file storage at ${dataDir}`);
            return {
                repository: new LocalFileOnePagerRepository(dataDir),
                reporter: new LocalFileValidationReporter(dataDir)
            };
        case "sharepoint":
            console.log("Using SharePoint storage");
            return await getSharepointConfig(env);
        default:
            throw new Error(`Unknown storage source: ${env.STORAGE_SOURCE}`);
    }
}

async function getSharepointConfig(env: Env) {
    if (!env.SHAREPOINT_TENANT_ID || !env.SHAREPOINT_CLIENT_ID || !env.SHAREPOINT_CLIENT_SECRET) {
        throw new Error("Missing SharePoint authentication configuration in environment variables");
    }

    const credential = new ClientSecretCredential(
        env.SHAREPOINT_TENANT_ID,
        env.SHAREPOINT_CLIENT_ID,
        env.SHAREPOINT_CLIENT_SECRET,
    );

    const client = Client.initWithMiddleware({
        debugLogging: env.DEBUG === "true",
        authProvider: new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default']
        }),
    });

    if (!env.SHAREPOINT_ONE_PAGER_SITE_NAME) {
        throw new Error("Missing SharePoint One Pager site name in environment variables");
    }

    const onePagerSiteName = env.SHAREPOINT_ONE_PAGER_SITE_NAME //"senacor.sharepoint.com:/teams/MaInfoTest";
    const onePagerDriveName = env.SHAREPOINT_ONE_PAGER_DRIVE_NAME || "01_OnePager";
    const validationSiteName = env.SHAREPOINT_VALIDATION_SITE_NAME || onePagerSiteName;
    const validationResultListName = env.SHAREPOINT_VALIDATION_RESULT_LIST_NAME || "onepager-status";

    console.log(`Fetching OnePagers from SharePoint storage with site: ${onePagerSiteName}, drive: ${onePagerDriveName}`);
    console.log(`Storing validation results on SharePoint list with site: ${validationSiteName}, name: ${validationResultListName}`);

    return {
        repository: await SharepointDriveOnePagerRepository.getInstance(client, onePagerSiteName, onePagerDriveName),
        reporter: await SharepointListValidationReporter.getInstance(client, validationSiteName, validationResultListName)
    };
}
