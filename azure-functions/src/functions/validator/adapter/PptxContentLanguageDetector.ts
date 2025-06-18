import PptxParser from 'node-pptx-parser';
import { LanguageDetector, Local, Logger } from '../DomainTypes';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { franc } from 'franc-min';
import { uniq } from '../OnePagerValidation';

type PresentationXml = {
    "p:presentation": {
        "p:sldIdLst": Array<{
            "p:sldId": Array<{
                $: {
                    "r:id": string;
                }
            }>
        }>
    }
}

type RelationshipsXml = {
    Relationships: {
        Relationship: Array<{
            $: {
                Id: string;
                Target: string;
            };
        }>;
    };
};

export class PptxContentLanguageDetector implements LanguageDetector {
    private readonly logger: Logger;

    constructor(logger: Logger = console) {
        this.logger = logger;
    }

    async detectLanguage(content: Buffer): Promise<Local[]> {
        // Write buffer to a temporary file
        const tmpDir = os.tmpdir();
        const tmpFile = path.join(
            tmpDir,
            `pptx-${Date.now()}-${Math.random().toString(36).slice(2)}.pptx`
        );

        try {
            // we need to order slides by their order in the presentation
            await fs.writeFile(tmpFile, content);
            const pptx = await new PptxParser(tmpFile).parse();
            const presSlideRels = (pptx.relationships.parsed as RelationshipsXml).Relationships.Relationship.reduce((acc, rel) => ({ ...acc, [rel.$.Id]: `ppt/${rel.$.Target}` }), {} as Record<string, string>);
            const slideList = (pptx.presentation.parsed as PresentationXml)['p:presentation']['p:sldIdLst'].flatMap(sldIdLst => sldIdLst['p:sldId']).map(sldId => sldId.$['r:id']);
            const orderedSlidePaths = slideList.map(sldId => presSlideRels[sldId]);
            const slides = (await new PptxParser(tmpFile).extractText()).sort((a, b) => orderedSlidePaths.indexOf(a.path) - orderedSlidePaths.indexOf(b.path));

            return (
                await Promise.all(
                    slides.map(async (slide, i) => {
                        const contentSections = slide.text.map(t => t.trim()).filter(realContent);

                        const slideDescr = `${i + 1} (${slide.path})`;
                        // we expect at least a section for name, position, and other descriptions
                        if (contentSections.length < 3) {
                            this.logger.warn(`No real content found on slide ${slideDescr}. Skipping language detection.`);
                            return [];
                        }

                        const text = contentSections.join('\n');
                        const francResp = await franc(text);
                        const lang = francResp.toLocaleUpperCase();
                        switch (lang) {
                            case 'DEU': {
                                this.logger.log(`Detected language DE on slide ${slideDescr}`);
                                return 'DE';
                            }
                            case 'ENG': {
                                this.logger.log(`Detected language EN on slide ${slideDescr}`);
                                return 'EN';
                            }
                            default: {
                                this.logger.warn(
                                    `Detected language ${lang} on slide ${slideDescr} is not a valid local in the context of OnePagers.`
                                );
                                return [];
                            }
                        }
                    })
                )
            )
                .flat()
                .filter(uniq);
        } finally {
            // Clean up the temporary file
            await fs.rm(tmpFile).catch(() => { });
        }
    }
}

function realContent(text: string): boolean {
    return (
        text.length > 0 &&
        ['Senacor Technologies AG', 'kundenanonyme Fassung', 'optionale Ergänzungen'].indexOf(text) === -1 &&
        !/\d{2}\.\d{2}\.\d{4}/.test(text) &&
        !text.startsWith('Ergänzung: ')
    );
}
