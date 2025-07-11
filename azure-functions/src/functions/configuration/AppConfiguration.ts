import { ClientSecretCredential } from '@azure/identity';
import {
    AuthenticationHandler,
    AuthenticationProvider,
    Client,
    HTTPMessageHandler,
    Middleware,
    RetryHandler,
} from '@microsoft/microsoft-graph-client';
import { TokenCredentialAuthenticationProvider } from '@microsoft/microsoft-graph-client/lib/src/authentication/azureTokenCredentials/TokenCredentialAuthenticationProvider';
import { LocalFileValidationReporter } from '../validator/adapter/localfile/LocalFileValidationReporter';
import { InMemoryValidationReporter } from '../validator/adapter/memory/InMemoryValidationReporter';
import { SharepointListValidationReporter } from '../validator/adapter/sharepoint/SharepointListValidationReporter';
import {
    MailPort,
    StorageExplorer,
    Logger,
    MSScope,
    ValidationReporter,
    EmployeeRepository,
    MailReporter,
    UseOfOnePagerReporter,
} from '../validator/DomainTypes';
import { CachingHandler } from './CachingHandler';
import { promises as fs } from 'fs';
import { SharepointStorageExplorer } from '../validator/adapter/sharepoint/SharepointStorageExplorer';
import { MemoryFileSystem } from '../validator/adapter/memory/MemoryFileSystem';
import { FileSystemStorageExplorer } from '../validator/adapter/FileSystemStorageExplorer';
import { InMemoryMailAdapter } from '../validator/adapter/memory/InMemoryMailAdapter';
import {
    DatasetID,
    isDatasetID,
    PowerBIRepository,
} from '../validator/adapter/powerbi/PowerBIRepository';
import { MSMailAdapter } from '../validator/adapter/mail/MSMailAdapter';
import { SharepointListSendMailsReporter } from '../validator/adapter/sharepoint/SharepointListSendMailsReporter.';
import { SharepointListAllowUseOfOnePagers } from '../validator/adapter/sharepoint/SharepointListAllowUseOfOnePagers';

export type AppConfiguration = {
    host: string; // the host URL of the application, used for generating links in emails
    explorer: () => Promise<StorageExplorer>;
    reporter: () => Promise<ValidationReporter>;
    mailAdapter: () => MailPort | undefined; // optional mail adapter for sharepoint storage
    employeeRepo: () => EmployeeRepository | undefined;
    mailReporter: () => Promise<MailReporter | undefined>; // optional mail reporter for sharepoint storage
    useOfOnePagersReporter: () => Promise<UseOfOnePagerReporter | undefined>; // optional flag to allow the use of one-pagers
};

type MemoryStorageOptions = {
    STORAGE_SOURCE: 'memory';
};

type LocalStorageOptions = {
    STORAGE_SOURCE: 'localfile';
    ONE_PAGER_DIR?: string;
    VALIDATION_RESULT_DIR?: string;
};

type SharepointStorageOptions = MSClientOptions & {
    STORAGE_SOURCE: 'sharepoint';
    SHAREPOINT_ONE_PAGER_SITE_NAME?: string;
    SHAREPOINT_ONE_PAGER_DRIVE_NAME?: string;
    SHAREPOINT_VALIDATION_SITE_NAME?: string;
    SHAREPOINT_VALIDATION_RESULT_LIST_NAME?: string;
    SHAREPOINT_SENDMAIL_LIST_NAME?: string;
    SHAREPOINT_SENDMAIL_SITE_NAME?: string;
    SHAREPOINT_USEOFONEPAGER_LIST_NAME?: string;
    SHAREPOINT_USEOFONEPAGER_SITE_NAME?: string;
};

export type MSClientOptions = {
    SHAREPOINT_TENANT_ID?: string;
    SHAREPOINT_CLIENT_ID?: string;
    SHAREPOINT_CLIENT_SECRET?: string;
    SHAREPOINT_API_LOGGING?: string;
    SHAREPOINT_API_CACHING?: string;
    POWERBI_DATASET_ID?: string;
};

