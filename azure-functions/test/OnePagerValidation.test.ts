import { OnePagerValidation } from "../src/functions/validator/OnePagerValidation";
import { DeviceItemPath } from "../src/functions/DeviceItemPath";
import { InMemoryValidationReporter } from "../src/functions/validator/adapter/InMemoryValidationReporter";
import { OnePager, ValidationError, ValidationReporter } from "../src/functions/validator/DomainTypes";
import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/InMemoryOnePagerRepository";

describe("OnePagerValidation", () => {

    var reporter: ValidationReporter;

    beforeEach(() => {
        reporter = new InMemoryValidationReporter();
    });

    it("should not report errors for unknown employee", async () => {
        const repo = new InMemoryOnePagerRepository({});
        const validation = new OnePagerValidation(repo, reporter, async op => ["MISSING_GERMAN_VERSION"]);

        await validation.validateOnePagersOfEmployee("unknown-employee-id");

        await expect(await reporter.getResultFor("unknown-employee-id")).toEqual([]);
    });

    it("should report errors for employee without one-pager", async () => {
        const id = "employee-id";
        const repo = new InMemoryOnePagerRepository({ [id]: [] });
        const validation = new OnePagerValidation(repo, reporter, async op => op === undefined ? ["MISSING_GERMAN_VERSION"] : []);

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(["MISSING_GERMAN_VERSION"]);
    });

    it("should report errors for employee with invalid one-pager", async () => {
        const id = "employee-id";
        const repo = new InMemoryOnePagerRepository({ [id]: [{ lastUpdateByEmployee: new Date(), downloadURL: "" }] });
        const validation = new OnePagerValidation(repo, reporter, async op => op !== undefined ? ["OLDER_THAN_SIX_MONTHS"] : []);

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual(["OLDER_THAN_SIX_MONTHS"]);
    });

    it("should clean errors for employee when one-pager becomes valid", async () => {
        const id = "employee-id";
        const repo = new InMemoryOnePagerRepository({ [id]: [{ lastUpdateByEmployee: new Date(), downloadURL: "" }] });
        var callCounter = 0;
        const statefulValidator = async (op: OnePager | undefined) => callCounter++ == 0 ? ["OLDER_THAN_SIX_MONTHS"] as ValidationError[] : [];
        const validation = new OnePagerValidation(repo, reporter, statefulValidator);

        await validation.validateOnePagersOfEmployee(id);
        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });

    it("should validate newest one-pager", async () => {
        const id = "employee-id";
        const repo = new InMemoryOnePagerRepository({
            [id]: [
                { lastUpdateByEmployee: new Date("2000-01-01"), downloadURL: "" },
                { lastUpdateByEmployee: new Date("2025-01-01"), downloadURL: "" },
                { lastUpdateByEmployee: new Date("2005-01-01"), downloadURL: "" }
            ]
        });
        const validation = new OnePagerValidation(repo, reporter, async op => !op || op.lastUpdateByEmployee < new Date("2010-01-01") ? ["OLDER_THAN_SIX_MONTHS"] : []);

        await validation.validateOnePagersOfEmployee(id);

        await expect(await reporter.getResultFor(id)).toEqual([]);
    });
});
