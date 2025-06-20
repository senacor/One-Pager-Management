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
Now, we go into more details about our core functionality.
```mermaid
flowchart TB
    
    A("Power Automate or something else (to be determined in the fututre)") -- HTTP-Request --> ValidateAllHttpTrigger
    A("Power Automate or something else (to be determined in the fututre)") -- HTTP-Request --> FileChangeHttpTrigger
    A("Power Automate or something else (to be determined in the fututre)") -- HTTP-Request --> MailNotificationAllHttpTrigger

    subgraph Azure
        ValidateAllHttpTrigger(ValidateAllHttpTrigger.ts)
        FileChangeHttpTrigger(FileChangeHttpTrigger.ts)
        ValidationQueue(Validation Queue)
        FileChangeQueueTrigger(FileChangeQueueTrigger.ts)
        NotificationQueue(E-Mail Notification Queue)
        MailNotificationAllHttpTrigger(MailNotificationAllHttpTrigger.ts)
        MailNotificationQueueTrigger(MailNotificationQueueTrigger.ts)

        ValidateAllHttpTrigger -- Add all employees to --> ValidationQueue
        FileChangeHttpTrigger -- Add specific employee to --> ValidationQueue

        ValidationQueue -- Triggers --> FileChangeQueueTrigger

        OnePagerValidation(OnePagerValidation.ts)

        FileChangeQueueTrigger -- creates --> OnePagerValidation

        AppConfiguration(AppConfiguration.ts)
        SharePointStorageExplorer(SharePointStorageExplorer.ts)
        SharepointListValidationReporter(SharepointListValidationReporter.ts)


        FileChangeQueueTrigger -- creates --> AppConfiguration
        SharepointListValidationReporter  <-- Interact for Information about One Pagers --> OnePagerValidation
        

        OnePagerValidation <-- Interact for Retrieving and Reporting Validation Errors -->  SharePointStorageExplorer

        AppConfiguration -- creates --> SharePointStorageExplorer

        AppConfiguration -- creates --> SharepointListValidationReporter

        MailNotificationAllHttpTrigger -- adds specific employee IDs to --> NotificationQueue
        NotificationQueue -- triggers --> MailNotificationQueueTrigger
        
        

        linkStyle default stroke:gray
    end

    SharepointListValidationReporter -- sends update to --> ListOutput
    SharePointStorageExplorer -- retrieves One Pagers from --> opOrdner

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

