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

type Options = MemoryStorageOptions | LocalStorageOptions | SharepointStorageOptions;


/**
 * A function to load the application configuration based on environment variables.
 * It determines the storage source (memory, local file, or SharePoint) and returns the appropriate repositories and reporter.
 * @param logger The logger to use for logging messages (default is console).
 * @param overrides In case you want to override the environment variables, you can pass an object with the desired options.
 * @returns The AppConfiguration object that provides access to the repositories and reporter.
 */
export function loadConfigFromEnv(logger: Logger = console, overrides?: Options): AppConfiguration {
    // defaults to memory
    const opts: Options = { ...(overrides ? { ...process.env, ...overrides } : { STORAGE_SOURCE: "memory", ...process.env }) };

    switch (opts.STORAGE_SOURCE) {
        case "memory":
            logger.log("Using in-memory storage!");
            const ids = opts.EMPLOYEES ? opts.EMPLOYEES.split(",").map(id => id.trim()).filter(id => isEmployeeId(id)) : [];
            const repo = new InMemoryOnePagerRepository({});
            return {
                onePagers: async () => repo,
                employees: async () => repo,
                reporter: async () => new InMemoryValidationReporter(logger)
            };
        case "localfile":
            const dataDir = opts.DATA_DIR || process.cwd();
            logger.log(`Using local file storage at ${dataDir}!`);
            return {
                onePagers: async () => new LocalFileOnePagerRepository(dataDir, logger),
                employees: async () => new LocalFileEmployeeRepository(dataDir, logger),
                reporter: async () => new LocalFileValidationReporter(dataDir, logger)
            };
        case "sharepoint":
            logger.log("Using SharePoint storage!");
            return getSharepointConfig(opts, logger);
    }
}

/**
 * This function retrieves the SharePoint configuration based on the provided options/credentials.
 * @param opts The options for SharePoint storage, including tenant ID, client ID, client secret, and site names.
 * @param logger The logger to use for logging errors (default is console).
 * @returns An AppConfiguration object that provides access to the SharePoint repositories and reporter.
 */
function getSharepointConfig(opts: SharepointStorageOptions, logger: Logger = console): AppConfiguration {
    const client = createSharepointClient(opts, logger);

    if (!opts.SHAREPOINT_ONE_PAGER_SITE_NAME) {
        logger.error("(AppConfiguration.ts: getSharepointConfig) Missing SharePoint One Pager site name in environment variables!");
        throw new Error("Missing SharePoint One Pager site name in environment variables!");
    }

    const onePagerSiteName = opts.SHAREPOINT_ONE_PAGER_SITE_NAME;
    const onePagerDriveName = opts.SHAREPOINT_ONE_PAGER_DRIVE_NAME || "01_OnePager";
    const validationSiteName = opts.SHAREPOINT_VALIDATION_SITE_NAME || onePagerSiteName;
    const validationResultListName = opts.SHAREPOINT_VALIDATION_RESULT_LIST_NAME || "onepager-status";

    logger.log(`Fetching OnePagers from SharePoint storage with site: "${onePagerSiteName}", drive: "${onePagerDriveName}"!`);
    logger.log(`Storing validation results on SharePoint list with site: "${validationSiteName}", name: "${validationResultListName}"!`);

    let promise: Promise<SharepointDriveOnePagerRepository>;
    let repo = () => {
        if (!promise) {
            promise = SharepointDriveOnePagerRepository.getInstance(client, onePagerSiteName, onePagerDriveName, logger);
        }
        return promise;
    };

    return {
        employees: repo,
        onePagers: repo,
        reporter: () => SharepointListValidationReporter.getInstance(client, validationSiteName, validationResultListName, logger)
    };
}

/**
 * This function creates a SharePoint client using the provided options.
 * It uses the ClientSecretCredential for authentication and sets up the middleware chain.
 * @param opts The options for the SharePoint client, including tenant ID, client ID, and client secret.
 * @param logger The logger to use for logging errors (default is console).
 * @returns The initialized Microsoft Graph Client with the configured middleware.
 */
export function createSharepointClient(opts: SharepointClientOptions, logger: Logger = console): Client {
    if (!opts.SHAREPOINT_TENANT_ID || !opts.SHAREPOINT_CLIENT_ID || !opts.SHAREPOINT_CLIENT_SECRET) {
        throw new Error("Missing SharePoint authentication configuration in environment variables!");
    }

    // Use ClientSecretCredential for authentication.
    const credential = new ClientSecretCredential(
        opts.SHAREPOINT_TENANT_ID,
        opts.SHAREPOINT_CLIENT_ID,
        opts.SHAREPOINT_CLIENT_SECRET,
    );

    // Define the authentication provider using TokenCredentialAuthenticationProvider.
    // This provider will use the credential to authenticate requests to the Microsoft Graph API.
    // It requires the scopes to be set for the Microsoft Graph API.
    // The scope '.default' is used to request all permissions granted to the application.
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: ['https://graph.microsoft.com/.default']
    });

    // define the middleware chain
    const handlers: Middleware[] = [
        new AuthenticationHandler(authProvider),
        opts.SHAREPOINT_API_CACHING === "false" ? [] : [new CachingHandler()], // we default to having caching enabled
        new RetryHandler(),
        new HTTPMessageHandler()
    ].flat();

    // convert array of handlers to a chain of middleware
    handlers.reduce((prev, next, index) => {
        if(!prev.setNext) {
            throw new Error(`Handler ${index} must support setting next middleware!`);
        }
        prev.setNext(next);
        return next;
    })

    return Client.initWithMiddleware({
        debugLogging: opts.SHAREPOINT_API_LOGGING === "true",
        middleware: handlers[0]
    });
}
