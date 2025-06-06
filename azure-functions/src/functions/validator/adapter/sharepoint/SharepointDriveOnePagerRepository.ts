import { Client } from "@microsoft/microsoft-graph-client";
import { DriveItem, Site } from "@microsoft/microsoft-graph-types";
import { URL } from "node:url";
import { EmployeeID, EmployeeRepository, Logger, OnePager, OnePagerRepository } from "../../DomainTypes";
import { employeeIdFromFolder, extractLanguageCode, isEmployeeFolder } from "../DirectoryBasedOnePager";

type SharePointFolder = string;
type OnePagerMap = Record<EmployeeID, OnePager[] | SharePointFolder>;
type DriveItemWithDownloadUrl = DriveItem & { "@microsoft.graph.downloadUrl"?: string };

/**
 * Repository for retrieving one-pagers stored in a SharePoint Drive.
 * This repository fetches one-pagers from a specific SharePoint Drive folder structure using the Microsoft Graph API.
 * It assumes that each employee has a dedicated folder named in the format "Firstname_Lastname_EmployeeID".
 */
export class SharepointDriveOnePagerRepository implements OnePagerRepository, EmployeeRepository {
    private readonly onePagers: OnePagerMap;
    private readonly client: Client;
    private readonly logger: Logger;

    /**
     * This constructor is private to enforce the use of the static `getInstance` method for instantiation.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param onePagers This is a map of employee IDs to their respective one-pager folders or files.
     * @param logger The logger to use for logging messages (default is console).
     */
    private constructor(client: Client, onePagers: OnePagerMap, logger: Logger = console) {
        this.client = client;
        this.onePagers = onePagers;
        this.logger = logger;
    }

    /**
     * This static method creates an instance of the SharepointDriveOnePagerRepository.
     * @param client The Microsoft Graph API client to use for fetching data.
     * @param siteIDAlias The name of the SharePoint site where the one-pagers are stored - so as to not use the ID directly.
     * @param listName The name of the SharePoint Folder where the one-pagers are stored. On SharePoint, this is sotred as a Drive and List. E.g. "01_OnePager".
     * @param logger The logger to use for logging messages (default is console).
     * @returns A promise that resolves to an instance of SharepointDriveOnePagerRepository.
     */
    public static async getInstance(client: Client, siteIDAlias: string, listName: string, logger: Logger = console): Promise<SharepointDriveOnePagerRepository> {
        const site = await client.api(`/sites/${siteIDAlias}`).get() as Site | undefined;
        if (!site || !site.id) {
            logger.error(`(SharepointDriveOnePagerRepository.ts: getInstance) Cannot find site with alias "${siteIDAlias}"!`);
            throw new Error(`(SharepointDriveOnePagerRepository.ts: getInstance) Cannot find site with alias ${siteIDAlias}!`);
        }

        const onePagerDriveId: string = (await client.api(`/sites/${site.id}/drives`).get()).value.filter((drive: { "name": string }) => drive.name === listName)[0].id as string;
        const { value: folders } = await client.api(`/drives/${onePagerDriveId}/root/children`).top(100000).get() as { value?: DriveItem[] };

        if (folders === undefined) {
            logger.error(`(SharepointDriveOnePagerRepository.ts: getInstance) Could not fetch folders of SharePoint drive with ID "${onePagerDriveId}" for site "${siteIDAlias}"!`);
            throw new Error(`(SharepointDriveOnePagerRepository.ts: getInstance) Could not fetch folders of SharePoint drive with ID "${onePagerDriveId}" for site "${siteIDAlias}"!`);
        }

        const onePagers: OnePagerMap = {};
        for (const folder of folders) {
            const folderName = folder.name;
            if (!isEmployeeFolder(folderName)) {
                continue;
            }

            const employeeId: EmployeeID = employeeIdFromFolder(folderName);
            onePagers[employeeId] = `/drives/${onePagerDriveId}/root:/${folderName}:/children` as SharePointFolder;
        }

        return new SharepointDriveOnePagerRepository(client, onePagers, logger);
    }

    async getAllOnePagersOfEmployee(employeeId: EmployeeID): Promise<OnePager[]> {
        const folder = this.onePagers[employeeId];
        if (!folder) {
            return [];
        }

        if (Array.isArray(folder)) {
            return folder;
        }

        // load contents of one pager folder
        const { value: folderContents } = await this.client.api(folder).get() as { value?: DriveItemWithDownloadUrl[] };
        this.onePagers[employeeId] = [];
        if (folderContents) {
            for (const driveItem of folderContents) {

                // check if the drive item is a valid one-pager file
                // if the output does not have a date of last chage or is not a file, continue
                if (!driveItem.lastModifiedDateTime ||
                    !(driveItem.name || "").match(/^.+_\d{6}(_.+)?\.pptx$/) ||
                    !driveItem.file ||
                    !driveItem["@microsoft.graph.downloadUrl"]) {
                    this.logger.log(`Skipping non one-pager drive item: ${JSON.stringify(driveItem)}`);
                    continue;
                }
                const onePager: OnePager = {
                    lastUpdateByEmployee: new Date(driveItem.lastModifiedDateTime),
                    fileLocation: new URL(driveItem["@microsoft.graph.downloadUrl"]),
                    webLocation: driveItem.webUrl ? new URL(driveItem.webUrl) : undefined,
                    local: extractLanguageCode(driveItem.name || ""),
                };
                this.onePagers[employeeId].push(onePager);
            }
        }
        return this.onePagers[employeeId];
    }

    async getAllEmployees(): Promise<EmployeeID[]> {
        return Object.keys(this.onePagers) as EmployeeID[];
    }
}
