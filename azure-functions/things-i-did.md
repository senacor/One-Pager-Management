
## Setup Subscription

Create resource group
```bash
az group create --name one-pager --location germanywestcentral
```

enable app insights (e.g. logging)
```bash
az provider register --namespace  Microsoft.OperationalInsights --verbose --wait
```

assign `Storage Queue Data Contributor` role to user to be able to see data 
added to the queu in the Azure console.

## Deployment

deploy infrastructur
```bash
az deployment group create --resource-group one-pager --template-file infra/main.bicep --parameters @infra/parameters.json --mode complete
```

make it small 
```bash
npm prune --production
```

deploy functions
```bash
func azure functionapp publish poc-one-pager
```