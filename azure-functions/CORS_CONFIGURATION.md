# Azure Functions CORS Configuration

This document explains how CORS (Cross-Origin Resource Sharing) is configured for the OnePager Azure Functions using Bicep infrastructure-as-code.

## Why CORS is Needed

When your web application (hosted on GitHub Pages) tries to call your Azure Functions API, the browser performs a CORS check because:

- **Web App Origin**: `https://yourusername.github.io` 
- **API Origin**: `https://your-functions-app.azurewebsites.net`

Without proper CORS configuration, the browser blocks these cross-origin requests.

## CORS Configuration in Bicep

The CORS settings are configured in `/azure-functions/infra/main.bicep`:

```bicep
// CORS configuration parameters
param corsAllowedOrigins array = [
  'http://localhost:5173'  // Vite dev server
  'https://daniel.heinrich.github.io'  // GitHub Pages - adjust to your username/repo
]

// In the Function App resource:
cors: {
  allowedOrigins: corsAllowedOrigins
  supportCredentials: false
}
```

## Deployment Options

### Option 1: Use Default Values
Deploy with the default CORS origins defined in the Bicep file:

```bash
az deployment group create \
  --resource-group myResourceGroup \
  --template-file main.bicep \
  --parameters functionAppName=my-onepager-functions \
               sharepointClientSecret=your-secret
```

### Option 2: Override CORS Origins
Deploy with custom CORS origins:

```bash
az deployment group create \
  --resource-group myResourceGroup \
  --template-file main.bicep \
  --parameters functionAppName=my-onepager-functions \
               sharepointClientSecret=your-secret \
               corsAllowedOrigins='["http://localhost:5173","https://yourusername.github.io/your-repo"]'
```

### Option 3: Using Parameters File
Create a `main.parameters.json` file:

```json
{
  "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "functionAppName": {
      "value": "my-onepager-functions"
    },
    "sharepointClientSecret": {
      "value": "your-secret"
    },
    "corsAllowedOrigins": {
      "value": [
        "http://localhost:5173",
        "https://yourusername.github.io/One-Pager-Management"
      ]
    }
  }
}
```

Then deploy:

```bash
az deployment group create \
  --resource-group myResourceGroup \
  --template-file main.bicep \
  --parameters @main.parameters.json
```

## GitHub Pages URL Format

Make sure to use the correct GitHub Pages URL format:

- **Personal Site**: `https://username.github.io`
- **Project Site**: `https://username.github.io/repository-name`

For this OnePager project, the URL would be:
`https://yourusername.github.io/One-Pager-Management`

## Common CORS Origins

You might want to include these origins:

```bicep
param corsAllowedOrigins array = [
  'http://localhost:5173'                                    // Vite dev server
  'http://localhost:3000'                                    // Alternative dev server
  'https://yourusername.github.io'                          // Personal GitHub Pages
  'https://yourusername.github.io/One-Pager-Management'     // Project GitHub Pages
]
```

## Security Considerations

1. **Don't use wildcards** (`*`) in production CORS origins
2. **Only include necessary origins** - be specific
3. **supportCredentials: false** is safer for public APIs
4. **Function keys** provide the actual security, CORS just allows browser requests

## Testing CORS Configuration

After deployment, test CORS by:

1. **Browser Dev Tools**: Check for CORS errors in console
2. **Network Tab**: Look for preflight OPTIONS requests
3. **CORS Test**: Use online CORS testing tools

## Updating CORS After Deployment

If you need to add more origins later:

1. Update the `corsAllowedOrigins` parameter in your Bicep file
2. Redeploy the infrastructure
3. Or manually update in Azure Portal (not recommended for production)

## Troubleshooting

### Common CORS Errors

**Error**: `Access to fetch at 'https://...' has been blocked by CORS policy`
- **Solution**: Ensure your web app's origin is in `corsAllowedOrigins`

**Error**: `No 'Access-Control-Allow-Origin' header is present`
- **Solution**: CORS configuration not deployed or incorrect

**Error**: Preflight OPTIONS requests fail with 401
- **Solution**: This is expected with `authLevel: 'function'` - CORS should still work for actual requests

## Benefits of Bicep CORS Configuration

✅ **Infrastructure as Code**: Version controlled and repeatable  
✅ **Environment Specific**: Different origins for dev/staging/prod  
✅ **No Code Changes**: Pure infrastructure configuration  
✅ **Works with Function Keys**: CORS is handled before authentication  
✅ **Supports Preflight**: Automatically handles OPTIONS requests
