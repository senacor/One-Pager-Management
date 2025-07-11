import { ValidationError, ValidationErrorEnum, ValidationRule } from '../DomainTypes';
import { detectFaces, labelImage, labelImageAvailable, PhotoLabels } from './ai';
import { PptxImage } from './Pptx';

export const QUALITY_THRESHOLD = 0.2;

export const checkImages: ValidationRule = async onePager => {
    const usedImages = await onePager.pptx.getValidUsedImages();

    const withFaces = await extractPhotosWithFaces(usedImages);

    const errors: ValidationError[] = [];

    if (withFaces.length !== usedImages.length) {
        errors.push(ValidationErrorEnum.OTHER_IMAGES);
    }
    if (withFaces.length === 0) {
        errors.push(ValidationErrorEnum.MISSING_PHOTO);
    }

    if (labelImageAvailable()) {
        const scored = await Promise.all(withFaces.map(scoreQuality));
        if (scored.some(score => score < QUALITY_THRESHOLD)) {
            errors.push(ValidationErrorEnum.LOW_QUALITY_PHOTO);
        }
    }
    return errors;
};

export const checkIfImagesExistAtAll: ValidationRule = async onePager => {
    const usedImageNames = await onePager.pptx.getAllUsedImageNames();

    const errors: ValidationError[] = [];

    if (usedImageNames.length === 0) {
        errors.push(ValidationErrorEnum.NO_IMAGES);
    }

    return errors;
};

export async function extractPhotosWithFaces(images: PptxImage[]): Promise<PptxImage[]> {
    return (
        await Promise.all(
            images.map(async img => {
                const faces = await detectFaces(await img.data());

                return faces.length > 0 ? [img] : [];
            })
        )
    ).flat();
}

export async function scoreQuality(img: PptxImage): Promise<number> {
    const labels = await labelImage(await img.data());
    return scorePhotoLabels(labels);
}

function scorePhotoLabels(labels: PhotoLabels): number {
    const weighted = Object.entries(labels).map(([key, value]) => {
        const gained = gain(value, GAIN_K);
        const weight = LABEL_WEIGHTS[key as keyof PhotoLabels];
        return gained * weight;
    });
    const weightedSum = weighted.reduce((a, b) => a + b);

    const totalWeight = Object.values(LABEL_WEIGHTS).reduce((a, b) => a + b);
    const score = weightedSum / totalWeight;
    return score;
}

const LABEL_WEIGHTS: PhotoLabels = {
    brightBackground: 2.0,
    neutralBackground: 1.0,
    whiteShirt: 1.0,
    highQuality: 3.0,
    businessAttire: 3.0,
};
const GAIN_K = 3.0;

function gain(x: number, k: number): number {
    const v = x < 0.5 ? x : 1.0 - x;
    const a = 0.5 * Math.pow(2.0 * v, k);
    return x < 0.5 ? a : 1.0 - a;
}
