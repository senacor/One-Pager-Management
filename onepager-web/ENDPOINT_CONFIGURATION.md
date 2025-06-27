# Azure Functions Endpoint Configuration

This guide explains how to configure the OnePager web application to connect to different Azure Functions endpoints.

## Quick Setup

### For Local Development (Azure Functions running locally)

1. Create a `.env.local` file in the `onepager-web` directory:
```bash
VITE_API_BASE_URL=http://localhost:7071
VITE_FUNCTIONS_KEY=
VITE_ENVIRONMENT=local
```

2. Make sure your Azure Functions are running locally on port 7071

### For Production (Deployed Azure Functions)

1. Create a `.env.production` file or set environment variables:
```bash
VITE_API_BASE_URL=https://your-functions-app.azurewebsites.net
VITE_FUNCTIONS_KEY=your-production-key-here
VITE_ENVIRONMENT=production
```

## Configuration Details

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Base URL of the Azure Functions endpoint | `http://localhost:7071` or `https://your-functions-app.azurewebsites.net` |
| `VITE_FUNCTIONS_KEY` | Azure Functions key for authentication | `your-production-key-here` |
| `VITE_ENVIRONMENT` | Environment identifier | `local`, `production`, or `development` |

### Auto-Detection

The application will automatically detect the environment:
- If no configuration is provided, it defaults to `http://localhost:7071`
- If the base URL contains `azurewebsites.net`, it automatically switches to production mode
- Function keys are automatically included in API requests when provided

### VS Code Settings Reference

The configuration matches the `.vscode/settings.json` file:

```json
{
    "rest-client.environmentVariables": {
        "local": {
            "host": "http://localhost:7071",
            "functions_key": ""
        },
        "production": {
            "host": "https://your-functions-app.azurewebsites.net",
            "functions_key": "your-production-key-here"
        }
    }
}
```

## Testing the Configuration

### Using the Debug Panel

1. Open the application
2. Click the "📊 Debug" button in the bottom-right corner
3. Click "⚙️ API Config" button
4. Review the current configuration
5. Click "Test API Connection" to verify the setup

### Manual Testing

You can also test the endpoints manually:

**Local:**
```bash
curl http://localhost:7071/api/employee?name=test
```

**Production:**
```bash
curl -H "x-functions-key: your-production-key-here" \
     https://your-functions-app.azurewebsites.net/api/employee?name=test
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Make sure the Azure Functions have CORS properly configured
2. **Authentication Errors**: Verify the functions key is correct and not expired
3. **Connection Refused**: Check if the local Azure Functions are running on the correct port

### Environment Variables Not Loading

- Make sure the `.env.local` file is in the `onepager-web` directory (not the root)
- Restart the development server after creating/modifying environment files
- Environment variables must start with `VITE_` to be accessible in the browser

### Debug Information

The configuration panel shows:
- Current configuration values
- Environment variables
- Connection test results
- Help with common setups

## Security Notes

- Environment files (`.env.local`, `.env.production`) should not be committed to git
- Production functions keys should be obtained from your Azure Functions app settings
- In a real production environment, use proper secret management

## File Structure

```
onepager-web/
├── .env.local              # Local development config
├── .env.production         # Production config (optional)
├── .env.example           # Example configuration
├── src/
│   ├── config/
│   │   └── apiConfig.ts   # Configuration management
│   ├── components/
│   │   └── ConfigPanel.tsx # Debug configuration panel
│   └── services/
│       └── OnePagerApiService.ts # API service with config support
```
