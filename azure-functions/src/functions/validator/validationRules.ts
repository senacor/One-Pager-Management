import { OnePager, ValidationRule } from "./DomainTypes";

export const lastModifiedRule: ValidationRule = async (onePager: OnePager | undefined) => {
    // one day are 864 000 000 milliseconds;
    if (onePager === undefined || Math.floor((Date.now() - onePager?.lastUpdateByEmployee.getTime())/864000000) < 183) {
        return [];
    }
    return ["OLDER_THAN_SIX_MONTHS"];
};