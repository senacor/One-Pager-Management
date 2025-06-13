import { Parser } from 'xml2js';
import JSZip from 'jszip';
import { uniq } from '../OnePagerValidation';

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

export interface PptxImage {
    name: string;
    data: () => Promise<Buffer>;
}

export class Pptx {
    private readonly zip: JSZip;

    private constructor(zip: JSZip) {
        this.zip = zip;
    }

    static async load(data: Buffer): Promise<Pptx> {
        const zip = new JSZip();
        return new Pptx(await zip.loadAsync(data));
    }

    async getUsedImages(): Promise<PptxImage[]> {
        const slideRels = Object.keys(this.zip.files)
            .filter(file => file.match(/ppt\/slides\/_rels\/.+\.xml\.rels$/))
            .sort();
        const relImages = (
            await Promise.all(
                slideRels.map(async relFile => {
                    const relContent = await this.zip.files[relFile].async('nodebuffer');
                    return await this.getImageRels(relContent);
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

        const usedMedia = uniqImages.map(img => this.zip.files[`ppt/media/${img}`]);

        return usedMedia.map(img => ({
            name: img.name,
            data: () => img.async('nodebuffer')
        }));
    }

    private async getImageRels(data: Buffer): Promise<string[]> {
        const parser = new Parser();
        const xml: XmlRels = await parser.parseStringPromise(data);
        return xml.Relationships.Relationship.map(rel => rel.$.Target)
            .filter(target => target.match(/\.\.\/media\/[^/]+$/))
            .map(target => target.slice('../media/'.length));
    }
}
