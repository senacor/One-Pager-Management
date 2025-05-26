import { InMemoryOnePagerRepository } from "../src/functions/validator/adapter/InMemoryOnePagerRepository";
import { InMemoryValidationReporter } from "../src/functions/validator/adapter/InMemoryValidationReporter";
import { EmployeeID, OnePagerRepository, ValidationReporter } from "../src/functions/validator/DomainTypes";

type ReporterFactory = new () => ValidationReporter;

const testFactory = (Reporter: ReporterFactory) => {
  describe("ValidationReporter", () => {

    it("should return no errors without any report", async () => {
      const reporter = new Reporter();

      await expect(reporter.getResultFor("unknown-employee-id")).resolves.toEqual([]);
    });

    it("should return errors when reported", async () => {
      const reporter = new Reporter();

      reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THEN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);

      await expect(reporter.getResultFor("employee-id")).resolves.toEqual(["OLDER_THEN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);
    });

    it("should clean up errors when valid is reported", async () => {
      const reporter = new Reporter();

      reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THEN_SIX_MONTHS"]);
      reporter.reportValid("employee-id");

      await expect(reporter.getResultFor("employee-id")).resolves.toEqual([]);
    });

    it("should not return errors of other employee", async () => {
      const reporter = new Reporter();

      reporter.reportErrors("other-id", "Employee Name", ["OLDER_THEN_SIX_MONTHS", "MISSING_GERMAN_VERSION"]);

      await expect(reporter.getResultFor("employee-id")).resolves.toEqual([]);
    });

    it("should not clean up errors when valid is reported for other employee", async () => {
      const reporter = new Reporter();

      reporter.reportErrors("employee-id", "Employee Name", ["OLDER_THEN_SIX_MONTHS"]);
      reporter.reportValid("other-id");

      await expect(reporter.getResultFor("employee-id")).resolves.toEqual(["OLDER_THEN_SIX_MONTHS"]);
    });

  });
}

testFactory(InMemoryValidationReporter);
