import fs from "node:fs";
import PPTX from "nodejs-pptx";

// url: https://senacor.sharepoint.com/teams/MaInfoTest/_layouts/15/download.aspx?UniqueId=f1a46006-17a8-41ce-b4c6-fdbfdf843ad5&Translate=false&tempauth=v1.eyJzaXRlaWQiOiI0ZjVjZjlkNC1iNGMyLTQyZWYtYTYzOC0wN2MyNmM5MjdhZmIiLCJhcHBfZGlzcGxheW5hbWUiOiJHcmFwaCBFeHBsb3JlciIsImFwcGlkIjoiZGU4YmM4YjUtZDlmOS00OGIxLWE4YWQtYjc0OGRhNzI1MDY0IiwiYXVkIjoiMDAwMDAwMDMtMDAwMC0wZmYxLWNlMDAtMDAwMDAwMDAwMDAwL3NlbmFjb3Iuc2hhcmVwb2ludC5jb21ANTI0OTdlYzItMDk0NS00ZjU1LTgwMjEtNzk3NjYzNjNkZDk2IiwiZXhwIjoiMTc0ODI1ODYxNiJ9.CgoKBHNuaWQSAjY0EgsI_uC-iK2Sjj4QBRoOMjAuMTkwLjE5MC4xMDAqLGk5ODZLMDMvNGtFSmFKcU1oS3pFM2VUWW1TaDlPaTN3cjVDaklJY29SOHc9MIcBOAFCEKGh5LXrIADAzfXWmdYiK2xKEGhhc2hlZHByb29mdG9rZW5SCFsia21zaSJdcikwaC5mfG1lbWJlcnNoaXB8MTAwMzIwMDQ2MmI2MmIyN0BsaXZlLmNvbXoBMoIBEgnCfklSRQlVTxGAIXl2Y2PdlpIBBkFydGpvbZoBCEtvbnNjaGluogEbYXJ0am9tLmtvbnNjaGluQHNlbmFjb3IuY29tqgEQMTAwMzIwMDQ2MkI2MkIyN7IBTGFsbGZpbGVzLndyaXRlIGdyb3VwLndyaXRlIGFsbHNpdGVzLndyaXRlIGFsbHByb2ZpbGVzLnJlYWQgYWxscHJvZmlsZXMud3JpdGXIAQE.i4xkY-vh43Pk2vy5EJFxVsYALIvhp3OVfen_ZVxwYSA&ApiVersion=2.0
const url = "https://senacor.sharepoint.com/teams/MaInfoTest/_layouts/15/download.aspx?UniqueId=f1a46006-17a8-41ce-b4c6-fdbfdf843ad5&Translate=false&tempauth=v1.eyJzaXRlaWQiOiI0ZjVjZjlkNC1iNGMyLTQyZWYtYTYzOC0wN2MyNmM5MjdhZmIiLCJhcHBfZGlzcGxheW5hbWUiOiJHcmFwaCBFeHBsb3JlciIsImFwcGlkIjoiZGU4YmM4YjUtZDlmOS00OGIxLWE4YWQtYjc0OGRhNzI1MDY0IiwiYXVkIjoiMDAwMDAwMDMtMDAwMC0wZmYxLWNlMDAtMDAwMDAwMDAwMDAwL3NlbmFjb3Iuc2hhcmVwb2ludC5jb21ANTI0OTdlYzItMDk0NS00ZjU1LTgwMjEtNzk3NjYzNjNkZDk2IiwiZXhwIjoiMTc0ODI1ODYxNiJ9.CgoKBHNuaWQSAjY0EgsI_uC-iK2Sjj4QBRoOMjAuMTkwLjE5MC4xMDAqLGk5ODZLMDMvNGtFSmFKcU1oS3pFM2VUWW1TaDlPaTN3cjVDaklJY29SOHc9MIcBOAFCEKGh5LXrIADAzfXWmdYiK2xKEGhhc2hlZHByb29mdG9rZW5SCFsia21zaSJdcikwaC5mfG1lbWJlcnNoaXB8MTAwMzIwMDQ2MmI2MmIyN0BsaXZlLmNvbXoBMoIBEgnCfklSRQlVTxGAIXl2Y2PdlpIBBkFydGpvbZoBCEtvbnNjaGluogEbYXJ0am9tLmtvbnNjaGluQHNlbmFjb3IuY29tqgEQMTAwMzIwMDQ2MkI2MkIyN7IBTGFsbGZpbGVzLndyaXRlIGdyb3VwLndyaXRlIGFsbHNpdGVzLndyaXRlIGFsbHByb2ZpbGVzLnJlYWQgYWxscHJvZmlsZXMud3JpdGXIAQE.i4xkY-vh43Pk2vy5EJFxVsYALIvhp3OVfen_ZVxwYSA&ApiVersion=2.0";

(async function () {
    const file = await fetch(url);

    const answer = await file.bytes();

    const filename = "myPPT.pptx";
    //write file; import fs has to be included
    try {
        fs.writeFileSync(filename, answer);
    } catch (e) {
        console.log(e);
    }

    const pptx = new PPTX.Composer();
    // await pptx.load();
    await pptx.load(filename);
    await pptx.compose(async pres =>  {
        let slide = pres.getSlide(1);
        //slide.moveTo(2);
    });
    await pptx.save(filename);
    
    console.log("Done!");
})();

