Feature: Locale One Pagers
    Our Program can handle one-pagers in different languages.


    Scenario: German and Englisch valid localized one-pagers
        Given today is "2024-02-19"
        And a valid one-pager "Max, Mustermann_DE_240209.pptx" of an employee with Id "111" exists
        And a valid one-pager "Max, Mustermann_EN_240209.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then no validation errors are reported for the employee with Id "111"

    Scenario: Missing English version (localized and nonlocalized)
        Given today is "2024-02-19"
        And a valid one-pager "Max, Mustermann_DE_240209.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | MISSING_EN_VERSION |

    # This Scenario needs to be adapted to nongerman employees
    Scenario: Missing German version (localized and nonlocalized)
        Given today is "2024-02-19"
        And a valid one-pager "Max, Mustermann_EN_240209.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | MISSING_DE_VERSION |

    Scenario: Old outdated version of localized one-pager and new localized one-pager exist
        Given today is "2024-02-19"
        And a valid one-pager "Max, Mustermann_EN_240209.pptx" of an employee with Id "111" exists
        And an one-pager "Max, Mustermann_EN_200209.pptx" of an employee with Id "111" exists based on an outdated template
        And a valid one-pager "Max, Mustermann_DE_200209.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then no validation errors are reported for the employee with Id "111"

    Scenario: New one-pager based on outdated template
        Given today is "2024-02-19"
        And an one-pager "Max, Mustermann_DE_240209.pptx" of an employee with Id "111" exists based on an outdated template
        And a valid one-pager "Max, Mustermann_DE_200209.pptx" of an employee with Id "111" exists
        And a valid one-pager "Max, Mustermann_EN_240209.pptx" of an employee with Id "111" exists
        And the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | USING_UNKNOWN_TEMPLATE |

    Scenario: One localized old one-pager and one localized new one-pager with outdated template
        Given today is "2025-06-01"
        And an one-pager "Max, Mustermann_DE_250209.pptx" of an employee with Id "111" exists based on an outdated template
        And a valid one-pager "Max, Mustermann_EN_240101.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | USING_UNKNOWN_TEMPLATE |
            | OLDER_THAN_SIX_MONTHS |

    Scenario: Wrong language of content combined with current localized one-pager of this language
        Given today is "2024-06-01"
        And a valid one-pager "Max, Mustermann_DE_240208.pptx" of an employee with Id "111" exists with slides in "EN"
        And a valid one-pager "Max, Mustermann_EN_240209.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | WRONG_LANGUAGE_CONTENT |

    Scenario: Wrong language of content combined with outdated localized one-pager of this language
        Given today is "2025-06-01"
        And a valid one-pager "Max, Mustermann_DE_250209.pptx" of an employee with Id "111" exists with slides in "EN"
        And a valid one-pager "Max, Mustermann_EN_240209.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | OLDER_THAN_SIX_MONTHS |
            | WRONG_LANGUAGE_CONTENT |

    # this needs to be adapted to non-german employees
    Scenario: Missing language indicator in name
        Given today is "2024-06-01"
        And a valid one-pager "Max, Mustermann_240209.pptx" of an employee with Id "111" exists with slides in "EN"
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | MISSING_LANGUAGE_INDICATOR_IN_NAME |
            | MISSING_DE_VERSION |

    Scenario: Mixed language versions
        Given today is "2024-06-01"
        And a valid one-pager "Max, Mustermann_240209.pptx" of an employee with Id "111" exists with slides in "EN" and "DE"
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | MIXED_LANGUAGE_VERSION |

    Scenario: Missing language indicator in name of newest file and other are older than six months
        Given today is "2025-06-01"
        And a valid one-pager "Max, Mustermann_250209.pptx" of an employee with Id "111" exists with slides in "DE"
        And a valid one-pager "Max, Mustermann_EN_240209.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | MISSING_LANGUAGE_INDICATOR_IN_NAME |
            | OLDER_THAN_SIX_MONTHS |


    Scenario: Nonlocalized one-pagers are ignored if they are older than localized one-pagers
        Given today is "2025-06-01"
        And a valid one-pager "Max, Mustermann_DE_250209.pptx" of an employee with Id "111" exists
        And a valid one-pager "Max, Mustermann_EN_250202.pptx" of an employee with Id "111" exists
        And a valid one-pager "Max, Mustermann_250101.pptx" of an employee with Id "111" exists with slides in "EN"
        And a valid one-pager "Max, Mustermann_250102.pptx" of an employee with Id "111" exists with slides in "DE"
        When the one-pagers of the employee with Id "111" are validated
        Then no validation errors are reported for the employee with Id "111"


    Scenario: Unlocalized one-pager with slides in English and newer than localized englisch one-pager
        Given today is "2025-06-01"
        And a valid one-pager "Max, Mustermann_DE_250209.pptx" of an employee with Id "111" exists
        And a valid one-pager "Max, Mustermann_250505.pptx" of an employee with Id "111" exists with slides in "EN"
        And a valid one-pager "Max, Mustermann_EN_250202.pptx" of an employee with Id "111" exists
        When the one-pagers of the employee with Id "111" are validated
        Then the following validation errors are reported for the employee with Id "111":
            | errors |
            | MISSING_LANGUAGE_INDICATOR_IN_NAME |

    # Scenario: Test
    #     Given no_given
    #     When no_when
    #     Then the following validation errors are reported for the employee with Id "111":
    #         | errors |
    #         | "MISSING_EN_VERSION" |

# //TODO:
#     - describe them as valid
#     - make sure dates in example names are not to old (do we need to define today?)






# id, "fehler1\nfehler2"

# id, fehler1, onepager1
# id, fehler2, onepager2

# id, {onepager2: [fehler2], onepager1: [fehler1]}, "Errors of onepager1 are fehler1.\nErrors of onepager2 are fehler2."

