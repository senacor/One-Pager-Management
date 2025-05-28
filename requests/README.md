# HTTP request collections

We collect useful HTTP requests to aid us in our development.

We use the [RestClient](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
VsCode extension to execute the requests.

## Environment settings

You need to provide environment specific configuration values to be able
to execute the requests locally or directly on Azure.

Add the following section to your [settings.json](../.vscode/settings.json).
You can find the Azure function-key in our 1Password vault.

```json
{
    "rest-client.environmentVariables": {
        "local": {
            "host": "http://localhost:7071",
            "functions_key": ""
        },
        "production": {
            "host": "https://poc-one-pager.azurewebsites.net",
            "functions_key": "<azure-function-key>",
        }
    }
}
```

Before execcuting the Request, you have to choose the environment in the bottom bar of VS Code. Based on the above settings, there are 3 options: "No Environment", "local" and "production".
