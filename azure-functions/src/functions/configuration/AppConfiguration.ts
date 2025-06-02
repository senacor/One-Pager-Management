import { ClientSecretCredential } from "@azure/identity";
import { AuthenticationHandler, ChaosHandler, Client, HTTPMessageHandler, Middleware, RetryHandler } from "@microsoft/microsoft-graph-client";
import { TokenCredentialAuthenticationProvider } from "@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider";
import { LocalFileEmployeeRepository } from "../validator/adapter/localfile/LocalFileEmployeeRepository";
import { LocalFileOnePagerRepository } from "../validator/adapter/localfile/LocalFileOnePagerRepository";
import { LocalFileValidationReporter } from "../validator/adapter/localfile/LocalFileValidationReporter";
import { InMemoryOnePagerRepository } from "../validator/adapter/memory/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../validator/adapter/memory/InMemoryValidationReporter";
import { SharepointDriveOnePagerRepository } from "../validator/adapter/sharepoint/SharepointDriveOnePagerRepository";
import { SharepointListValidationReporter } from "../validator/adapter/sharepoint/SharepointListValidationReporter";
import { EmployeeRepository, isEmployeeId, Logger, OnePagerRepository, ValidationReporter } from "../validator/DomainTypes";
import { CachingHandler } from "./CachingHandler";

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
    SHAREPOINT_API_CACHING?: string;
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
            logger.log("(AppConfiguration.ts: loadConfigFromEnv) Using in-memory storage!");
            const ids = opts.EMPLOYEES ? opts.EMPLOYEES.split(",").map(id => id.trim()).filter(id => isEmployeeId(id)) : [];
            const repo = new InMemoryOnePagerRepository({});
            return {
                onePagers: async () => repo,
                employees: async () => repo,
                reporter: async () => new InMemoryValidationReporter(logger)
            };
        case "localfile":
            const dataDir = opts.DATA_DIR || process.cwd();
            logger.log(`(AppConfiguration.ts: loadConfigFromEnv) Using local file storage at ${dataDir}!`);
            return {
                onePagers: async () => new LocalFileOnePagerRepository(dataDir),
                employees: async () => new LocalFileEmployeeRepository(dataDir),
                reporter: async () => new LocalFileValidationReporter(dataDir)
            };
        case "sharepoint":
            logger.log("(AppConfiguration.ts: loadConfigFromEnv) Using SharePoint storage!");
            return getSharepointConfig(opts);
    }
}

function getSharepointConfig(opts: SharepointStorageOptions) {
    const client = createSharepointClient(opts);

    if (!opts.SHAREPOINT_ONE_PAGER_SITE_NAME) {
        throw new Error("(AppConfiguration.ts: getSharepointConfig) Missing SharePoint One Pager site name in environment variables!");
    }

    const onePagerSiteName = opts.SHAREPOINT_ONE_PAGER_SITE_NAME;
    const onePagerDriveName = opts.SHAREPOINT_ONE_PAGER_DRIVE_NAME || "01_OnePager";
    const validationSiteName = opts.SHAREPOINT_VALIDATION_SITE_NAME || onePagerSiteName;
    const validationResultListName = opts.SHAREPOINT_VALIDATION_RESULT_LIST_NAME || "onepager-status";

    console.log(`(AppConfiguration.ts: getSharepointConfig) Fetching OnePagers from SharePoint storage with site: "${onePagerSiteName}", drive: "${onePagerDriveName}"!`);
    console.log(`(AppConfiguration.ts: getSharepointConfig) Storing validation results on SharePoint list with site: "${validationSiteName}", name: "${validationResultListName}"!`);

    let promise: Promise<SharepointDriveOnePagerRepository>;
    let repo = () => {
        if (!promise) {
            promise = SharepointDriveOnePagerRepository.getInstance(client, onePagerSiteName, onePagerDriveName);
        }
        return promise;
    };

    return {
        employees: repo,
        onePagers: repo,
        reporter: () => SharepointListValidationReporter.getInstance(client, validationSiteName, validationResultListName)
    };
}

const CachingMiddleware: Middleware = {
    execute: async (context) => {

    }
};

export function createSharepointClient(opts: SharepointClientOptions): Client {
    if (!opts.SHAREPOINT_TENANT_ID || !opts.SHAREPOINT_CLIENT_ID || !opts.SHAREPOINT_CLIENT_SECRET) {
        throw new Error("(AppConfiguration.ts: createSharepointClient) Missing SharePoint authentication configuration in environment variables!");
    }

    const credential = new ClientSecretCredential(
        opts.SHAREPOINT_TENANT_ID,
        opts.SHAREPOINT_CLIENT_ID,
        opts.SHAREPOINT_CLIENT_SECRET,
    );

    if (!credential) {
        throw new Error("(AppConfiguration.ts: createSharepointClient) Failed to create ClientSecretCredential!");
    }

    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
    });

    if (!authProvider) {
        throw new Error("(AppConfiguration.ts: createSharepointClient) Failed to create TokenCredentialAuthenticationProvider!");
    }

    const handlers: Middleware[] = [
        new AuthenticationHandler(authProvider),
        opts.SHAREPOINT_API_CACHING === "false" ? [] : [new CachingHandler()], // we default to having caching enabled
        new RetryHandler(),
        new HTTPMessageHandler()
    ].flat();

    handlers.reduce((prev, next, index) => {
        if(!prev.setNext) {
            throw new Error(`(AppConfiguration.ts: createSharepointClient) Handler ${index} must support setting next middleware!`);
        }
        prev.setNext(next);
        return next;
    })

    return Client.initWithMiddleware({
        debugLogging: opts.SHAREPOINT_API_LOGGING === "true",
        middleware: handlers[0]
    });
}
