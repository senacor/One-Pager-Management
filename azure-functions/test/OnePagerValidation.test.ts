import { OnePagerValidation } from "../src/functions/OnePagerValidation";
import { DeviceItemPath } from "../src/functions/DeviceItemPath";

describe("OnePagerValidation", () => {
  it("should instantiate without error", () => {
    const validator = new OnePagerValidation();
    expect(validator).toBeInstanceOf(OnePagerValidation);
  });

  it("should have a validateChangedOnePager method", async () => {
    const validator = new OnePagerValidation();
    // Provide a valid DeviceItemPath string
    const item: DeviceItemPath = "/devices/testDevice/items/testItem";
    // Should not throw (method is empty)
    await expect(validator.validateChangedOnePager(item)).resolves.toBeUndefined();
  });
});
