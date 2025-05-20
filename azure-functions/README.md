# Azure Function App (JavaScript) - Local Development

## Running Functions Locally with Azurite

To run your Azure Functions locally and use Azurite for local Azure Storage emulation, follow these steps:

1. **Install Azurite (if not already installed):**
   ```sh
   npm install -g azurite
   ```

2. **Start Azurite in a subfolder (recommended):**
   ```sh
   azurite --location ./.azurite
   ```
   This will store Azurite's data files in the `.azurite` folder in your project root.

3. **Start the Azure Functions host:**
   ```sh
   func start
   ```

Your functions will now run locally and use the Azurite storage emulator.

---

## Additional Tips
- You can add Azurite as a dev dependency and use npm scripts for convenience.
- For more info, see the [Azurite documentation](https://github.com/Azure/Azurite) and [Azure Functions local development docs](https://learn.microsoft.com/azure/azure-functions/functions-develop-local).
