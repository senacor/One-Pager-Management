import { OnePager, ValidationError, ValidationReporter } from "../src/functions/validator/DomainTypes";
import { OnePagerValidation } from "../src/functions/validator/OnePagerValidation";
import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/memory/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../src/functions/validator/adapter/memory/InMemoryValidationReporter";

describe("OnePagerValidation", () => {

    var reporter: ValidationReporter;

    beforeEach(() => {
        reporter = new InMemoryValidationReporter();
    });

    it("should not report errors for unknown employee", async () => {
        const repo = new InMemoryOnePagerRepository({});
        const validation = new OnePagerValidation(repo, repo, reporter, async op => ["MISSING_ONE_PAGER"]);

        await validation.validateOnePagersOfEmployee("000");

        await expect(await reporter.getResultFor("000")).toEqual([]);
    });

    it("should report errors for employee without one-pager", async () => {
        const id = "111";
        const repo = new InMemoryOnePagerRepository({ [id]: [] });
        const validation = new OnePagerValidation(repo, repo, reporter, async op => op === undefined ? ["MISSING_ONE_PAGER"] : []);

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(["MISSING_ONE_PAGER"]);
    });

    it("should report errors for employee with invalid one-pager", async () => {
        const id = "111";
        const repo = new InMemoryOnePagerRepository({ [id]: [{ lastUpdateByEmployee: new Date() }] });
        const validation = new OnePagerValidation(repo, repo, reporter, async op => op !== undefined ? ["OLDER_THAN_SIX_MONTHS"] : []);

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(["OLDER_THAN_SIX_MONTHS"]);
    });

    it("should clean errors for employee when one-pager becomes valid", async () => {
        const id = "111";
        const repo = new InMemoryOnePagerRepository({ [id]: [{ lastUpdateByEmployee: new Date() }] });
        var callCounter = 0;
        const statefulValidator = async (op: OnePager | undefined) => callCounter++ == 0 ? ["OLDER_THAN_SIX_MONTHS"] as ValidationError[] : [];
        const validation = new OnePagerValidation(repo, repo, reporter, statefulValidator);

        await validation.validateOnePagersOfEmployee(id);
        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    it("should validate newest one-pager", async () => {
        const id = "111";
        const repo = new InMemoryOnePagerRepository({
            [id]: [
                { lastUpdateByEmployee: new Date("2000-01-01") },
                { lastUpdateByEmployee: new Date("2025-01-01") },
                { lastUpdateByEmployee: new Date("2005-01-01") }
            ]
        });
        const validation = new OnePagerValidation(repo, repo, reporter, async op => !op || op.lastUpdateByEmployee < new Date("2010-01-01") ? ["OLDER_THAN_SIX_MONTHS"] : []);

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    // TODO:
    // - describe them as valid
    // - make sure dates in example names are not to old (do we need to define today?)

    // GIVEN valid one-pager "Max, Mustermann_DE_240209.pptx" exists
    // AND valid one-pager "Max, Mustermann_EN_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN no validation errors are reported

    // GIVEN one-pager "Max, Mustermann_DE_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation error "MISSING_EN_VERSION" is reported

    // GIVEN one-pager "Max, Mustermann_EN_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation error "MISSING_DE_VERSION" is reported

    // GIVEN one-pager "Max, Mustermann_DE_240209.pptx" exists
    // AND one-pager "Max, Mustermann_DE_200209.pptx" exists based on an outdated template
    // AND one-pager "Max, Mustermann_EN_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN no validation errors are reported

    // TODO dates
    // GIVEN one-pager "Max, Mustermann_DE_240209.pptx" exists based on an outdated template
    // AND one-pager "Max, Mustermann_DE_200209.pptx" exists
    // AND one-pager "Max, Mustermann_EN_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation error "USING_UNKNOWN_TEMPLATE" is reported

    // GIVEN it is 01-06-2025
    // AND one-pager "Max, Mustermann_DE_250209.pptx" exists based on an outdated template
    // AND one-pager "Max, Mustermann_EN_240101.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation errors "USING_UNKNOWN_TEMPLATE" and "OLDER_THAN_SIX_MONTHS" are reported

    // GIVEN one-pager "Max, Mustermann_DE_240209.pptx" exists with slides in english
    // AND one-pager "Max, Mustermann_EN_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation errors "WRONG_LANGUAGE_CONTENT" are reported

    // GIVEN it is 01-06-2025
    // AND one-pager "Max, Mustermann_DE_250209.pptx" exists with text in english
    // AND one-pager "Max, Mustermann_EN_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation errors "OLDER_THAN_SIX_MONTHS" and "WRONG_LANGUAGE_CONTENT" are reported

    // GIVEN one-pager "Max, Mustermann_240209.pptx" exists with slides in english
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation errors "MISSING_DE_VERSION" and "MISSING_LANGUAGE_INDICATOR_IN_NAME" are reported

    // GIVEN one-pager "Max, Mustermann_240209.pptx" exists with slides in english and german
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation error "MIXED_LANGUAGE_VERSION" is reported

    // GIVEN it is 01-06-2025
    // AND one-pager "Max, Mustermann_250209.pptx" exists with slides in german
    // AND one-pager "Max, Mustermann_EN_240209.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation errors "MISSING_LANGUAGE_INDICATOR_IN_NAME" AND "OLDER_THAN_SIX_MONTHS" are reported

    // GIVEN it is 01-06-2025
    // AND one-pager "Max, Mustermann_DE_250209.pptx" exists
    // AND one-pager "Max, Mustermann_EN_250202.pptx" exists
    // AND one-pager "Max, Mustermann_250101.pptx" exists with slides in english
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN no validation errors are reported

    // GIVEN it is 01-06-2025
    // AND one-pager "Max, Mustermann_DE_250209.pptx" exists
    // AND one-pager "Max, Mustermann_250505.pptx" exists with slides in english
    // AND one-pager "Max, Mustermann_EN_250202.pptx" exists
    // WHEN the one-pagers of Max Mustermann are validated
    // THEN the validation error "MISSING_LANGUAGE_INDICATOR_IN_NAME" is reported

});


// id, "fehler1\nfehler2"

// id, fehler1, onepager1
// id, fehler2, onepager2

// id, {onepager2: [fehler2], onepager1: [fehler1]}, "Errors of onepager1 are fehler1.\nErrors of onepager2 are fehler2."
