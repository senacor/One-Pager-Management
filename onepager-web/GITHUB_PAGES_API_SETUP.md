# GitHub Pages API Configuration Setup (Secure)

This document explains how to securely configure the OnePager Web App to work with Azure Functions when deployed on GitHub Pages.

## Security Notice 🔒

**Important**: Function keys should NEVER be included in GitHub Pages deployments as they become visible to anyone accessing your site. This guide shows secure alternatives.

## Overview

The OnePager Web App needs to connect to Azure Functions for the import functionality. For security, we only include:
- ✅ Azure Functions URL (safe to expose)
- ❌ Function keys (removed for security)

## Current Secure Configuration

### Environment Variables (Build Time)
Only these variables are included in the GitHub Pages build:
- `VITE_API_BASE_URL` - Your Azure Functions URL
- `VITE_ENVIRONMENT` - Set to "production" for GitHub Pages

### Configuration Files
- `src/config/apiConfig.ts` - Reads environment variables and creates runtime config
- `.env.local` - Local development settings (localhost:7071)
- `.env.example` - Template showing the expected format

## Secure Setup Options

### Option 1: Anonymous Functions (Quick Start)

**Best for**: Getting started quickly, internal tools, development

1. **Configure Azure Functions for anonymous access:**
   ```json
   // In your function.json files
   {
     "authLevel": "anonymous"
   }
   ```

2. **Enable CORS:**
   ```bash
   az functionapp cors add --resource-group myResourceGroup --name myFunctionApp --allowed-origins https://yourusername.github.io
   ```

3. **Set GitHub Repository Secret:**
   - Go to Settings → Secrets and variables → Actions
   - Add `VITE_API_BASE_URL` with your Azure Functions URL

### Option 2: Azure AD Authentication (Recommended for Production)

**Best for**: Production deployments, enterprise environments

See `SECURE_API_DEPLOYMENT.md` for detailed Azure AD setup instructions.

## GitHub Repository Setup

### Set Repository Secrets

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add this repository secret:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VITE_API_BASE_URL` | Your Azure Functions URL | `https://your-functions-app.azurewebsites.net` |

⚠️ **Do NOT add** `VITE_FUNCTIONS_KEY` as a secret for GitHub Pages deployments.

## Testing the Secure Configuration

After setup:

1. Push changes to trigger GitHub Pages deployment
2. Visit your GitHub Pages site
3. Open browser dev tools and check console for API config logs:
   ```javascript
   🔧 API Configuration: {
     environment: "production",
     baseUrl: "https://your-functions-app.azurewebsites.net",
     hasFunctionsKey: false,
     note: "Function key not included for security (public deployment)"
   }
   ```
4. Test the import functionality

## Local Development

For local development, use `.env.local` with function keys:

```bash
VITE_API_BASE_URL=http://localhost:7071
VITE_FUNCTIONS_KEY=your-local-dev-key
VITE_ENVIRONMENT=local
```

Function keys are safe to use locally since they're not included in any public deployment.

## Troubleshooting

### Common Issues

1. **"Failed to fetch" errors**
   - Check if `VITE_API_BASE_URL` is set correctly
   - Verify Azure Functions are deployed and accessible
   - Ensure functions are configured for anonymous access or proper authentication

2. **401/403 Unauthorized errors**
   - Functions may still require authentication
   - Change `authLevel` to `"anonymous"` in function.json
   - Or set up proper Azure AD authentication

3. **CORS errors**
   - Configure CORS settings in Azure Function App
   - Add your GitHub Pages domain to allowed origins

## Security Best Practices

- ✅ Monitor Azure Functions for unusual usage patterns
- ✅ Set up Azure Application Insights for monitoring
- ✅ Consider rate limiting at the Azure level
- ✅ Use Azure AD authentication for production
- ❌ Never include function keys in public deployments
- ❌ Don't rely solely on referrer checking for security

For more security options, see `SECURE_API_DEPLOYMENT.md`.
