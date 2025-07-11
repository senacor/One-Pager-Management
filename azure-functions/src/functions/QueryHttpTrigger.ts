import { HttpRequest, HttpResponseInit, InvocationContext, app } from '@azure/functions';
import { loadConfigFromEnv } from './configuration/AppConfiguration';
import { printError } from './ErrorHandling';
import { FolderBasedOnePagers } from './validator/FolderBasedOnePagers';
import { EmployeeRepository, isEmployeeId } from './validator/DomainTypes';
import { env } from 'process';
import { Pptx } from './validator/rules/Pptx';
import { extractPhotosWithFaces } from './validator/rules/photo';
import NodeCache from 'node-cache';

export async function QueryEmployees(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"!`);

        const config = await loadConfigFromEnv(context);
        const onePagers = new FolderBasedOnePagers(await config.explorer(), context);
        const employeeRepository: EmployeeRepository = config.employeeRepo() || onePagers;

        const name = request.query.get('name') || '';
        if (name.length < 3) {
            return { status: 400, body: `Query parameter "name" must be at least 3 characters long.` };
        }

        const employees = await employeeRepository.findEmployees({ name });
        const shrunk = employees.map(e => ({ id: e.id, name: e.name, position: e.position_current }));

        return { jsonBody: { result: shrunk } };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}

// Register the ValidateAllHttpTrigger function with Azure Functions to handle HTTP requests.
app.http('QueryEmployees', {
    methods: ['GET'],
    route: 'employee',
    authLevel: 'function',
    handler: QueryEmployees
});


export async function QueryEmployeeOnePagers(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"!`);

        // Extract employee ID from the request parameters
        const id = request.params.employeeid;
        if (!isEmployeeId(id)) {
            context.log(`Invalid employee id: "${id}"!`);
            return {
                status: 400,
                body: `Invalid request! "${id}" is no valid employee id.`,
            };
        }

        const config = await loadConfigFromEnv(context);
        const onePagers = new FolderBasedOnePagers(await config.explorer(), context);

        const found = await onePagers.getAllOnePagersOfEmployee(id)

        const pagers = found.map(op => ({ fileName: op.fileName, local: op.local }));

        return { jsonBody: { result: pagers } };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}

// Register the ValidateAllHttpTrigger function with Azure Functions to handle HTTP requests.
app.http('QueryEmployeeOnePagers', {
    methods: ['GET'],
    route: 'employee/{employeeid}/onepager',
    authLevel: 'function',
    handler: QueryEmployeeOnePagers
});

export async function DownloadEmployeeOnePager(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"!`);

        // Extract employee ID from the request parameters
        const id = request.params.employeeid;
        if (!isEmployeeId(id)) {
            context.log(`Invalid employee id: "${id}"!`);
            return {
                status: 400,
                body: `Invalid request! "${id}" is no valid employee id.`,
            };
        }

        const config = await loadConfigFromEnv(context);
        const onePagers = new FolderBasedOnePagers(await config.explorer(), context);

        const found = await onePagers.getAllOnePagersOfEmployee(id)

        const single = found.find(op => op.fileName === request.params.fileName);
        if (!single) {
            return {
                status: 404,
                body: `No onepager found for employee "${id}" with file name "${request.params.fileName}"!`,
            };
        }

        return {
            body: await single.data(),
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'Content-Disposition': `attachment; filename="${single.fileName}"`,
            },
        };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}

// Register the ValidateAllHttpTrigger function with Azure Functions to handle HTTP requests.
app.http('DownloadEmployeeOnePager', {
    methods: ['GET'],
    route: 'employee/{employeeid}/onepager/{fileName}/download',
    authLevel: 'function',
    handler: DownloadEmployeeOnePager
});

