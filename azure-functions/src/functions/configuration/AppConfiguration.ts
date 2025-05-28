import { InMemoryOnePagerRepository } from "../validator/adapter/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../validator/adapter/InMemoryValidationReporter";
import { LocalFileOnePagerRepository } from "../validator/adapter/LocalFileOnePagerRepository";
import { LocalFileValidationReporter } from "../validator/adapter/LocalFileValidationReporter";
import { OnePagerRepository, ValidationReporter } from "../validator/DomainTypes";
import { SharepointDriveOnePagerRepository } from "../validator/adapter/SharepointDriveOnePagerRepository";
import { SharepointListValidationReporter } from "../validator/adapter/SharepointListValidationReporter";
import { ClientSecretCredential } from "@azure/identity";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider";
import { Client } from "@microsoft/microsoft-graph-client";

export type AppConfiguration = {
    repository: OnePagerRepository;
    reporter: ValidationReporter;
}

type MemoryStorageOptions = {
    STORAGE_SOURCE: "memory";
}

type LocalStorageOptions = {
    STORAGE_SOURCE: "localfile";
    DATA_DIR?: string;
}

type SharepointStorageOptions = SharepointClientOptions & {
    STORAGE_SOURCE: "sharepoint";
    SHAREPOINT_ONE_PAGER_SITE_NAME?: string;
    SHAREPOINT_ONE_PAGER_DRIVE_NAME?: string;
    SHAREPOINT_VALIDATION_SITE_NAME?: string;
    SHAREPOINT_VALIDATION_RESULT_LIST_NAME?: string;
}

export type SharepointClientOptions = {
    SHAREPOINT_TENANT_ID?: string;
    SHAREPOINT_CLIENT_ID?: string;
    SHAREPOINT_CLIENT_SECRET?: string;
    DEBUG_LOGGING?: string;
}

export function hasSharepointClientOptions(opts: any): opts is SharepointClientOptions {
    return opts.SHAREPOINT_TENANT_ID && opts.SHAREPOINT_CLIENT_ID && opts.SHAREPOINT_CLIENT_SECRET;
}

type Options = MemoryStorageOptions | LocalStorageOptions | SharepointStorageOptions

export async function loadConfigFromEnv(overrides?: Options): Promise<AppConfiguration> {
    // defaults to memory
    const opts: Options = { ...{ STORAGE_SOURCE: "memory" }, ...(overrides ? { ...process.env, ...overrides } : { ...process.env }) };

    switch (opts.STORAGE_SOURCE) {
        case "memory":
            console.log("Using in-memory storage");
            return {
                repository: new InMemoryOnePagerRepository({}),
                reporter: new InMemoryValidationReporter()
            };
        case "localfile":
            const dataDir = opts.DATA_DIR || process.cwd();
            console.log(`Using local file storage at ${dataDir}`);
            return {
                repository: new LocalFileOnePagerRepository(dataDir),
                reporter: new LocalFileValidationReporter(dataDir)
            };
        case "sharepoint":
            console.log("Using SharePoint storage");
            return await getSharepointConfig(opts);
    }
}

async function getSharepointConfig(opts: SharepointStorageOptions) {
    const client = createSharepointClient(opts);

    if (!opts.SHAREPOINT_ONE_PAGER_SITE_NAME) {
        throw new Error("Missing SharePoint One Pager site name in environment variables");
    }

    const onePagerSiteName = opts.SHAREPOINT_ONE_PAGER_SITE_NAME //"senacor.sharepoint.com:/teams/MaInfoTest";
    const onePagerDriveName = opts.SHAREPOINT_ONE_PAGER_DRIVE_NAME || "01_OnePager";
    const validationSiteName = opts.SHAREPOINT_VALIDATION_SITE_NAME || onePagerSiteName;
    const validationResultListName = opts.SHAREPOINT_VALIDATION_RESULT_LIST_NAME || "onepager-status";

    console.log(`Fetching OnePagers from SharePoint storage with site: ${onePagerSiteName}, drive: ${onePagerDriveName}`);
    console.log(`Storing validation results on SharePoint list with site: ${validationSiteName}, name: ${validationResultListName}`);

    return {
        repository: await SharepointDriveOnePagerRepository.getInstance(client, onePagerSiteName, onePagerDriveName),
        reporter: await SharepointListValidationReporter.getInstance(client, validationSiteName, validationResultListName)
    };
}

export function createSharepointClient(opts: SharepointClientOptions) {
    if (!opts.SHAREPOINT_TENANT_ID || !opts.SHAREPOINT_CLIENT_ID || !opts.SHAREPOINT_CLIENT_SECRET) {
        throw new Error("Missing SharePoint authentication configuration in environment variables");
    }

    const credential = new ClientSecretCredential(
        opts.SHAREPOINT_TENANT_ID,
        opts.SHAREPOINT_CLIENT_ID,
        opts.SHAREPOINT_CLIENT_SECRET,
    );

    return Client.initWithMiddleware({
        debugLogging: opts.DEBUG_LOGGING === "true",
        authProvider: new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default']
        }),
    });
}
