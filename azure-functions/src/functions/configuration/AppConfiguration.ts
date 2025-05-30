import { ClientSecretCredential } from "@azure/identity";
import { Client } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider";
import { LocalFileEmployeeRepository } from "../validator/adapter/localfile/LocalFileEmployeeRepository";
import { LocalFileOnePagerRepository } from "../validator/adapter/localfile/LocalFileOnePagerRepository";
import { LocalFileValidationReporter } from "../validator/adapter/localfile/LocalFileValidationReporter";
import { InMemoryOnePagerRepository } from "../validator/adapter/memory/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../validator/adapter/memory/InMemoryValidationReporter";
import { CachingClient, SharepointClient } from "../validator/adapter/sharepoint/CachingClient";
import { SharepointDriveOnePagerRepository } from "../validator/adapter/sharepoint/SharepointDriveOnePagerRepository";
import { SharepointListValidationReporter } from "../validator/adapter/sharepoint/SharepointListValidationReporter";
import { EmployeeRepository, isEmployeeId, Logger, OnePagerRepository, ValidationReporter } from "../validator/DomainTypes";

export type AppConfiguration = {
    onePagers: () => Promise<OnePagerRepository>;
    employees: () => Promise<EmployeeRepository>;
    reporter: () => Promise<ValidationReporter>;
}

type MemoryStorageOptions = {
    STORAGE_SOURCE: "memory";
    EMPLOYEES?: string; // Comma-separated list of employee IDs to pre-populate the in-memory repository
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
    SHAREPOINT_API_LOGGING?: string;
}

export function hasSharepointClientOptions(opts: any): opts is SharepointClientOptions {
    return opts.SHAREPOINT_TENANT_ID && opts.SHAREPOINT_CLIENT_ID && opts.SHAREPOINT_CLIENT_SECRET;
}

type Options = MemoryStorageOptions | LocalStorageOptions | SharepointStorageOptions

export function loadConfigFromEnv(logger: Logger = console, overrides?: Options): AppConfiguration {
    // defaults to memory
    const opts: Options = { ...(overrides ? { ...process.env, ...overrides } : { STORAGE_SOURCE: "memory", ...process.env }) };

    switch (opts.STORAGE_SOURCE) {
        case "memory":
            logger.log("Using in-memory storage");
            const ids = opts.EMPLOYEES ? opts.EMPLOYEES.split(",").map(id => id.trim()).filter(id => isEmployeeId(id)) : [];
            const repo = new InMemoryOnePagerRepository({});
            return {
                onePagers: async () => repo,
                employees: async () => repo,
                reporter: async () => new InMemoryValidationReporter(logger)
            };
        case "localfile":
            const dataDir = opts.DATA_DIR || process.cwd();
            logger.log(`Using local file storage at ${dataDir}`);
            return {
                onePagers: async () => new LocalFileOnePagerRepository(dataDir),
                employees: async () => new LocalFileEmployeeRepository(dataDir),
                reporter: async () => new LocalFileValidationReporter(dataDir)
            };
        case "sharepoint":
            logger.log("Using SharePoint storage");
            return getSharepointConfig(opts);
    }
}

function getSharepointConfig(opts: SharepointStorageOptions) {
    const client = new CachingClient(createSharepointClient(opts));

    if (!opts.SHAREPOINT_ONE_PAGER_SITE_NAME) {
        throw new Error("Missing SharePoint One Pager site name in environment variables");
    }

    const onePagerSiteName = opts.SHAREPOINT_ONE_PAGER_SITE_NAME;
    const onePagerDriveName = opts.SHAREPOINT_ONE_PAGER_DRIVE_NAME || "01_OnePager";
    const validationSiteName = opts.SHAREPOINT_VALIDATION_SITE_NAME || onePagerSiteName;
    const validationResultListName = opts.SHAREPOINT_VALIDATION_RESULT_LIST_NAME || "onepager-status";

    console.log(`Fetching OnePagers from SharePoint storage with site: ${onePagerSiteName}, drive: ${onePagerDriveName}`);
    console.log(`Storing validation results on SharePoint list with site: ${validationSiteName}, name: ${validationResultListName}`);

    var promise: Promise<SharepointDriveOnePagerRepository>;
    var repo = () => {
        if (!promise) {
            promise = SharepointDriveOnePagerRepository.getInstance(client, onePagerSiteName, onePagerDriveName);
        }
        return promise;
    }
    return {
        employees: repo,
        onePagers: repo,
        reporter: () => SharepointListValidationReporter.getInstance(client, validationSiteName, validationResultListName)
    };
}

export function createSharepointClient(opts: SharepointClientOptions): SharepointClient {
    if (!opts.SHAREPOINT_TENANT_ID || !opts.SHAREPOINT_CLIENT_ID || !opts.SHAREPOINT_CLIENT_SECRET) {
        throw new Error("Missing SharePoint authentication configuration in environment variables");
    }

    const credential = new ClientSecretCredential(
        opts.SHAREPOINT_TENANT_ID,
        opts.SHAREPOINT_CLIENT_ID,
        opts.SHAREPOINT_CLIENT_SECRET,
    );

    return Client.initWithMiddleware({
        debugLogging: opts.SHAREPOINT_API_LOGGING === "true",
        authProvider: new TokenCredentialAuthenticationProvider(credential, {
            scopes: ['https://graph.microsoft.com/.default']
        }),
    });
}
