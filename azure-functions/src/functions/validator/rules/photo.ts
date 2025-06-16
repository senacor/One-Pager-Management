import { Parser } from 'xml2js';
import { Logger, ValidationRule } from '../DomainTypes';
import JSZip from 'jszip';
import { uniq } from '../OnePagerValidation';
import * as faceDetection from '@tensorflow-models/face-detection';
import * as canvas from 'canvas';
import { tensor3d, Tensor3D } from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';

const model = faceDetection.SupportedModels.MediaPipeFaceDetector;

export const detectorConfig = {
    runtime: 'tfjs' as const,
    maxFaces: 1
};

let _detector: Promise<faceDetection.FaceDetector> | undefined;
const detector = async () => {
    if (!_detector) {
        _detector = faceDetection.createDetector(model, detectorConfig);

    }
    return await _detector;
};


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

        const detect = await detector();

        const withFaces = (
            await Promise.all(
                usedMedia.map(async img => {
                    try {
                        const input = await imageToTensor3D(await img.async('nodebuffer'));

                        const faces = await detect.estimateFaces(input);

                        if (faces.length > 0) {
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

async function imageToTensor3D(imageData: Buffer): Promise<Tensor3D> {
    const img = await canvas.loadImage(imageData);
    const canvasEl = canvas.createCanvas(img.width, img.height);
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, img.width, img.height);
    // data is [R,G,B,A,...], shape [height, width, 4]
    // Remove alpha channel:
    const rgb = [];
    for (let i = 0; i < data.length; i += 4) {
        rgb.push(data[i], data[i + 1], data[i + 2]);
    }
    const tensor = tensor3d(rgb, [height, width, 3], 'int32');
    return tensor;
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
