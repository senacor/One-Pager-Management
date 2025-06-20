import { Logger, ValidationRule } from '../DomainTypes';
import { detectFaces, labelImage, PhotoLabels } from './ai';
import { PptxImage } from './Pptx';

export function hasPhoto(logger: Logger = console): ValidationRule {
    return async onePager  => {
        const usedImages = await onePager.pptx.getUsedImages();

        const withFaces = (
            await Promise.all(
                usedImages.map(async img => {
                    try {
                        const faces = await detectFaces(await img.data());

                        if (faces.length > 0) {
                            return img;
                        }
                    } catch (err) {
                        logger.error(`Error processing image ${img.path}:`, err);
                    }
                })
            )
        ).filter(Boolean);

        return withFaces.length === 0 ? ['MISSING_PHOTO'] : [];
    };
}

export const QUALITY_THRESHOLD = 0.2;

export function hasQualityPhoto(logger: Logger = console): ValidationRule {
    return async onePager => {
        const usedImages = await onePager.pptx.getUsedImages();

        const scored = await Promise.all(
            usedImages.map(async img => ((await hasLowQuality(img)) ? [img] : []))
        );

        const lowQualityPhotos = scored.flat();
        if (lowQualityPhotos.length === 0) {
            logger.log(`One-pager ${onePager.webLocation.toString()} has no low quality photos.`);
            return [];
        }

        logger.warn(
            `One-pager ${onePager.webLocation.toString()} has ${lowQualityPhotos.length} low quality photos!`
        );
        return ['LOW_QUALITY_PHOTO'];
    };
}

export async function hasLowQuality(img: PptxImage): Promise<boolean> {
    const labels = await labelImage(await img.data());
    const score = scorePhotoLabels(labels);
    return score < QUALITY_THRESHOLD;
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
