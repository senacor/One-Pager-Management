import * as tf from '@tensorflow/tfjs-node';
import '@tensorflow/tfjs-backend-cpu';

import * as faceDetection from '@tensorflow-models/face-detection';

import decode from 'image-decode';


const qualityModelPath = './models/photo-quality/model.json';
let qualityModelPromise: Promise<tf.LayersModel> | undefined;
function getQualityModel() {
    if (!qualityModelPromise) {
        // Use tf.io.fileSystem for local files in Node.js (not tf.io.file)
        qualityModelPromise = tf.loadLayersModel(tf.io.fileSystem(qualityModelPath));
    }
    return qualityModelPromise;
}

export const detectorConfig = {
    runtime: 'tfjs' as const,
    maxFaces: 1,
};

let _detector: Promise<faceDetection.FaceDetector> | undefined;
const detector = async () => {
    if (!_detector) {
        const faceModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
        _detector = faceDetection.createDetector(faceModel, detectorConfig);
    }
    return await _detector;
};

export async function detectFaces(imageData: Buffer): Promise<faceDetection.Face[]> {
    await tf.setBackend('cpu'); // tensorflow backend is missing some image operations
    await tf.ready();
    const input = await imageToTensor3D(imageData);
    return (await detector()).estimateFaces(input);
}

export interface PhotoLabels {
    brightBackground: number;
    neutralBackground: number;
    whiteShirt: number;
    highQuality: number;
    businessAttire: number;
}

export async function labelImage(imageData: Buffer): Promise<PhotoLabels> {
    await tf.setBackend('tensorflow'); // tensorflow is faster then cpu backend
    await tf.ready();
    const input = (await imageToTensor3D(imageData, intelligentCenterCropAndResize)).toFloat().div(tf.scalar(255.0));
    const batched = input.expandDims(0); // Add batch dimension: [1, height, width, 3]
    const model = await getQualityModel();

    const [prediction] = (await (model.predict(batched) as tf.Tensor).array()) as number[][]; // because its batched we have an extra dimension
    if (prediction.length !== 5) {
        throw new Error(`Unexpected prediction length: ${prediction.length}. Expected 5.`);
    }
    const [brightBackground, neutralBackground, whiteShirt, highQuality, businessAttire] =
        prediction;
    return {
        brightBackground,
        neutralBackground,
        whiteShirt,
        highQuality,
        businessAttire,
    };
}

async function imageToTensor3D(
    imageData: Buffer,
    transform: (img: decode.DecodedImage) => decode.DecodedImage = i => i
): Promise<tf.Tensor3D> {
    const { data, width, height } = transform(decode(imageData));
    // data is [R,G,B,A,...], shape [height, width, 4]
    // Remove alpha channel:
    const rgb = [];
    for (let i = 0; i < data.length; i += 4) {
        rgb.push(data[i], data[i + 1], data[i + 2]);
    }
    return tf.tensor3d(rgb, [height, width, 3], 'int32');
}

function boxDownscaleRGBA(
    src: Uint8ClampedArray,
    srcW: number,
    srcH: number,
    dstW: number,
    dstH: number
): Uint8ClampedArray {
    const dst = new Uint8ClampedArray(dstW * dstH * 4);
    const xRatio = srcW / dstW;
    const yRatio = srcH / dstH;
    for (let dy = 0; dy < dstH; dy++) {
        for (let dx = 0; dx < dstW; dx++) {
            const sx0 = dx * xRatio;
            const sx1 = (dx + 1) * xRatio;
            const sy0 = dy * yRatio;
            const sy1 = (dy + 1) * yRatio;
            let r = 0,
                g = 0,
                b = 0,
                a = 0,
                count = 0;
            for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy++) {
                for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx++) {
                    if (sx >= 0 && sx < srcW && sy >= 0 && sy < srcH) {
                        const idx = (sy * srcW + sx) * 4;
                        r += src[idx];
                        g += src[idx + 1];
                        b += src[idx + 2];
                        a += src[idx + 3];
                        count++;
                    }
                }
            }
            const didx = (dy * dstW + dx) * 4;
            dst[didx] = Math.round(r / count);
            dst[didx + 1] = Math.round(g / count);
            dst[didx + 2] = Math.round(b / count);
            dst[didx + 3] = Math.round(a / count);
        }
    }
    return dst;
}

function intelligentCenterCropAndResize(
    img: decode.DecodedImage,
    targetSize = 224
): decode.DecodedImage {
    const { data, width, height } = img;
    // Center crop to square
    const minDim = Math.min(width, height);
    const left = Math.floor((width - minDim) / 2);
    const top = Math.floor((height - minDim) / 2);

    // Crop to square (RGBA)
    let current = new Uint8ClampedArray(minDim * minDim * 4);
    for (let y = 0; y < minDim; y++) {
        for (let x = 0; x < minDim; x++) {
            const srcIdx = ((y + top) * width + (x + left)) * 4;
            const dstIdx = (y * minDim + x) * 4;
            current[dstIdx] = data[srcIdx]; // R
            current[dstIdx + 1] = data[srcIdx + 1]; // G
            current[dstIdx + 2] = data[srcIdx + 2]; // B
            current[dstIdx + 3] = data[srcIdx + 3]; // A
        }
    }

    let currentW = minDim;
    let currentH = minDim;
    // Iteratively downscale by factor of 2 using box filter until close to target size
    while (currentW > targetSize * 2 && currentH > targetSize * 2) {
        const nextW = Math.max(targetSize, Math.floor(currentW / 2));
        const nextH = Math.max(targetSize, Math.floor(currentH / 2));
        current = boxDownscaleRGBA(current, currentW, currentH, nextW, nextH);
        currentW = nextW;
        currentH = nextH;
    }
    // Final resize to target size (if not exact)
    if (currentW !== targetSize || currentH !== targetSize) {
        current = boxDownscaleRGBA(current, currentW, currentH, targetSize, targetSize);
        currentW = targetSize;
        currentH = targetSize;
    }
    return {
        data: current,
        width: currentW,
        height: currentH,
    };
}
