---
layout: default
title: Development Guide
nav_order: 3
---

# Architectural Overview
On a global scale, the architecture of this project looks like this:

```mermaid
flowchart TB
    
    A("Power Automate or something else (to be determined in the fututre)") -- HTTP-Request --> Azure 

    subgraph Azure
        azureFunctions(Azure-Functions)
    end

    subgraph SharePoint
        opOrdner(One Pager Directory)
        ListOutput(SharePoint List Output)
    end

    subgraph employee[Employees]
        mailbox(E-Mail-Mailbox)
    end

    subgraph repDWH["Reporting DWH"]
        powerBIDatabase(Power BI Datenbank)
    end

    azureFunctions -- Takes One Pager-Data from --> opOrdner
    azureFunctions -- Outputs to --> ListOutput
    azureFunctions -- Takes Employee Data From --> powerBIDatabase
    azureFunctions -- "Sends E-Mails to" --> mailbox
    
    style SharePoint fill: lightgreen
    style SharePoint stroke: green
    style SharePoint color: black

    style Azure fill: lightblue
    style Azure stroke: blue
    style Azure color: black

    style repDWH fill: lightyellow
    style repDWH stroke: yellow
    style repDWH color: black
```
We have something that triggers our main functions via HTTP request. Our Azure functions do their tasks and use data from different sources. Finally, we write our results in a SharePoint list and maybe send e-mails depending on whether it is time for sending mails.


## Azure Functions
Now, we go into more details about our core functionality. With a bit of abstraction, our code functions like this:
```mermaid
flowchart TB
    
    A("Power Automate or something else (to be determined in the fututre)") -- HTTP-Request --> ValidateAllHttpTrigger
    A("Power Automate or something else (to be determined in the fututre)") -- HTTP-Request --> FileChangeHttpTrigger
    A("Power Automate or something else (to be determined in the fututre)") -- HTTP-Request --> MailNotificationAllHttpTrigger

    subgraph SharePoint
        opOrdner(One Pager Directory)
        ListOutput(SharePoint List Output)
    end

    subgraph employee[Employees]
        mailbox(E-Mail-Mailbox)
    end

    subgraph Azure
        subgraph Validation
            ValidateAllHttpTrigger(ValidateAllHttpTrigger.ts)
            FileChangeHttpTrigger(FileChangeHttpTrigger.ts)
            ValidationQueue(Validation Queue)
            FileChangeQueueTrigger(FileChangeQueueTrigger.ts)
            AppConfiguration("AppConfiguration.ts<br>(Loads everything that needs Environment variables)")
            SharePointStorageExplorer("SharePointStorageExplorer.ts<br>(Class for communicating with SharePoint OnePager Folder)")
            SharepointListValidationReporter("SharepointListValidationReporter.ts<br>(Class for communicating with Output SharePoint List)")
            OnePagerValidation("OnePagerValidation.ts<br>(Brings everything together)")
            PowerBIRepository("PowerBIRepository.ts<br>(Class for communicating with PowerBI-Backend)")
            FolderBasedOnePagers("FolderBasedOnePagers.ts<br>(Class that converts StorateExplorer to be useable OnePagerValidation.ts; exists for testing purposes)")


            ValidateAllHttpTrigger -- Add all employees to --> ValidationQueue
            FileChangeHttpTrigger -- Add specific employee to --> ValidationQueue

            ValidationQueue -- Triggers --> FileChangeQueueTrigger

            

            FileChangeQueueTrigger -- creates --> OnePagerValidation

            


            FileChangeQueueTrigger -- creates --> AppConfiguration
            SharepointListValidationReporter  <-- Interact for Information about One Pagers --> OnePagerValidation
            

            OnePagerValidation <-- Interacts for Retrieving and Reporting Validation Errors -->  FolderBasedOnePagers

            SharePointStorageExplorer <-- packages --> FolderBasedOnePagers

            AppConfiguration -- creates --> SharePointStorageExplorer

            AppConfiguration -- creates --> SharepointListValidationReporter

            
            
            

            AppConfiguration -- creates --> PowerBIRepository

            OnePagerValidation <-- Interacts for Retrieving Information from Database --> PowerBIRepository
        end
        
        subgraph EMailNotificationBlock[E-Mail-Notification]
            NotificationQueue(E-Mail Notification Queue)
            MailNotificationAllHttpTrigger(MailNotificationAllHttpTrigger.ts)
            MailNotificationQueueTrigger(MailNotificationQueueTrigger.ts)
            AppConfigurationMail("AppConfiguration.ts<br>(Loads everything that needs Environment variables)")
            SharepointListValidationReporterMail("SharepointListValidationReporter.ts<br>(Class for communicating with Output SharePoint List)")
            MSMailAdapter("MSMailAdapter.ts<br>(Class for sending Mails)")
            EMailNotification("EMailNotification.ts<br>(Brings everything together)")

            MailNotificationAllHttpTrigger -- adds specific employee IDs to --> NotificationQueue
            NotificationQueue -- triggers --> MailNotificationQueueTrigger
            MailNotificationQueueTrigger -- creates --> AppConfigurationMail

            AppConfigurationMail -- creates --> SharepointListValidationReporterMail
            AppConfigurationMail -- creates --> MSMailAdapter

            MailNotificationQueueTrigger -- creates --> EMailNotification

            EMailNotification <-- Interacts for Retrieving Validation Results --> SharepointListValidationReporterMail
            EMailNotification <-- Interacts for Sending Mails --> MSMailAdapter
        end
        
        
        

        linkStyle default stroke:gray
    end

    SharepointListValidationReporter <-- sends update to --> ListOutput
    SharePointStorageExplorer <-- retrieves One Pagers from --> opOrdner

    

    subgraph repDWH["Reporting DWH"]
        powerBIDatabase(Power BI Datenbank)
    end
    
    PowerBIRepository <-- Exchange of information --> powerBIDatabase
    MSMailAdapter -- sends mails to --> mailbox
    
    style SharePoint fill: lightgreen
    style SharePoint stroke: green
    style SharePoint color: black

    style Azure fill: lightblue
    style Azure stroke: blue
    style Azure color: black
    

    style repDWH fill: lightyellow
    style repDWH stroke: yellow
    style repDWH color: black
```

If we include all interfaces and defined global types as well as all classes, we get the following diagram:

<img src="./umlDiagram.svg" style="background: gray">
(This diagram was created using `azure-functions/experiments/UMLGenerator.ts`.)