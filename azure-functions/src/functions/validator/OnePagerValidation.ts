import { EmployeeID, EmployeeRepository, Logger, OnePager, OnePagerRepository, ValidationError, ValidationReporter, ValidationRule } from "./DomainTypes";
import fs from "node:fs";
import path from "path";
import PPTX from "nodejs-pptx";

export class OnePagerValidation {
    private readonly logger: Logger;
    private readonly onePagers: OnePagerRepository;
    private readonly employees: EmployeeRepository;
    private readonly reporter: ValidationReporter;
    private readonly validationRule: ValidationRule;

    constructor(
        onePagers: OnePagerRepository, employees: EmployeeRepository,
        reporter: ValidationReporter, validationRule: ValidationRule, logger: Logger = console
    ) {
        this.logger = logger;
        this.onePagers = onePagers;
        this.employees = employees;
        this.reporter = reporter;
        this.validationRule = validationRule;
    }

    async validateOnePagersOfEmployee(id: EmployeeID) {
        if (!(await this.employees.getAllEmployees()).includes(id)) {
            this.logger.error(`Employee ${id} does not exist.`);
            return;
        }

        const onePagers = await this.onePagers.getAllOnePagersOfEmployee(id);
        this.logger.log(`Validating one-pagers for employee ${id}, found ${onePagers.length} one-pagers.`);

        const newest = this.selectNewestOnePager(onePagers);
        this.logger.log(`Newest OnePager is ${newest?.lastUpdateByEmployee}!`);

        if (newest) {
            await this.downloadOnePager(newest);
        }

        const errors = await this.validationRule(newest);

        if (errors.length === 0) {
            this.logger.log(`Employee ${id} has valid OnePagers!`);
            await this.reporter.reportValid(id);
        } else {
            this.logger.log(`Employee ${id} has the following errors: ${errors.join(' ')}!`);
            await this.reporter.reportErrors(id, "<not yet implemented>", errors);
        }
    }

    private selectNewestOnePager(onePagers: OnePager[]): OnePager | undefined {
        if (onePagers.length === 0) {
            return undefined;
        }

        return onePagers.reduce((newest, current) => {
            return current.lastUpdateByEmployee > newest.lastUpdateByEmployee ? current : newest;
        });
    }

    private async downloadOnePager(onePager: OnePager): Promise<void> {
        if (onePager.downloadURL == "") {
            return; // needed for testing since we do not use real URLs in some tests
        }
        let logger = this.logger;

        const file = await fetch(onePager.downloadURL);
        const fileInBytes = await file.bytes();

        const filepath = "PPTX";
        const filename = "myPPT.pptx";

        if (!fs.existsSync(filepath)){
            fs.mkdirSync(filepath);
        }

        //write file; import fs has to be included
        try {
            fs.writeFileSync(path.join(filepath, filename), fileInBytes);
            logger.log("Written file to disk!");
        } catch (e) {
            logger.log(e);
        }

        const pptx = new PPTX.Composer();
        // await pptx.load();
        await pptx.load(path.join(filepath, filename));
        await pptx.compose(async (pres: any) =>  {
            pres.getSlide(1).content["p:sld"]["p:cSld"][0]["p:spTree"][0]["p:sp"][1]["p:txBody"][0]["a:p"][0]["a:r"][0]["a:t"][0] = "Irgendein Name";
            logger.log("PPT:", JSON.stringify(pres.getSlide(1).content));
            // let slide = pres.getSlide(1);
            //slide.moveTo(2);
        });
        await pptx.save(path.join(filepath, filename));

        logger.log("Downloaded OnePager!");
    }
}
