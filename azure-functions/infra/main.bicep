param functionAppName string
param location string = resourceGroup().location

var storageAccountName = '${uniqueString(resourceGroup().id)}azfunctions'

// Speicher -> Queues, TAbles etc. können angelegt werden
resource storageAccount 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    defaultToOAuthAuthentication: true
  }
}

// Auf welche Art von Hardware wollen wir laufen? + Kostenberechnungen
resource appServicePlan 'Microsoft.Web/serverfarms@2022-09-01' = {
  name: '${functionAppName}-plan'
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
  kind: 'functionapp'
}


resource githubDeploymentIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${functionAppName}-github-deploy-mi'
  location: location
}

// Assign Contributor role to githubDeploymentIdentity at the resource group scope for Bicep deployments
resource githubDeploymentContributorRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, githubDeploymentIdentity.id, 'contributor-role')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b24988ac-6180-42a0-ab88-20f7382dd24c') // Contributor
    principalId: githubDeploymentIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Assign User Access Administrator role to githubDeploymentIdentity at the resource group scope for RBAC changes
resource githubDeploymentAccessAdminRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, githubDeploymentIdentity.id, 'access-admin-role')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'f1a07417-d97a-45cb-824c-7a7467783830') // User Access Administrator
    principalId: githubDeploymentIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

// Zum Deployen von Funktionen
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(functionAppName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: applicationInsights.properties.InstrumentationKey
        }
      ]
      ftpsState: 'FtpsOnly'
      minTlsVersion: '1.2'
    }
  }
  identity: {
    type: 'SystemAssigned'
  }
}


// Analytics tools
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: functionAppName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    Request_Source: 'rest'
  }
}

// Rechte/Zugriffe (Rollendefinitionen)
resource customQueueRWRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: guid(storageAccount.id, 'custom-queue-rw-role')
  properties: {
    roleName: 'Custom Queue ReadWrite'
    description: 'Custom role to allow sending and reading/processing messages from storage queues.'
    type: 'CustomRole'
    permissions: [
      {
        actions: [
          'Microsoft.Storage/storageAccounts/queueServices/queues/read'
          'Microsoft.Storage/storageAccounts/queueServices/queues/write'
        ]
        notActions: []
        dataActions: [
          'Microsoft.Storage/storageAccounts/queueServices/queues/messages/write'
          'Microsoft.Storage/storageAccounts/queueServices/queues/messages/read'
          'Microsoft.Storage/storageAccounts/queueServices/queues/messages/process/action'
        ]
        notDataActions: []
      }
    ]
    assignableScopes: [
      storageAccount.id
    ]
  }
}
// Zugriffe: Rollenverteilungen
resource customQueueRWRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid('custom-queue-rw-role-assignment', storageAccount.id, functionApp.id)
  scope: storageAccount
  properties: {
    roleDefinitionId: customQueueRWRole.id
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Ausgaben des Commands
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
