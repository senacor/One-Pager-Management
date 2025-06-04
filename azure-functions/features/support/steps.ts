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
