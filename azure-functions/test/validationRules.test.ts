import { OnePager, ValidationError } from "../src/functions/validator/DomainTypes";
import { allRules, combineRules, hasOnePager, lastModifiedRule } from "../src/functions/validator/validationRules";

describe("validationRules", () => {
    describe("hasOnePager", () => {
        it("should report no error if onePager is defined", async () => {
            const onePager: OnePager = { lastUpdateByEmployee: new Date(), downloadURL: "url" };
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
            const onePager: OnePager = { lastUpdateByEmployee: recent, downloadURL: "url" };
            await expect(lastModifiedRule(onePager)).resolves.toEqual([]);
        });
        it("should report an error if lastUpdateByEmployee is older than 6 months", async () => {
            const old = new Date();
            old.setMonth(old.getMonth() - 7);
            const onePager: OnePager = { lastUpdateByEmployee: old, downloadURL: "url" };
            await expect(lastModifiedRule(onePager)).resolves.toEqual(["OLDER_THAN_SIX_MONTHS"]);
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
});