export function hasSharepointClientOptions(opts: Record<string, unknown>): opts is MSClientOptions {
    return (
        Boolean(opts.SHAREPOINT_TENANT_ID) &&
        Boolean(opts.SHAREPOINT_CLIENT_ID) &&
        Boolean(opts.SHAREPOINT_CLIENT_SECRET)
    );
}

export type Options = MemoryStorageOptions | LocalStorageOptions | SharepointStorageOptions;

/**
 * A function to load the application configuration based on environment variables.
 * It determines the storage source (memory, local file, or SharePoint) and returns the appropriate repositories and reporter.
 * @param logger The logger to use for logging messages (default is console).
 * @param overrides In case you want to override the environment variables, you can pass an object with the desired options.
 * @returns The AppConfiguration object that provides access to the repositories and reporter.
 */
export function loadConfigFromEnv(logger: Logger = console, overrides?: Options): AppConfiguration {
    // defaults to memory
    const opts: Options = overrides
        ? { ...process.env, ...overrides }
        : { STORAGE_SOURCE: 'memory', ...process.env };

    const host = process.env['WEBSITE_HOSTNAME'] === undefined || process.env['WEBSITE_HOSTNAME'].indexOf("localhost") > -1
        ? 'http://localhost:7071'
        :
        // `https://${process.env['WEBSITE_HOSTNAME']}`
        'https://poc-one-pager.azurewebsites.net'
        ; // Use the environment variable or default to localhost

    switch (opts.STORAGE_SOURCE) {
        case 'memory': {
            logger.log('Using in-memory storage!');
            return {
                host: host,
                explorer: async () =>
                    new FileSystemStorageExplorer('/', new MemoryFileSystem(), logger),
                reporter: async () => new InMemoryValidationReporter(logger),
                mailAdapter: () => new InMemoryMailAdapter(),
                employeeRepo: () => undefined,
                mailReporter: async () => undefined,
                useOfOnePagersReporter: async () => undefined, // no reporter for allowing one-pagers in memory storage
            };
        }
        case 'localfile': {
            const onePagerDir = opts.ONE_PAGER_DIR || process.cwd();
            const resultDir = opts.VALIDATION_RESULT_DIR || process.cwd();
            logger.log(
                `Using local file storage for one-pagers at ${onePagerDir} and validation results at ${resultDir}!`
            );

            return {
                host: host,
                explorer: async () => new FileSystemStorageExplorer(onePagerDir, fs, logger),
                reporter: async () => new LocalFileValidationReporter(resultDir, logger),
                mailAdapter: () => undefined,
                employeeRepo: () => undefined,
                mailReporter: async () => undefined,
                useOfOnePagersReporter: async () => undefined, // no reporter for allowing one-pagers in local file storage
            };
        }
        case 'sharepoint': {
            logger.log('Using SharePoint storage!');
            return getSharepointConfig(opts, host, logger);
        }
    }
}

/**
 * This function retrieves the SharePoint configuration based on the provided options/credentials.
 * @param opts The options for SharePoint storage, including tenant ID, client ID, client secret, and site names.
 * @param logger The logger to use for logging errors (default is console).
 * @returns An AppConfiguration object that provides access to the SharePoint repositories and reporter.
 */
