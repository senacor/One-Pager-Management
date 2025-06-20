import { Parser } from 'xml2js';
import JSZip from 'jszip';
import { uniq } from '../OnePagerValidation';
import { Local } from '../DomainTypes';
import { detectLanguage } from './ai';
import { createHash } from 'crypto';

const UNPARSEABLE_IMAGE_EXTENSIONS = ['.emf', '.wmf', '.svg', '.wdp', '.tiff', '.tif'];
const SUPERFLUOS_TEXT_BODIES = [
    'Senacor Technologies AG',
    'kundenanonyme Fassung',
    'optionale Ergänzungen',
];
const ONEPAGER_SECTION_COUNT = 3; // we expect at least a section for name, position, and other descriptions

export class Pptx {
    private readonly zip: JSZip;
    private _slides?: Promise<PptxSlide[]>;

    private constructor(zip: JSZip) {
        this.zip = zip;
    }

    static async load(data: Buffer): Promise<Pptx> {
        const zip = new JSZip();
        return new Pptx(await zip.loadAsync(data));
    }

    async getSlides(): Promise<PptxSlide[]> {
        if (!this._slides) {
            this._slides = this.loadSlides();
        }
        return this._slides;
    }

    async getOnePagerSlides(): Promise<PptxSlide[]> {
        return (await this.getSlides()).filter(slide => slide.isOnePager);
    }

    private async loadSlides(): Promise<PptxSlide[]> {
        const pre = await this.parseXml<XmlPresentation>('ppt/presentation.xml');
        const preRels = await this.parseXml<XmlRels>('ppt/_rels/presentation.xml.rels');

        const slideList = pre['p:presentation']['p:sldIdLst']
            .flatMap(sldIdLst => sldIdLst['p:sldId'])
            .map(sldId => sldId.$['r:id']);
        const presSlideRels = preRels.Relationships.Relationship.reduce(
            (acc, rel) => ({ ...acc, [rel.$.Id]: `ppt/${rel.$.Target}` }),
            {} as Record<string, string>
        );

        const orderedSlidePaths = slideList.map(sldId => presSlideRels[sldId]);
        return await Promise.all(orderedSlidePaths.map(path => ZipPptxSlide.create(this, path)));
    }

    async parseXml<T>(filePath: string): Promise<T> {
        const parser = new Parser();
        return await parser.parseStringPromise(await this.loadFile(filePath));
    }

    loadFile(filePath: string): Promise<Buffer> {
        const file = this.zip.file(filePath);
        if (!file) {
            throw new Error(`No ${filePath} found in the PPTX file: ${Object.keys(this.zip.files).join(', ')}`);
        }
        return file.async('nodebuffer');
    }

    filesOf(folder: string): string[] {
        return Object.keys(this.zip.files).filter(file => file.startsWith(folder) && file.length > folder.length && !file.endsWith('/'));
    }

    async getContentLanguages(): Promise<Local[]> {
        const slides = await this.getSlides();
        const langs = await Promise.all(slides.map(slide => slide.usedLanguage));
        return langs.filter(uniq).filter(lang => lang !== undefined);
    }

    async getUsedImages(): Promise<PptxImage[]> {
        const onePagerSlides = await this.getOnePagerSlides();
        return (await Promise.all(onePagerSlides.map(slide => slide.images)))
            .flat()
            .filter(uniq);
    }

    async getOnePagerThemes(): Promise<PptxTheme[]> {
        const onePagerSlides = await this.getOnePagerSlides();
        const themes = await Promise.all(onePagerSlides.map(slide => slide.theme));
        const digists = themes.map(theme => theme.digest);
        return themes.filter((item, pos) => {
            return digists.indexOf(item.digest) === pos;
        });
    }
}

export interface PptxSlide {
    isOnePager: boolean;
    texts: string[];
    images: PptxImage[];
    usedLanguage?: Local;
    theme: PptxTheme;
}

export interface PptxTheme {
    name: string;
    path: string;
    digest: string;
}

class ZipPptxSlide implements PptxSlide {
    readonly path: string;
    readonly isOnePager: boolean;
    readonly texts: string[];
    readonly images: PptxImage[];
    readonly usedLanguage: Local | undefined;
    readonly theme: PptxTheme;

    constructor(path: string, isOnePager: boolean, texts: string[], images: PptxImage[], usedLanguage: Local | undefined, theme: PptxTheme) {
        this.path = path;
        this.isOnePager = isOnePager;
        this.texts = texts;
        this.images = images;
        this.usedLanguage = usedLanguage;
        this.theme = theme;
    }

    static async create(pptx: Pptx, path: string): Promise<PptxSlide> {
        const last = path.lastIndexOf('/');
        const slideRels = pptx.parseXml<XmlRels>(`ppt/slides/_rels/${path.substring(last + 1)}.rels`);
        const slide = pptx.parseXml<XmlSlide>(path);


        const images = this.imagesFrom(await slideRels);
        const texts = this.texts(await slide);

        const usedLanguage = detectLanguage(texts.join('\n'));
        const isOnePager = this.isOnePager(texts);

        const theme = this.discoverTheme(await slideRels, pptx);

        return new ZipPptxSlide(path, await isOnePager, texts, images.map(i => new ZipPptxImage(pptx, i)), await usedLanguage, await theme);
    }

