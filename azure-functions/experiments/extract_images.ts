import JSZip from "jszip";
import { loadConfigFromEnv } from "../src/functions/configuration/AppConfiguration";
import { Logger, OnePager } from "../src/functions/validator/DomainTypes";
import { fetchOnePagerContent } from "../src/functions/validator/fetcher";
import { mkdirSync, writeFileSync } from "fs";

const nopLogger: Logger = {
    log: () => { },
    warn: () => { },
    error: () => { },
    debug: () => { }
}

const mediaDir = "./media";

async function main() {
    const conf = loadConfigFromEnv(nopLogger, {
        STORAGE_SOURCE: "localfile",
        ONE_PAGER_DIR: "/Users/Daniel.Heinrich/Library/CloudStorage/OneDrive-SenacorTechnologiesAG/MaInfo - 01_OnePager"
    });

    const employees = await (await conf.employees()).getAllEmployees();

    const repo = await conf.onePagers();

    mkdirSync(mediaDir);

    for (const employee of employees) {
        const newest = (await repo.getAllOnePagersOfEmployee(employee)).reduce((acc, curr) => {
            return curr.lastUpdateByEmployee > (acc?.lastUpdateByEmployee || new Date(0)) ? curr : acc;
        }, undefined as OnePager | undefined);

        if (newest?.fileLocation) {
            const pptxContent = await fetchOnePagerContent(nopLogger, newest);
            const zip = new JSZip();
            const pptx = await zip.loadAsync(pptxContent);

            const media = Object.keys(pptx.files).filter(file => file.match(/ppt\/(media)\/.+(?<!emf|wmf)$/)).sort();
            for (const file of media) {
                const content = await pptx.files[file].async("nodebuffer");
                const filename = `${mediaDir}/${employee}_${file.split('/').pop()}`;
                console.log(`Writing media file: ${filename}`);
                writeFileSync(filename, content);
            }
        }
    }

}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
}).then(() => {
    console.log("Success");
});
