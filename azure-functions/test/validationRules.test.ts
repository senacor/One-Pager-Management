import { URL } from "node:url";
import { OnePager, ValidationError } from "../src/functions/validator/DomainTypes";
import { allRules, combineContentRules, combineRules, hasOnePager, lastModifiedRule, usesCurrentTemplate } from "../src/functions/validator/validationRules";

const location = new URL("http://example.com/onepager.pptx")

describe("validationRules", () => {
    describe("hasOnePager", () => {
        it("should report no error if onePager is defined", async () => {
            const onePager: OnePager = { lastUpdateByEmployee: new Date(), location };
            await expect(hasOnePager(onePager)).resolves.toEqual([]);
        });
        it("should report an error if onePager is undefined", async () => {
            await expect(hasOnePager(undefined)).resolves.toEqual(["MISSING_ONE_PAGER"]);
        });
    });

    describe("lastModifiedRule", () => {
        it("should report no error if onePager is undefined", async () => {
            await expect(lastModifiedRule(undefined)).resolves.toEqual([]);
        });
        it("should report no error if lastUpdateByEmployee is within 6 months", async () => {
            const recent = new Date();
            recent.setMonth(recent.getMonth() - 3);
            const onePager: OnePager = { lastUpdateByEmployee: recent, location };
            await expect(lastModifiedRule(onePager)).resolves.toEqual([]);
        });
        it("should report an error if lastUpdateByEmployee is older than 6 months", async () => {
            const old = new Date();
            old.setMonth(old.getMonth() - 7);
            const onePager: OnePager = { lastUpdateByEmployee: old, location };
            await expect(lastModifiedRule(onePager)).resolves.toEqual(["OLDER_THAN_SIX_MONTHS"]);
        });
    });

    const onePagerWithOldTemplates = [
        "file:///examples/Mustermann%2C%20Max%20DE_201028.pptx",
        "file:///examples/Mustermann%2C%20Max%20DE_190130.pptx",
    ]

    describe("usesCurrentTemplate", () => {
        it("should identify onepager using current template as valid", async () => {
            const onePager: OnePager = {
                lastUpdateByEmployee: new Date(),
                location: new URL("file:///examples/Mustermann%2C%20Max_DE_240209.pptx")
            };
            await expect(combineContentRules(console, usesCurrentTemplate)(onePager)).resolves.toEqual([]);
        });

        it.each(onePagerWithOldTemplates)("should identify onepager using old template as invalid", async (url) => {
            const onePager: OnePager = {
                lastUpdateByEmployee: new Date(),
                location: new URL(url)
            };
            await expect(combineContentRules(console, usesCurrentTemplate)(onePager)).resolves.toEqual(["USING_OLD_TEMPLATE"]);
        });
    });

    describe("combineRules", () => {
        it("combines multiple rules and flattens errors", async () => {
            const rule1 = async () => ["MISSING_ONE_PAGER" as ValidationError];
            const rule2 = async () => ["OLDER_THAN_SIX_MONTHS" as ValidationError];
            const combined = combineRules(rule1, rule2);
            await expect(combined(undefined)).resolves.toEqual(["MISSING_ONE_PAGER", "OLDER_THAN_SIX_MONTHS"]);
        });
    });

    describe("combineContentRules", () => {
        it("does not validate undefined one-pager", async () => {
            const rule1 = async () => ["MISSING_ONE_PAGER" as ValidationError];
            const combined = combineContentRules(console, rule1);
            await expect(combined(undefined)).resolves.toEqual([]);
        });
        it("combines multiple rules and flattens errors", async () => {
            const rule1 = async () => ["MISSING_ONE_PAGER" as ValidationError];
            const rule2 = async () => ["OLDER_THAN_SIX_MONTHS" as ValidationError];
            const combined = combineContentRules(console, rule1, rule2);
            const onePager = { lastUpdateByEmployee: new Date(), location: new URL("file:///examples/Mustermann%2C%20Max_DE_240209.pptx") };
            await expect(combined(onePager)).resolves.toEqual(["MISSING_ONE_PAGER", "OLDER_THAN_SIX_MONTHS"]);
        });
    });
});