    private static async isOnePager(texts: string[]): Promise<boolean> {
        return texts.filter(t => !t.startsWith('Ergänzung: ')).length >= ONEPAGER_SECTION_COUNT;;
    }

    private static texts(slide: XmlSlide) {
        const txtBodies = extractTextFromSlide(slide);

        return txtBodies
            .map(txt => txt.trim())
            .filter(t => {
                return (
                    t.length > 0 &&
                    SUPERFLUOS_TEXT_BODIES.indexOf(t) === -1 &&
                    !/\d{2}\.\d{2}\.\d{4}/.test(t) // we have the date in the footer, so we can ignore it here
                );
            });
    }

    private static imagesFrom(rels: XmlRels): string[] {
        return rels.Relationships.Relationship.map(rel => rel.$.Target)
            .filter(target => target.match(/\.\.\/media\/[^/]+$/))
            .map(target => `ppt/${target.substring('../'.length)}`)
            .filter(path => !UNPARSEABLE_IMAGE_EXTENSIONS.some(ext => path.endsWith(ext)))
            .filter(uniq);
    }

    private static async discoverTheme(rels: XmlRels, pptx: Pptx): Promise<PptxTheme> {
        const layoutRel = rels.Relationships.Relationship.find(rel =>
            rel.$.Type.endsWith('/slideLayout')
        )?.$.Target;

        for (const masterRelFile of pptx.filesOf('ppt/slideMasters/_rels/')) {
            const mXml = await pptx.parseXml<XmlRels>(masterRelFile);
            if (!mXml.Relationships.Relationship.some(rel => rel.$.Target === layoutRel)) {
                continue;
            }
            const themeRel = mXml.Relationships.Relationship.find(rel =>
                rel.$.Type.endsWith('/theme')
            );
            if (!themeRel) {
                console.warn(`no theme found in matching master rel file ${masterRelFile}: ${JSON.stringify(mXml.Relationships.Relationship)}`);
                continue;
            }

            const themeTarget = themeRel.$.Target;
            const path = `ppt/${themeTarget.substring('../'.length)}`;

            const content = await pptx.loadFile(path);

            const hash = createHash('md5');
            hash.update(content);
            const digest = hash.digest('hex');

            const [, name] =
                /<a:theme [^>]+ name="(?:\d_)?([^"]+)">/.exec(content.toString()) || [];

            return { name, path, digest };
        }

        throw new Error(`No theme found`);
    }
}

export interface PptxImage {
    path: string;
    data(): Promise<Buffer>;
}

class ZipPptxImage implements PptxImage {
    readonly path: string;
    private readonly pptx: Pptx;

    constructor(pptx: Pptx, path: string) {
        this.pptx = pptx;
        this.path = path;
    }

    data(): Promise<Buffer> {
        return this.pptx.loadFile(this.path);
    }
}

function extractTextFromSlide(slideData: XmlSlide): string[] {
    if (!slideData['p:sld'] || !slideData['p:sld']['p:cSld']) {
        return [];
    }

    const textBody = slideData['p:sld']['p:cSld']
        .flatMap(cSld => cSld['p:spTree'] || [])
        .flatMap(spTree => spTree['p:sp'] || [])
        .flatMap(sp => sp['p:txBody'] || []);

    return textBody.map(tx => {
        const paragraphs = tx['a:p'] || [];

        const snippets = paragraphs.map(p => {
            const parts = (p['a:r'] || []).flatMap(r => r['a:t'] || []);
            if (p['a:br']) {
                parts.push('\n');
            }

            // Handle explicit line breaks
            if (p['a:br']) {
                parts.push('\n');
            }

            // Handle paragraph breaks
            if (parts.length === 0 || p['a:endParaRPr']) {
                parts.push('\n');
            }

            return parts.join('');
        });

        return snippets.join('\n');
    });
}

type XmlPresentation = {
    'p:presentation': {
        'p:sldIdLst': Array<{
            'p:sldId': Array<{
                $: {
                    'r:id': string;
                };
            }>;
        }>;
    };
};

type XmlRels = {
    Relationships: {
        Relationship: Array<{
            $: {
                Id: string;
                Type: string;
                Target: string;
            };
        }>;
    };
};

type XmlSlide = {
    'p:sld'?: {
        'p:cSld'?: Array<{
            'p:spTree'?: Array<{
                'p:sp'?: Array<{
                    'p:txBody'?: Array<{
                        'a:p'?: Array<{
                            'a:r'?: Array<{
                                'a:t'?: Array<string>;
                            }>;
                            'a:br'?: never;
                            'a:endParaRPr'?: never;
                        }>;
                    }>;
                }>;
            }>;
        }>;
    };
};
