param functionAppName string
param location string = resourceGroup().location
param sharepointOnePagerSiteName string = 'senacor.sharepoint.com:/sites/MaInfo'
param sharepointClientId string = '1621d264-a7bb-40b6-bfef-9b2839cb7eec'
param sharepointTenantId string = '52497ec2-0945-4f55-8021-79766363dd96'
@secure()
param sharepointClientSecret string

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

// Zum Deployen von Funktionen
resource functionApp 'Microsoft.Web/sites@2022-09-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
        { name: 'APPINSIGHTS_INSTRUMENTATIONKEY', value: applicationInsights.properties.InstrumentationKey }
        { name: 'WEBSITE_CONTENTSHARE', value: toLower(functionAppName) }
        { name: 'FUNCTIONS_EXTENSION_VERSION', value: '~4' }
        { name: 'FUNCTIONS_WORKER_RUNTIME', value: 'node' }
        { name: 'WEBSITE_NODE_DEFAULT_VERSION', value: '~22' }
        { name: 'STORAGE_SOURCE', value: 'sharepoint' }
        { name: 'SHAREPOINT_ONE_PAGER_SITE_NAME', value: sharepointOnePagerSiteName }
        { name: 'SHAREPOINT_CLIENT_ID', value: sharepointClientId }
        { name: 'SHAREPOINT_TENANT_ID', value: sharepointTenantId }
        {
          name: 'SHAREPOINT_CLIENT_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${sharepointClientSecretSecret.properties.secretUriWithVersion})'
        }
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
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

resource keyVault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: '${functionAppName}-kv'
  location: location
  properties: {
    sku: {
      family: 'A'
      name: 'standard'
    }
    tenantId: subscription().tenantId
    accessPolicies: [] // We'll use RBAC
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
  }
}

resource sharepointClientSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-02-01' = {
  name: 'sharepoint-client-secret'
  parent: keyVault
  properties: {
    value: sharepointClientSecret
  }
}

// Grant Function App access to Key Vault secrets
resource keyVaultAccessPolicy 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(keyVault.id, functionApp.name, 'KeyVaultSecretsUser')
  scope: keyVault
  properties: {
    roleDefinitionId: subscriptionResourceId(
      'Microsoft.Authorization/roleDefinitions',
      '4633458b-17de-408a-b874-0445c86b69e6'
    ) // Key Vault Secrets User
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

// Ausgaben des Commands
output functionAppName string = functionApp.name
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
