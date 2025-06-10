import { ClientSecretCredential } from '@azure/identity';
import {
    AuthenticationHandler,
    Client,
    HTTPMessageHandler,
    Middleware,
    RetryHandler,
} from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider';
import { LocalFileEmployeeRepository } from '../validator/adapter/localfile/LocalFileEmployeeRepository';
import { LocalFileOnePagerRepository } from '../validator/adapter/localfile/LocalFileOnePagerRepository';
import { LocalFileValidationReporter } from '../validator/adapter/localfile/LocalFileValidationReporter';
import { InMemoryOnePagerRepository } from '../validator/adapter/memory/InMemoryOnePagerRepository';
import { InMemoryValidationReporter } from '../validator/adapter/memory/InMemoryValidationReporter';
import { SharepointDriveOnePagerRepository } from '../validator/adapter/sharepoint/SharepointDriveOnePagerRepository';
import { SharepointListValidationReporter } from '../validator/adapter/sharepoint/SharepointListValidationReporter';
import { EmployeeRepository, Logger, OnePagerRepository, ValidationReporter } from '../validator/DomainTypes';
import { CachingHandler } from './CachingHandler';

export type AppConfiguration = {
    onePagers: () => Promise<OnePagerRepository>;
    employees: () => Promise<EmployeeRepository>;
    reporter: () => Promise<ValidationReporter>;
};

type MemoryStorageOptions = {
    STORAGE_SOURCE: 'memory';
};

type LocalStorageOptions = {
    STORAGE_SOURCE: 'localfile';
    ONE_PAGER_DIR?: string;
    VALIDATION_RESULT_DIR?: string;
};

type SharepointStorageOptions = SharepointClientOptions & {
    STORAGE_SOURCE: 'sharepoint';
    SHAREPOINT_ONE_PAGER_SITE_NAME?: string;
    SHAREPOINT_ONE_PAGER_DRIVE_NAME?: string;
    SHAREPOINT_VALIDATION_SITE_NAME?: string;
    SHAREPOINT_VALIDATION_RESULT_LIST_NAME?: string;
};

export type SharepointClientOptions = {
    SHAREPOINT_TENANT_ID?: string;
    SHAREPOINT_CLIENT_ID?: string;
    SHAREPOINT_CLIENT_SECRET?: string;
    SHAREPOINT_API_LOGGING?: string;
    SHAREPOINT_API_CACHING?: string;
};

export function hasSharepointClientOptions(opts: Record<string, unknown>): opts is SharepointClientOptions {
    return (
        Boolean(opts.SHAREPOINT_TENANT_ID) &&
        Boolean(opts.SHAREPOINT_CLIENT_ID) &&
        Boolean(opts.SHAREPOINT_CLIENT_SECRET)
    );
}

type Options = MemoryStorageOptions | LocalStorageOptions | SharepointStorageOptions;

/**
 * A function to load the application configuration based on environment variables.
 * It determines the storage source (memory, local file, or SharePoint) and returns the appropriate repositories and reporter.
 * @param logger The logger to use for logging messages (default is console).
 * @param overrides In case you want to override the environment variables, you can pass an object with the desired options.
 * @returns The AppConfiguration object that provides access to the repositories and reporter.
 */
export async function loadConfigFromEnv(logger: Logger = console, overrides?: Options): Promise<AppConfiguration> {
    // defaults to memory
    const opts: Options = overrides ? { ...process.env, ...overrides } : { STORAGE_SOURCE: 'memory', ...process.env };

    switch (opts.STORAGE_SOURCE) {
        case 'memory': {
            logger.log('Using in-memory storage!');
            const repo = new InMemoryOnePagerRepository({});
            return {
                onePagers: async () => repo,
                employees: async () => repo,
                reporter: async () => new InMemoryValidationReporter(logger),
            };
        }
        case 'localfile': {
            const onePagerDir = opts.ONE_PAGER_DIR || process.cwd();
            const resultDir = opts.VALIDATION_RESULT_DIR || process.cwd();
            logger.log(
                `Using local file storage for one-pagers at ${onePagerDir} and validation results at ${resultDir}!`,
            );
            return {
                onePagers: async () => new LocalFileOnePagerRepository(onePagerDir, logger),
                employees: async () => new LocalFileEmployeeRepository(onePagerDir, logger),
                reporter: async () => new LocalFileValidationReporter(resultDir, logger),
            };
        }
        case 'sharepoint': {
            logger.log('Using SharePoint storage!');
            return await getSharepointConfig(opts, logger);
        }
    }
}

