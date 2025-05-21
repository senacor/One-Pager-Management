[Link To Azure CLI](`https://learn.microsoft.com/en-us/cli/azure/install-azure-cli-windows?view=azure-cli-latest&pivots=winget`)


## Setup Subscription

Create resource group
```bash
az group create --name one-pager --location germanywestcentral
```

enable app insights (e.g. logging)
```bash
az provider register --namespace  Microsoft.OperationalInsights --verbose --wait
```
-> Zum Aktivieren von Logging notwendig

assign `Storage Queue Data Contributor` role to user to be able to see data 
added to the queu in the Azure console.
-> Zum Anschauen von Daten in Azure, die kurzzeitig abgelegt werden

## Deployment

deploy infrastructur
```bash
az deployment group create --resource-group one-pager --template-file infra/main.bicep --parameters @infra/parameters.json --mode complete
```
-> Wendet bicep-File an (alle Functions verschwinden dadurch)

Installieren der NodeJS-Module
```bash
npm install
```

make it small 
```bash
npm prune --production
```

deploy functions
```bash
func azure functionapp publish poc-one-pager
```
->