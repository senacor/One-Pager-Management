Feature: Localized OnePagers
    We require our employees to have localized OnePagers in German and English.
    We want to guide our employees to create and maintain these documents effectively by generating appropiate errors.

    Background:
        Given today is "2024-06-01"
        And the following employees exist:
            | Id  | Name      | FamilyName  | Language |
            | 111 | Max       | Mustermann  | DE       |

    Scenario: Different validation errors in each language version
        Given "Max" has the following OnePagers:
            | Name                           | TemplateVersion |
            | Max, Mustermann_EN_240509.pptx | 2020            |
            | Max, Mustermann_DE_200209.pptx | 2024            |
        When we validate the OnePagers of "Max"
        Then "Max" OnePagers have the validation errors:
            | Version | Error |
            | EN      | USING_UNKNOWN_TEMPLATE |
            | DE      | OLDER_THAN_SIX_MONTHS  |
            # | DE      | OLDER_THAN_ONE_YEAR  |

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
            Then "Max" OnePagers have the validation errors:
                | Version | Error      |
                | DE      | <Error_DE> |
                | EN      | <Error_EN> |

            Examples:
                | Name                           | Error_DE           | Error_EN           |
                | Max, Mustermann_EN_240209.pptx | MISSING_DE_VERSION |                    |
                | Max, Mustermann_DE_240209.pptx |                    | MISSING_EN_VERSION |

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
            Then "Max" OnePagers have the validation errors:
                | Version | Error                  |
                |  EN     | USING_UNKNOWN_TEMPLATE |
                |  DE     |                        |

    Rule: OnePagers indicate the content language in their name
        The content of OnePagers must be indicated in the name.
        So users can select the correct version quickly without needing to inspect the OnePager.

        Scenario: OnePager with content in wrong language
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_DE_240209.pptx | EN            |
                | Max, Mustermann_EN_240209.pptx | EN            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation errors:
                | Version | Error                  |
                | DE      | WRONG_LANGUAGE_CONTENT |
                | EN      |                        |

        Scenario: OnePager with wrong content language still counts as OnePager for the language indicated in the name
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_DE_240209.pptx | EN            |
                | Max, Mustermann_EN_200209.pptx | EN            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation errors:
                | Version | Error |
                | DE      | WRONG_LANGUAGE_CONTENT |
                | EN      | OLDER_THAN_SIX_MONTHS  |
                # | EN      | OLDER_THAN_ONE_YEAR    |

    Rule: OnePagers without language indicator may supersede other OnePagers
        OnePagers without a language indicator supersedes OnePagers with the same language content if it is newer.

        Scenario: Missing language indicator in name
            Given "Max" has the following OnePagers:
                | Name                        | SlideLanguage |
                | Max, Mustermann_240209.pptx | EN            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation errors:
                | Version | Error                               |
                | DE      | MISSING_DE_VERSION                  |
                | EN      | WRONG_FILE_NAME                     |
                # | EN      | MISSING_LANGUAGE_INDICATOR_IN_NAME  |

        Scenario: Newer OnePager with missing language indicator supersedes deprecated OnePager
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_240209.pptx    | EN            |
                | Max, Mustermann_EN_200209.pptx | EN            |
                | Max, Mustermann_DE_240209.pptx | DE            |
            When we validate the OnePagers of "Max"
            # If the OnePagers with language indicator is picked we would excpect the validation error "OLDER_THAN_SIX_MONTHS"
            Then "Max" OnePagers have the validation errors:
                | Version | Error                               |
                | DE      |                                     |
                | EN      | WRONG_FILE_NAME                     |
                # | EN      | MISSING_LANGUAGE_INDICATOR_IN_NAME  |

        Scenario: Deprecated OnePager with missing language indicator does not supersede newest OnePager
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_200209.pptx    | EN            |
                | Max, Mustermann_EN_240209.pptx | EN            |
                | Max, Mustermann_DE_240209.pptx | DE            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have no validation errors

        Scenario: Multiple newer OnePagers with missing language indicator supersedes all deprecated OnePager
            Given "Max" has the following OnePagers:
                | Name                                 | SlideLanguage |
                | Max, Mustermann_american_240209.pptx | EN            |
                | Max, Mustermann_EN_200209.pptx       | EN            |
                | Max, Mustermann_german_240209.pptx   | DE            |
                | Max, Mustermann_DE_200209.pptx       | DE            |
            When we validate the OnePagers of "Max"
            # If one of the OnePagers with language indicator is picked we would expect the validation error "OLDER_THAN_SIX_MONTHS"
            Then "Max" OnePagers have the validation errors:
                | Version | Error                               |
                | DE      | WRONG_FILE_NAME  |
                | EN      | WRONG_FILE_NAME  |
                # | DE      | MISSING_LANGUAGE_INDICATOR_IN_NAME  |
                # | EN      | MISSING_LANGUAGE_INDICATOR_IN_NAME  |

    Rule: OnePagers with content in multiple languages may supersede other OnePagers
        OnePagers with content in multiple languages supersedes other OnePagers if it is newer.

        Scenario: OnePager with content in multiple languages
            Given "Max" has the following OnePagers:
                | Name                        | SlideLanguage |
                | Max, Mustermann_240209.pptx | DE,EN         |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have the validation errors:
                | Version | Error                   |
                | DE      | WRONG_FILE_NAME  |
                | EN      | WRONG_FILE_NAME  |
                # | DE      | MIXED_LANGUAGE_VERSION  |
                # | EN      | MIXED_LANGUAGE_VERSION  |

        Scenario: OnePager with content in multiple languages supersedes deprecated OnePagers
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_240209.pptx    | DE,EN         |
                | Max, Mustermann_EN_200209.pptx | EN            |
                | Max, Mustermann_DE_200209.pptx | DE            |
            When we validate the OnePagers of "Max"
            # If one of the OnePagers with language indicator is picked we would excpect the validation error "OLDER_THAN_SIX_MONTHS"
            Then "Max" OnePagers have the validation errors:
                | Version | Error                               |
                | DE      | WRONG_FILE_NAME  |
                | EN      | WRONG_FILE_NAME  |
                # | DE      | MIXED_LANGUAGE_VERSION  |
                # | EN      | MIXED_LANGUAGE_VERSION  |

        Scenario: OnePager with content in multiple languages supersedes only deprecated OnePager
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage | TemplateVersion |
                | Max, Mustermann_240101.pptx    | DE,EN         | 2024            |
                | Max, Mustermann_EN_200209.pptx | EN            | 2024            |
                | Max, Mustermann_DE_240209.pptx | DE            | 2020            |
            When we validate the OnePagers of "Max"
            # If the EN OnePager is picked we would expect the validation error "OLDER_THAN_SIX_MONTHS"
            Then "Max" OnePagers have the validation errors:
                | Version | Error                   |
                | DE      | USING_UNKNOWN_TEMPLATE  |
                | EN      | WRONG_FILE_NAME         |
                # | EN      | MIXED_LANGUAGE_VERSION  |

        Scenario: OnePager with content in multiple languages does not supersedes newer OnePagers
            Given "Max" has the following OnePagers:
                | Name                           | SlideLanguage |
                | Max, Mustermann_200209.pptx    | DE,EN         |
                | Max, Mustermann_EN_240209.pptx | EN            |
                | Max, Mustermann_DE_240209.pptx | DE            |
            When we validate the OnePagers of "Max"
            Then "Max" OnePagers have no validation errors
