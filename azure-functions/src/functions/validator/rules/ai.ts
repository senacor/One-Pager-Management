import * as tf from '@tensorflow/tfjs';
import * as canvas from 'canvas';
import * as faceDetection from '@tensorflow-models/face-detection';

import '@tensorflow/tfjs-backend-cpu';
import path from 'path';

const faceModel = faceDetection.SupportedModels.MediaPipeFaceDetector;

const qualityModelPath = path.join(__dirname, '../models/photo-quality/model.json');
let qualityModelPromise: Promise<tf.LayersModel> | undefined;
function getQualityModel() {
    if (!qualityModelPromise) {
        qualityModelPromise = tf.loadLayersModel(`file://${qualityModelPath}`);
    }
    return qualityModelPromise;
}

export const detectorConfig = {
    runtime: 'tfjs' as const,
    maxFaces: 1
};

let _detector: Promise<faceDetection.FaceDetector> | undefined;
const detector = async () => {
    if (!_detector) {
        _detector = faceDetection.createDetector(faceModel, detectorConfig);

    }
    return await _detector;
};

export async function detectFaces(imageData: Buffer): Promise<faceDetection.Face[]> {
    await faceModel;
    const input = await imageToTensor3D(imageData, copyToCanvas);
    return (await detector()).estimateFaces(input);
}

export interface PhotoLabels {
    brightBackground: number,
    neutralBackground: number,
    whiteShirt: number,
    highQuality: number,
    businessAttire: number
}

export async function labelImage(imageData: Buffer): Promise<PhotoLabels> {
    const input = await imageToTensor3D(imageData, intelligentCenterCropAndResize);
    const batched = input.expandDims(0); // Add batch dimension: [1, height, width, 3]
    const model = await getQualityModel();
    const prediction = model.predict(batched) as tf.Tensor;
    const [brightBackground, neutralBackground, whiteShirt, highQuality, businessAttire] = await prediction.array() as number[];
    return {
        brightBackground,
        neutralBackground,
        whiteShirt,
        highQuality,
        businessAttire
    };
}

async function imageToTensor3D(imageData: Buffer, toCanvas: (data: canvas.Image) => canvas.Canvas): Promise<tf.Tensor3D> {
    const img = await canvas.loadImage(imageData);
    const processedCanvas = toCanvas(img);
    const ctx = processedCanvas.getContext('2d');
    const { data, width, height } = ctx.getImageData(0, 0, processedCanvas.width, processedCanvas.height);
    // data is [R,G,B,A,...], shape [height, width, 4]
    // Remove alpha channel:
    const rgb = [];
    for (let i = 0; i < data.length; i += 4) {
        rgb.push(data[i], data[i + 1], data[i + 2]);
    }
    const tensor = tf.tensor3d(rgb, [height, width, 3], 'int32');
    return tensor;
}

function copyToCanvas(img: canvas.Image): canvas.Canvas {
    const canvasEl = canvas.createCanvas(img.width, img.height);
    const ctx = canvasEl.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return canvasEl;
}

function intelligentCenterCropAndResize(img: canvas.Image, targetSize = 224): canvas.Canvas {
    // Center crop to square
    const minDim = Math.min(img.width, img.height);
    const left = Math.floor((img.width - minDim) / 2);
    const top = Math.floor((img.height - minDim) / 2);

    // Crop
    const cropCanvas = canvas.createCanvas(minDim, minDim);
    const cropCtx = cropCanvas.getContext('2d');
    cropCtx.drawImage(img, left * -1, top * -1);

    // Resize
    const resizeCanvas = canvas.createCanvas(targetSize, targetSize);
    const resizeCtx = resizeCanvas.getContext('2d');
    resizeCtx.drawImage(cropCanvas, 0, 0, targetSize, targetSize);
    return resizeCanvas;
}
