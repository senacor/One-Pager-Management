import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';

import * as faceDetection from '@tensorflow-models/face-detection';
import sharp from 'sharp';
import { fileSystem } from './node_file_system';
import { Local } from '../DomainTypes';
import { franc } from 'franc-min';

// Initialize TensorFlow.js for Node.js environment
let tfInitialized = false;
async function initializeTensorFlow() {
    if (!tfInitialized) {
        await tf.ready();
        await tf.setBackend('wasm');
        tfInitialized = true;
    }
}

const qualityModelPath = './models/photo-quality/model.json';
let qualityModelPromise: Promise<tf.LayersModel> | undefined;
function getQualityModel() {
    if (!qualityModelPromise) {
        qualityModelPromise = tf.loadLayersModel(fileSystem(qualityModelPath));
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
        // Ensure TensorFlow.js is initialized first
        await initializeTensorFlow();
        const faceModel = faceDetection.SupportedModels.MediaPipeFaceDetector;
        _detector = faceDetection.createDetector(faceModel, detectorConfig);
    }
    return await _detector;
};

export async function detectFaces(imageData: Buffer): Promise<faceDetection.Face[]> {
    await initializeTensorFlow();

    const img = await imageToTensor3D(imageData);

    try {
        return await (await detector()).estimateFaces(img);
    } finally {
        img.dispose();
    }
}

export interface PhotoLabels {
    brightBackground: number;
    neutralBackground: number;
    whiteShirt: number;
    highQuality: number;
    businessAttire: number;
}

export async function labelImage(imageData: Buffer): Promise<PhotoLabels> {
    await initializeTensorFlow();
    const input = (await imageToTensor3D(imageData, intelligentCenterCropAndResize))
        .toFloat()
        .div(tf.scalar(255.0));
    const batched = input.expandDims(0); // Add batch dimension: [1, height, width, 3]

    try {
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
    } finally {
        // Clean up tensor memory
        input.dispose();
        batched.dispose();
    }
}

const LOCAL_MAPPINGS: Record<string, Local> = {
    DEU: 'DE',
    ENG: 'EN',
};
export async function detectLanguage(text: string): Promise<Local | undefined> {
    const francResp = await franc(text);
    return LOCAL_MAPPINGS[francResp.toLocaleUpperCase()];
}

async function imageToTensor3D(
    imageData: Buffer,
    transform: (img: sharp.Sharp) => Promise<sharp.Sharp> = async i => i
): Promise<tf.Tensor3D> {
    const img = await transform(sharp(imageData));
    const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });

    return tf.tensor3d(data, [info.height, info.width, info.channels], 'int32');
}

async function intelligentCenterCropAndResize(
    img: sharp.Sharp,
    targetSize = 224
): Promise<sharp.Sharp> {
    const { width, height } = await img.metadata();
    // Center crop to square
    const minDim = Math.min(width, height);
    const left = Math.floor((width - minDim) / 2);
    const top = Math.floor((height - minDim) / 2);

    return img
        .extract({ left, top, width: minDim, height: minDim })
        .resize(targetSize, targetSize, { fit: 'fill', kernel: 'lanczos3' });
}
