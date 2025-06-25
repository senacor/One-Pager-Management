# Secure API Configuration for GitHub Pages Deployment

## The Security Challenge

When deploying to GitHub Pages (or any static hosting), **never include function keys or secrets** in the build. These become visible to anyone who:
- Views the page source
- Inspects the JavaScript files
- Uses browser developer tools

## Current Safe Configuration

The GitHub Pages deployment now only includes:
- ✅ `VITE_API_BASE_URL` - Your Azure Functions URL (safe to expose)
- ❌ `VITE_FUNCTIONS_KEY` - **Removed for security**

## Secure Authentication Options

Here are the recommended approaches for securing your Azure Functions:

### Option 1: Anonymous Functions (Simplest)
**Best for**: Internal tools, development, non-sensitive operations

Configure your Azure Functions to allow anonymous access:

```json
// In your function.json
{
  "authLevel": "anonymous"
}
```

**Pros:**
- Simple setup
- Works immediately with GitHub Pages
- No authentication complexity

**Cons:**
- Functions are publicly accessible
- No built-in rate limiting
- Anyone can call your API

### Option 2: Azure AD Authentication (Recommended)
**Best for**: Production deployments, enterprise use

Set up Azure AD authentication for your Functions:

1. **Configure Azure AD on your Function App:**
   ```bash
   # Enable Azure AD authentication
   az webapp auth config-version upgrade --resource-group myResourceGroup --name myFunctionApp
   ```

2. **Update your web app to handle authentication:**
   ```javascript
   // In your React app, redirect to Azure AD login
   const loginUrl = `${apiBaseUrl}/.auth/login/aad?post_login_redirect_url=${window.location.origin}`;
   ```

**Pros:**
- Enterprise-grade security
- Integrates with existing Azure AD
- Supports role-based access
- Audit logging

**Cons:**
- More complex setup
- Requires user authentication flow

### Option 3: Custom API Gateway
**Best for**: Complex scenarios, additional security layers

Create a proxy API that handles authentication:

1. **Deploy a simple proxy API** (e.g., Azure API Management)
2. **Proxy calls** to your protected Functions
3. **Handle authentication** in the proxy layer

### Option 4: CORS + Referrer Checking
**Best for**: Basic protection, internal use

Configure your Functions to only accept calls from your GitHub Pages domain:

```csharp
// In your Azure Function
[FunctionName("MyFunction")]
public static async Task<IActionResult> Run(
    [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post")] HttpRequest req,
    ILogger log)
{
    // Check referrer
    if (!req.Headers.ContainsKey("Referer") || 
        !req.Headers["Referer"].ToString().StartsWith("https://yourusername.github.io/"))
    {
        return new UnauthorizedResult();
    }
    
    // Your function logic here
}
```

**Pros:**
- Simple to implement
- Provides basic protection
- No user authentication required

**Cons:**
- Referrer can be spoofed
- Not foolproof security
- Breaks if users disable referrer

## Implementation Examples

### For Anonymous Functions (Quick Setup)

1. **Update your Azure Functions:**
   ```json
   // function.json
   {
     "authLevel": "anonymous"
   }
   ```

2. **Enable CORS in Azure:**
   ```bash
   az functionapp cors add --resource-group myResourceGroup --name myFunctionApp --allowed-origins https://yourusername.github.io
   ```

### For Azure AD Authentication

1. **Configure Function App Authentication:**
   ```bash
   # Enable Azure AD
   az webapp auth update --resource-group myResourceGroup --name myFunctionApp --enabled true --action LoginWithAzureActiveDirectory
   ```

2. **Update React App:**
   ```typescript
   // Add to your API service
   const checkAuthentication = async () => {
     const response = await fetch(`${baseUrl}/.auth/me`);
     if (!response.ok) {
       // Redirect to login
       window.location.href = `${baseUrl}/.auth/login/aad`;
     }
   };
   ```

## Configuration Updates Needed

### Update Environment Variables
Only set the base URL in GitHub Secrets:
- `VITE_API_BASE_URL`: Your Function App URL
- ~~`VITE_FUNCTIONS_KEY`~~: **Remove this secret**

### Update API Service
Modify your OnePagerApiService to handle no function key:

```typescript
// In OnePagerApiService.ts
private getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // Only add function key in local development
  if (appConfig.environment === 'local' && appConfig.api.functionsKey) {
    headers['x-functions-key'] = appConfig.api.functionsKey;
  }
  
  return headers;
}
```

## Testing Your Setup

1. **Deploy without function key**
2. **Test API calls** from GitHub Pages
3. **Monitor Azure Functions logs** for errors
4. **Check browser console** for authentication issues

## Migration Steps

1. ✅ **Remove function key from GitHub workflow** (already done)
2. **Choose authentication method** (anonymous recommended for start)
3. **Update Azure Functions configuration**
4. **Test the deployment**
5. **Monitor for unauthorized usage**

## Security Best Practices

- **Monitor your Functions** for unusual usage patterns
- **Set up alerts** for high request volumes
- **Use Azure Application Insights** for monitoring
- **Consider rate limiting** at the Azure level
- **Regular security reviews** of your setup

## Troubleshooting

**Common issues after removing function keys:**

1. **401/403 Errors**: Functions still require authentication
   - Solution: Change `authLevel` to `"anonymous"`

2. **CORS Errors**: Cross-origin requests blocked
   - Solution: Configure CORS in Azure Function App settings

3. **Functions not accessible**: Still protected by default
   - Solution: Verify authentication level in function.json files
