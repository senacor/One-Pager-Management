import PptxParser from 'node-pptx-parser';
import { LanguageDetector, Local, Logger } from '../DomainTypes';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { franc } from 'franc-min';
import { uniq } from '../OnePagerValidation';

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
            await fs.writeFile(tmpFile, content);
            const slides = await new PptxParser(tmpFile).extractText();

            return (
                await Promise.all(
                    slides.map(async (slide, i) => {
                        const francResp = await franc(slide.text.join('\n'));
                        const lang = francResp.toLocaleUpperCase();
                        switch (lang) {
                            case 'DEU': {
                                this.logger.log(`Detected language DE on slide ${i + 1}`);
                                return 'DE';
                            }
                            case 'ENG': {
                                this.logger.log(`Detected language EN on slide ${i + 1}`);
                                return 'EN';
                            }
                            default: {
                                this.logger.warn(
                                    `Detected language ${lang} on slide ${i + 1} is not a valid Local.`
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
            await fs.rm(tmpFile).catch(() => {});
        }
    }
}
