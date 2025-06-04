import { franc } from "franc-min";
import PptxParser from "node-pptx-parser";

async function doit() {
    await detect("Mustermann, Max_DE_240209.pptx");
    await detect("Jeziorska_Agnieszka_EN_250425.pptx");
    await detect("en+de.pptx");
    await detect("Walke_Adrian_DE_240201.pptx");
}

async function detect(ex: string) {
    console.log(`Detecting languages in: ${ex}`);

    const slides = await new PptxParser("examples/" + ex).extractText();
    console.log(`PptxParser detected ${JSON.stringify(slides.map(slide => ({ id: slide.id, path: slide.path })))}`);

    for (const [i, slide] of slides.entries()) {
        console.log(`Slide ${i + 1} (${slide.id}, ${slide.path}):`);

        const francResp = await franc(slide.text.join("\n"));
        console.log(`Franc Detected language: ${francResp}`);

        console.log("")
    }
}

doit().catch(err => {
    console.error("Error:", err);
    process.exit(1);
}).then(() => {
    console.log("Success");
});