function getSharepointConfig(
    opts: SharepointStorageOptions,
    host: string,
    logger: Logger = console
): AppConfiguration {
    const sharePointAuthProvider = createAuthProvider(opts);
    const powerbiAuthProvider = createAuthProvider(
        opts,
        'https://analysis.windows.net/powerbi/api/.default'
    );
    const client = createMSClient(opts, sharePointAuthProvider);

    if (!opts.SHAREPOINT_ONE_PAGER_SITE_NAME) {
        throw new Error('Missing SharePoint One Pager site name in environment variables!');
    }

    const onePagerSiteName = opts.SHAREPOINT_ONE_PAGER_SITE_NAME;
    const onePagerDriveName = opts.SHAREPOINT_ONE_PAGER_DRIVE_NAME || '01_OnePager';
    const validationSiteName = opts.SHAREPOINT_VALIDATION_SITE_NAME || onePagerSiteName;
    const validationResultListName =
        opts.SHAREPOINT_VALIDATION_RESULT_LIST_NAME || 'OnePager_Status';

    const sendMailSiteName = opts.SHAREPOINT_SENDMAIL_SITE_NAME || validationSiteName;
    const sendMailListName = opts.SHAREPOINT_SENDMAIL_LIST_NAME || 'OnePager_MailsSend';

    const useOfOnePagersSiteName = opts.SHAREPOINT_USEOFONEPAGER_SITE_NAME || validationSiteName;
    const useofOnePagersListName = opts.SHAREPOINT_USEOFONEPAGER_SITE_NAME || 'OnePagers_allowUse';

    if (!opts.POWERBI_DATASET_ID || !isDatasetID(opts.POWERBI_DATASET_ID)) {
        throw new Error('Missing or invalid Power BI Dataset ID!');
    }
    const datasetID: DatasetID = opts.POWERBI_DATASET_ID;

    logger.log(
        `Fetching OnePagers from SharePoint storage with site: "${onePagerSiteName}", drive: "${onePagerDriveName}"!`
    );
    logger.log(
        `Storing validation results on SharePoint list with site: "${validationSiteName}", name: "${validationResultListName}"!`
    );

    return {
        host: host,
        explorer: () =>
            SharepointStorageExplorer.getInstance(
                client,
                onePagerSiteName,
                onePagerDriveName,
                logger
            ),
        reporter: () =>
            SharepointListValidationReporter.getInstance(
                client,
                validationSiteName,
                validationResultListName,
                logger
            ),
        mailAdapter: () =>
            new InMemoryMailAdapter()
            // new MSMailAdapter(
            //     client,
            //     logger
            // ) // optional mail adapter for SharePoint storage
        ,
        employeeRepo: () => new PowerBIRepository(powerbiAuthProvider, datasetID, logger),
        mailReporter: () =>
            SharepointListSendMailsReporter.getInstance(
                client,
                sendMailSiteName,
                sendMailListName,
                logger
            ),
        useOfOnePagersReporter: async () =>
            SharepointListAllowUseOfOnePagers.getInstance(
                client,
                useOfOnePagersSiteName,
                useofOnePagersListName,
                logger
            ),
    };
}

/**
 * This function creates a SharePoint client using the provided options.
 * It uses the ClientSecretCredential for authentication and sets up the middleware chain.
 * @param opts The options for the SharePoint client, including tenant ID, client ID, and client secret.
 * @param logger The logger to use for logging errors (default is console).
 * @returns The initialized Microsoft Graph Client with the configured middleware.
 */
export function createMSClient(
    opts: MSClientOptions,
    authProvider: AuthenticationProvider | undefined = undefined,
    scope: MSScope = 'https://graph.microsoft.com/.default'
): Client {
    if (!authProvider) {
        authProvider = createAuthProvider(opts, scope);
    }

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

export function createAuthProvider(
    opts: MSClientOptions,
    scope: MSScope = 'https://graph.microsoft.com/.default'
): AuthenticationProvider {
    if (
        !opts.SHAREPOINT_TENANT_ID ||
        !opts.SHAREPOINT_CLIENT_ID ||
        !opts.SHAREPOINT_CLIENT_SECRET
    ) {
        throw new Error(
            'Missing SharePoint authentication configuration in environment variables!'
        );
    }

    // Use ClientSecretCredential for authentication.
    const credential = new ClientSecretCredential(
        opts.SHAREPOINT_TENANT_ID,
        opts.SHAREPOINT_CLIENT_ID,
        opts.SHAREPOINT_CLIENT_SECRET
    );

    // Define the authentication provider using TokenCredentialAuthenticationProvider.
    // This provider will use the credential to authenticate requests to the Microsoft Graph API.
    // It requires the scopes to be set for the Microsoft Graph API.
    // The scope '.default' is used to request all permissions granted to the application.
    const authProvider = new TokenCredentialAuthenticationProvider(credential, {
        scopes: [scope],
    });

    return authProvider;
}
