Feature: Greeting

    Scenario: Say hello
        Given a greeter
        When the greeter says hello
        Then I should have heard "hello"

    Scenario: Say cat
        Given a greeter
        When the greeter says cat
        Then I should have heard "cat"