/**
 * This function retrieves the SharePoint configuration based on the provided options/credentials.
 * @param opts The options for SharePoint storage, including tenant ID, client ID, client secret, and site names.
 * @param logger The logger to use for logging errors (default is console).
 * @returns An AppConfiguration object that provides access to the SharePoint repositories and reporter.
 */
async function getSharepointConfig(opts: SharepointStorageOptions, logger: Logger = console): Promise<AppConfiguration> {
    const client = await createSharepointClient(opts);

    if (!opts.SHAREPOINT_ONE_PAGER_SITE_NAME) {
        throw new Error('Missing SharePoint One Pager site name in environment variables!');
    }

    const onePagerSiteName = opts.SHAREPOINT_ONE_PAGER_SITE_NAME;
    const onePagerDriveName = opts.SHAREPOINT_ONE_PAGER_DRIVE_NAME || '01_OnePager';
    const validationSiteName = opts.SHAREPOINT_VALIDATION_SITE_NAME || onePagerSiteName;
    const validationResultListName = opts.SHAREPOINT_VALIDATION_RESULT_LIST_NAME || 'onepager-status';

    logger.log(
        `Fetching OnePagers from SharePoint storage with site: "${onePagerSiteName}", drive: "${onePagerDriveName}"!`,
    );
    logger.log(
        `Storing validation results on SharePoint list with site: "${validationSiteName}", name: "${validationResultListName}"!`,
    );

    let promise: Promise<SharepointDriveOnePagerRepository>;
    const repo = () => {
        if (!promise) {
            promise = SharepointDriveOnePagerRepository.getInstance(
                client,
                onePagerSiteName,
                onePagerDriveName,
                logger,
            );
        }
        return promise;
    };

    return {
        employees: repo,
        onePagers: repo,
        reporter: () =>
            SharepointListValidationReporter.getInstance(client, validationSiteName, validationResultListName, logger),
    };
}

/**
 * This function creates a SharePoint client using the provided options.
 * It uses the ClientSecretCredential for authentication and sets up the middleware chain.
 * @param opts The options for the SharePoint client, including tenant ID, client ID, and client secret.
 * @param logger The logger to use for logging errors (default is console).
 * @returns The initialized Microsoft Graph Client with the configured middleware.
 */
export async function createSharepointClient(opts: SharepointClientOptions): Promise<Client> {
    if (!opts.SHAREPOINT_TENANT_ID || !opts.SHAREPOINT_CLIENT_ID || !opts.SHAREPOINT_CLIENT_SECRET) {
        throw new Error('Missing SharePoint authentication configuration in environment variables!');
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
        scopes: ['https://graph.microsoft.com/.default'],
    });
    // Scope for PowerBI: 'https://analysis.windows.net/powerbi/api/.default'

    // Output access token
    // console.log(await authProvider.getAccessToken());

    // define the middleware chain
    const handlers: Middleware[] = [
        new AuthenticationHandler(authProvider),
        opts.SHAREPOINT_API_CACHING === 'false' ? [] : [new CachingHandler(console)], // we default to having caching enabled
        new RetryHandler(),
        new HTTPMessageHandler(),
    ].flat();

    // convert array of handlers to a chain of middleware
    handlers.reduce((prev, next, index) => {
        if (!prev.setNext) {
            throw new Error(`Handler ${index} must support setting next middleware!`);
        }
        prev.setNext(next);
        return next;
    });

    return Client.initWithMiddleware({
        debugLogging: opts.SHAREPOINT_API_LOGGING === 'true',
        middleware: handlers[0],
    });
}
