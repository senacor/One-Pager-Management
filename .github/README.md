# Azure Deployments

## Setup Azure federated credendtials

```bash
RESOURCE_GROUP=one-pager
FUNCTION_APP=poc-one-pager

az identity federated-credential create \
  --name $FUNCTION_APP-github-deploy-fc \
  --resource-group $RESOURCE_GROUP \
  --identity-name $FUNCTION_APP-github-deploy-mi \
  --issuer "https://token.actions.githubusercontent.com" \
  --subject "repo:senacor/One-Pager-Management:ref:refs/heads/main" \
  --audience "api://AzureADTokenExchange"
  
az identity show --name $FUNCTION_APP-github-deploy-mi --resource-group $RESOURCE_GROUP \
  --query '{tenantId: tenantId, clientId: clientId, subscriptionId: id}' | \
  jq '.subscriptionId |= (split("/")[2])'
```