export async function GetEmployeeOnePagerData(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"!`);

        // Extract employee ID from the request parameters
        const id = request.params.employeeid;
        if (!isEmployeeId(id)) {
            context.log(`Invalid employee id: "${id}"!`);
            return {
                status: 400,
                body: `Invalid request! "${id}" is no valid employee id.`,
            };
        }

        const config = await loadConfigFromEnv(context);
        const onePagers = new FolderBasedOnePagers(await config.explorer(), context);

        const found = await onePagers.getAllOnePagersOfEmployee(id)

        const single = found.find(op => op.fileName === request.params.fileName);
        if (!single) {
            return {
                status: 404,
                body: `No onepager found for employee "${id}" with file name "${request.params.fileName}"!`,
            };
        }


        const pptx = await single.data().then(data => Pptx.load(data, context));
        const withFaces = await extractPhotosWithFaces(await pptx.getValidUsedImages());
        if (withFaces.length === 0) {
            return {
                status: 404,
                body: `No photo found for employee "${id}" with file name "${request.params.fileName}"!`,
            };
        }

        const [firstImage] = withFaces
        const firstImagePath = firstImage.path.substring(firstImage.path.lastIndexOf('/') + 1)

        const host = env.WEBSITE_HOSTNAME || 'localhost:7071';
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        return {
            jsonBody: {
                photo: `${protocol}://${host}/api/employee/${id}/onepager/${encodeURI(request.params.fileName)}/photo/${firstImagePath}`,
            },
        };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}

// Register the ValidateAllHttpTrigger function with Azure Functions to handle HTTP requests.
app.http('GetEmployeeOnePagerData', {
    methods: ['GET'],
    route: 'employee/{employeeid}/onepager/{fileName}',
    authLevel: 'function',
    handler: GetEmployeeOnePagerData
});

const imageCache = new NodeCache({
    stdTTL: 60 * 5,
    checkperiod: 60,
    useClones: false,
    forceString: false,
    maxKeys: 5,
});

export async function GetEmployeeOnePagerPhoto(
    request: HttpRequest,
    context: InvocationContext
): Promise<HttpResponseInit> {
    try {
        context.log(`Http function processed request for url "${request.url}"!`);
        if (imageCache.has(request.url)) {
            context.log(`Using cached image for "${request.url}"!`);
            return {
                body: imageCache.get(request.url),
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${request.params.imageName}"`,
                },
            }
        }

        // Extract employee ID from the request parameters
        const id = request.params.employeeid;
        if (!isEmployeeId(id)) {
            context.log(`Invalid employee id: "${id}"!`);
            return {
                status: 400,
                body: `Invalid request! "${id}" is no valid employee id.`,
            };
        }

        const config = await loadConfigFromEnv(context);
        const onePagers = new FolderBasedOnePagers(await config.explorer(), context);

        const found = await onePagers.getAllOnePagersOfEmployee(id)
        const single = found.find(op => op.fileName === request.params.fileName);
        if (!single) {
            return {
                status: 404,
                body: `No onepager found for employee "${id}" with file name "${request.params.fileName}"!`,
            };
        }

        const pptx = await single.data().then(data => Pptx.load(data, context));
        const images = await await pptx.getValidUsedImages();
        const selected = images.find(img => img.path.endsWith(request.params.imageName));

        if (!selected) {
            return {
                status: 404,
                body: `No photo found for employee "${id}" with file name "${request.params.fileName}" and image name "${request.params.imageName}"!`,
            };
        }

        const data = await selected.data();
        imageCache.set(request.url, data);

        return {
            body: data,
            headers: {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${request.params.imageName}"`,
            },
        };
    } catch (error) {
        context.error(`Error processing request: "${printError(error)}"!`);
        return { status: 500, body: `Internal server error` };
    }
}

// Register the ValidateAllHttpTrigger function with Azure Functions to handle HTTP requests.
app.http('GetEmployeeOnePagerPhoto', {
    methods: ['GET'],
    route: 'employee/{employeeid}/onepager/{fileName}/photo/{imageName}',
    authLevel: 'function',
    handler: GetEmployeeOnePagerPhoto
});
