param location string = resourceGroup().location

resource githubDeploymentIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'github-deploy-mi'
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


// Custom role definition: "Custom User Access Admin" with only role assignment permissions
resource customUserAccessAdminRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: guid(resourceGroup().id, 'custom-user-access-admin-role')
  properties: {
    roleName: 'Custom User Access Admin'
    description: 'Allows management of role assignments (RBAC) at resource group scope.'
    type: 'CustomRole'
    permissions: [
      {
        actions: [
          'Microsoft.Authorization/roleAssignments/read'
          'Microsoft.Authorization/roleAssignments/write'
          'Microsoft.Authorization/roleAssignments/delete'
        ]
        notActions: []
        dataActions: []
        notDataActions: []
      }
    ]
    assignableScopes: [
      resourceGroup().id
    ]
  }
}

// Assign custom User Access Admin role to githubDeploymentIdentity
resource githubDeploymentCustomAccessAdminRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, githubDeploymentIdentity.id, 'custom-access-admin-role')
  scope: resourceGroup()
  properties: {
    roleDefinitionId: customUserAccessAdminRole.id
    principalId: githubDeploymentIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}
