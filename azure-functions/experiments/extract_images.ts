import JSZip from "jszip";
import { loadConfigFromEnv } from "../src/functions/configuration/AppConfiguration";
import { Logger, OnePager } from "../src/functions/validator/DomainTypes";
import { mkdirSync, writeFileSync } from "fs";
import { FolderBasedOnePagers } from "../src/functions/validator/FolderBasedOnePagers";
import { Parser } from "xml2js";
import { uniq } from "../src/functions/validator/OnePagerValidation";

// import nodejs bindings to native tensorflow,
// not required, but will speed up things drastically (python required)
import '@tensorflow/tfjs-node';

// implements nodejs wrappers for HTMLCanvasElement, HTMLImageElement, ImageData
import * as canvas from 'canvas';

import * as faceapi from '@vladmandic/face-api';

// patch nodejs environment, we need to provide an implementation of
// HTMLCanvasElement and HTMLImageElement, additionally an implementation
// of ImageData is required, in case you want to use the MTCNN
const { Canvas, Image, ImageData } = canvas
faceapi.env.monkeyPatch({ Canvas: Canvas as never, Image: Image as never, ImageData: ImageData as never });

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

    const repo = new FolderBasedOnePagers(await conf.explorer());
    const employees = await repo.getAllEmployees();

    await faceapi.nets.tinyFaceDetector.loadFromDisk('./models')

    mkdirSync(mediaDir, { recursive: true });

    for (const employee of employees) {
        const newest = (await repo.getAllOnePagersOfEmployee(employee)).reduce((acc, curr) => {
            return curr.lastUpdateByEmployee > (acc?.lastUpdateByEmployee || new Date(0)) ? curr : acc;
        }, undefined as OnePager | undefined);

        if (newest) {
            const pptxContent = await newest.data();
            const zip = new JSZip();
            const pptx = await zip.loadAsync(pptxContent);

            const slideRels = Object.keys(pptx.files).filter(file => file.match(/ppt\/slides\/_rels\/.+.xml.rels$/)).sort();
            const relImages = (await Promise.all(slideRels.map(async relFile => {
                const relContent = await pptx.files[relFile].async("nodebuffer");
                return await getImageRels(relContent);
            }))).flat().filter(rel => !['.emf', '.wmf', '.svg', '.wdp', '.tiff', '.tif'].some(ext => rel.endsWith(ext)));

            const uniqImages = relImages.filter(uniq)

            const usedMedia = uniqImages.map(img => pptx.files[`ppt/media/${img}`]);

            const withFaces = []
            for (const img of usedMedia) {
                //wdp
                try {
                    const input = await canvas.loadImage(await img.async("nodebuffer"));
                    const detections = await faceapi.detectAllFaces(input as never, new faceapi.TinyFaceDetectorOptions())
                    if (detections.length > 0) {
                        withFaces.push(img);
                    };
                } catch (err) {
                    console.error(`Error processing image ${img.name}:`, err);
                    return;
                }
            }
            console.log(`Found ${withFaces.length} images with faces for employee ${employee}:`);

            for (const file of withFaces) {
                const content = await file.async("nodebuffer");
                const filename = `${mediaDir}/${employee}_${file.name.split('/').pop()}`;
                console.log(`Writing media file: ${filename}`);
                writeFileSync(filename, content);
            }
        }
    }

}

type XmlRels = {
    Relationships: {
        Relationship: {
            $: {
                Id: string;
                Type: string;
                Target: string;
            }
        }[]
    }
}

async function getImageRels(data: Buffer): Promise<string[]> {
    const parser = new Parser();
    const xml: XmlRels = await parser.parseStringPromise(data);
    return xml.Relationships.Relationship.map(rel => rel.$.Target).filter(target => target.match(/..\/media\/[^\/]+$/)).map(target => target.slice('../media/'.length));
}

main().catch(err => {
    console.error("Error:", err);
    process.exit(1);
}).then(() => {
    console.log("Success");
});
