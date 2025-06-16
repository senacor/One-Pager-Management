import { LoadedOnePager, Logger, ValidationRule } from '../DomainTypes';
import { detectFaces, labelImage, PhotoLabels } from './ai';
import { Pptx } from './Pptx';

export function hasPhoto(logger: Logger = console): ValidationRule {
    return async onePager => {
        const pptx = await Pptx.load(onePager.data);
        const usedImages = await pptx.getUsedImages();

        const withFaces = (
            await Promise.all(
                usedImages.map(async img => {
                    try {
                        const faces = await detectFaces(await img.data());

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

export function hasQualityPhoto(logger: Logger = console): ValidationRule {
    return async onePager => {
        const labels = await qualityOf(onePager);
        console.log(`Labels for one-pager ${onePager.webLocation.toString()}: ${JSON.stringify(labels)}`);
        const scores = labels.map(scorePhotoLabels);
        if (scores.every(score => score > 0.2)) {
            const avg = scores.reduce((a, b) => a + b) / scores.length;
            logger.log(`One-pager ${onePager.webLocation.toString()} has ${scores.length} photos with an average quality of ${avg}:`);
            return [];
        }
        logger.log(`One-pager ${onePager.webLocation.toString()} has low quality photos: ${JSON.stringify(scores)}`);
        return ['LOW_QUALITY_PHOTO'];
    };
}

export async function qualityOf(onePager: LoadedOnePager) {
    const pptx = await Pptx.load(onePager.data);
    const usedImages = await pptx.getUsedImages();

    const labels = await Promise.all(
        usedImages.map(async img => labelImage(await img.data()))
    );

    return labels;
}

export function scorePhotoLabels(labels: PhotoLabels): number {
    const weightedSum = Object
        .entries(labels)
        .map(([key, value]) => {
            const gained = gain(value, GAIN_K);
            const weight = LABEL_WEIGHTS[key as keyof PhotoLabels];
            return gained * weight;
        })
        .reduce((a, b) => a + b);

    const totalWeight = Object.values(LABEL_WEIGHTS).reduce((a, b) => a + b);
    return weightedSum / totalWeight;
}

const LABEL_WEIGHTS: PhotoLabels = {
    brightBackground: 2.0,
    neutralBackground: 1.0,
    whiteShirt: 1.0,
    highQuality: 3.0,
    businessAttire: 3.0
};
const GAIN_K = 3.0;

function gain(x: number, k: number): number {
    const v = x < 0.5 ? x : 1.0 - x;
    const a = 0.5 * Math.pow(2.0 * v, k);
    return x < 0.5 ? a : 1.0 - a;
}
