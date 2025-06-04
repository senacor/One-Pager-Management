import assert from 'assert';
import { Given, When, Then } from '@cucumber/cucumber';
// import { Greeter } from '../../src/functions/';

Given('a greeter', function () {
    console.log('Greeter is given');
});

When('the greeter says hello', function () {
    console.log('Greeter says hello!');
    //   this.whatIHeard = new Greeter().sayHello()
});

When('the greeter says cat', function () {
    console.log('Greeter says cat');
    //   this.whatIHeard = new Greeter().sayHello()
});

Then('I should have heard {string}', function (expectedResponse) {
    console.log('Expected response:', expectedResponse);
    //assert.equal("hello", expectedResponse);
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



// id, "fehler1\nfehler2"

// id, fehler1, onepager1
// id, fehler2, onepager2

// id, {onepager2: [fehler2], onepager1: [fehler1]}, "Errors of onepager1 are fehler1.\nErrors of onepager2 are fehler2."
