import { Parser } from 'xml2js';
import { Logger, ValidationRule } from '../DomainTypes';
import JSZip from 'jszip';
import { uniq } from '../OnePagerValidation';

// import nodejs bindings to native tensorflow,
// not required, but will speed up things drastically (python required)
import '@tensorflow/tfjs-node';

// implements nodejs wrappers for HTMLCanvasElement, HTMLImageElement, ImageData
import * as canvas from 'canvas';

import * as faceapi from '@vladmandic/face-api';

// patch nodejs environment, we need to provide an implementation of
// HTMLCanvasElement and HTMLImageElement, additionally an implementation
// of ImageData is required, in case you want to use the MTCNN
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({
    Canvas: Canvas as never,
    Image: Image as never,
    ImageData: ImageData as never,
});

const model = faceapi.nets.tinyFaceDetector.loadFromDisk('./models');

export function hasPhoto(logger: Logger = console): ValidationRule {
    return async onePager => {
        await model;

        const zip = new JSZip();
        const pptx = await zip.loadAsync(onePager.data);

        const slideRels = Object.keys(pptx.files)
            .filter(file => file.match(/ppt\/slides\/_rels\/.+\.xml\.rels$/))
            .sort();
        const relImages = (
            await Promise.all(
                slideRels.map(async relFile => {
                    const relContent = await pptx.files[relFile].async('nodebuffer');
                    return await getImageRels(relContent);
                })
            )
        )
            .flat()
            .filter(
                rel =>
                    !['.emf', '.wmf', '.svg', '.wdp', '.tiff', '.tif'].some(ext =>
                        rel.endsWith(ext)
                    )
            );

        const uniqImages = relImages.filter(uniq);

        const usedMedia = uniqImages.map(img => pptx.files[`ppt/media/${img}`]);

        const withFaces = (
            await Promise.all(
                usedMedia.map(async img => {
                    try {
                        const input = await canvas.loadImage(await img.async('nodebuffer'));
                        const detections = await faceapi.detectAllFaces(
                            input as never,
                            new faceapi.TinyFaceDetectorOptions()
                        );
                        if (detections.length > 0) {
                            return img;
                        }
                    } catch (err) {
                        logger.error(`Error processing image ${img.name}:`, err);
                    }
                })
            )
        ).filter(Boolean);

        return withFaces.length === 0 ? ['MISSING_PHOTO'] : [];
    };
}

type XmlRels = {
    Relationships: {
        Relationship: {
            $: {
                Id: string;
                Type: string;
                Target: string;
            };
        }[];
    };
};

async function getImageRels(data: Buffer): Promise<string[]> {
    const parser = new Parser();
    const xml: XmlRels = await parser.parseStringPromise(data);
    return xml.Relationships.Relationship.map(rel => rel.$.Target)
        .filter(target => target.match(/\.\.\/media\/[^/]+$/))
        .map(target => target.slice('../media/'.length));
}
