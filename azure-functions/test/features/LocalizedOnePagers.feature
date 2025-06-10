Feature: Localized OnePagers
    We require our employees to have localized OnePagers in German and English.
    We want to guide our employees to create and maintain these documents effectively by generating appropiate errors.

    Background:
        Given today is "2024-06-01"
        And the following employees exist:
            | Id  | Name | FamilyName |
            | 111 | Max  | Mustermann |

    Scenario: Different validation errors in each language version
        Given "Max" has the following OnePagers:
            | Name                           | TemplateVersion |
            | Max, Mustermann_EN_240509.pptx | 2020            |
            | Max, Mustermann_DE_200209.pptx | 2024            |
        When we validate the OnePagers of "Max"
        Then "Max" OnePagers have the validation errors "USING_UNKNOWN_TEMPLATE" and "OLDER_THAN_SIX_MONTHS"

    Rule: Employees require localized OnePagers
        Employees must have localized OnePagers in German and English.

        Scenario: Employee with localized OnePagers
            Given "Max" has the following OnePagers:
                | Name                           |
                | Max, Mustermann_DE_240209.pptx |
                | Max, Mustermann_EN_240209.pptx |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have no validation errors

        Scenario Outline: Employee with missing localized OnePager
            Given "Max" has OnePager "<Name>"
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation error "<Error>"

            Examples:
                | Name                           | Error              |
                | Max, Mustermann_EN_240209.pptx | MISSING_DE_VERSION |
                | Max, Mustermann_DE_240209.pptx | MISSING_EN_VERSION |

    Rule: Only the newest version of a localized OnePager is validated
        Employees may have multiple versions of localized OnePagers, but only the newest version is validated.

        Scenario: Employee with deprecated localized OnePager
            Given "Max" has the following OnePagers:
                | Name                           | TemplateVersion |
                | Max, Mustermann_EN_240509.pptx | 2024            |
                | Max, Mustermann_EN_240209.pptx | 2020            |
                | Max, Mustermann_DE_240209.pptx | 2024            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have no validation errors

        Scenario: Employee invalid newest localized OnePagers
            Given "Max" has the following OnePagers:
                | Name                           | TemplateVersion |
                | Max, Mustermann_EN_240509.pptx | 2020            |
                | Max, Mustermann_EN_240209.pptx | 2020            |
                | Max, Mustermann_DE_240209.pptx | 2024            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation error "USING_UNKNOWN_TEMPLATE"

    Rule: OnePagers indicate their language in the name
        The indicated language has higher precedence than the content language of the slides.
        The content language of the slides must match the indicated language in the OnePager name.
        We therefore require the employee to change the content instead of changing the name of the OnePager.

        OnePagers without an indicated language are considered as candidates for the language of their content.

        Scenario: OnePager with content in wrong language
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_DE_240209.pptx | EN            |
                | Max, Mustermann_EN_240209.pptx | EN            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation error "WRONG_LANGUAGE_CONTENT"

        Scenario: OnePager with wrong content language still counts as OnePager for the language indicated in the name
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_DE_240209.pptx | EN            |
                | Max, Mustermann_EN_200209.pptx | EN            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation errors "WRONG_LANGUAGE_CONTENT" and "OLDER_THAN_SIX_MONTHS"

        Scenario: Missing language indicator in name
            Given "Max" has the following OnePagers:
                | Name                        | SlideLanguage |
                | Max, Mustermann_240209.pptx | EN            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation errors "MISSING_DE_VERSION" and "MISSING_LANGUAGE_INDICATOR_IN_NAME"

        Scenario: Newer OnePager with missing language indicator supersedes deprecated OnePager
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_240209.pptx    | EN            |
                | Max, Mustermann_EN_200209.pptx | EN            |
                | Max, Mustermann_DE_240209.pptx | DE            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation error "MISSING_LANGUAGE_INDICATOR_IN_NAME"

        Scenario: Deprecated OnePager with missing language indicator does not supersede newest OnePager
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_200209.pptx    | EN            |
                | Max, Mustermann_EN_240209.pptx | EN            |
                | Max, Mustermann_DE_240209.pptx | DE            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have no validation errors

        Scenario: OnePager with content in multiple languages
            Given "Max" has the following OnePagers:
                | Name                        | SlideLanguage |
                | Max, Mustermann_200209.pptx | DE,EN         |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation error "MIXED_LANGUAGE_VERSION"

    # TODO how do mixed content OnePagers interact with superseeding other OnePagers?
