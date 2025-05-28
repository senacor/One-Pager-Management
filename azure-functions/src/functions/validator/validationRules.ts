import { OnePager, ValidationRule } from "./DomainTypes";

export const lastModifiedRule: ValidationRule = async (onePager: OnePager | undefined) => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return onePager !== undefined
        && onePager.hasOwnProperty("lastUpdateByEmployee")
        && onePager?.lastUpdateByEmployee.getTime() < sixMonthsAgo.getTime() ? ["OLDER_THAN_SIX_MONTHS"] : [];
};
