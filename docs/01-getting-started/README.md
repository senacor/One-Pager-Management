# Prerequisites
- For communication, we use a slack channel called "intermission-onepager-automations" and a miro board. To get invited to the slack channel, please contact Maxi Lorenz or any other active team member. The miro board and all other useful links can be found on the canvas called 'OnePager Automations'.
- For development, we NodeJS. The version can be found in ".github/workflows/ci.yml" as an environment variable called `NODE_VERSION`. Please install this version of NodeJS on your computer. 
- We use the Azure Portal for deploying. Therefore, please contact Daniel Heinrich to be added to Ressource Group and all of its components.
- For developing, we use VS Code with the following extension:
    - REST Client: A Rest client for executing HTTP calls.
- The following extensions are also useful for development but not a necessity:
    - Bicep: A language support extension for bicep files
    - Cucumber: A useful tool for using cucumber with VS Code.
    - ESLint: A JavaScript linter.
    - Markdown Preview Mermaid Support: To be able to display mermaid-diagrams in VS Code

- VS Code configuration:
    To be able to use REST Client for production and local testing, create a file  `.vscode/settings.json` in the source directory of the project if it was not created automatically by VS Code already and add the following lines:
    ```json
    {
        "rest-client.environmentVariables": {
        "local": {
            "host": "http://localhost:7071",
            "functions_key": ""
        },
        "production": {
            "host": "https://poc-one-pager.azurewebsites.net",
            "functions_key": "<Azure Function Key>",
        }
    }
    ```
    The Azure function key needs to be extracted from the Azure Portal's Azure function called "poc-one-pager" by navigating to "Functions/App Keys" and copying the key called "_master".
- It is possible to set up a local Azure environment. To do this, please install the following tools and make sure that they are added to your `PATH` variable of your operating system:
    - [Azure CLI][azure-tools-install]
    - [Azure Functions Core Tools][core-tools-install]


# Getting Started
First things first: Please open a terminal, navigate to the folder called "azure-functions" and run
```bash
npm install
```
to download all NodeJS packages that our program needs. Now, you are able to run all necessary commands to develop and test this program.

_In the following, we are always executing bash commands in the folder `azure-functions`._



Looking into "azure-function/package.json", you will see many scripts that can be run via
```bash
npm run <script-name>
```
E.g.
```bash
npm run watch
```
will run a typescript command to automatically convert all typescript files into javascript files and save them to the folder "azure-functions/dist" once in the beginning and then on every file change.

The most important commands are `npm run watch` to let all typescript files be converted into JavaScript files, `npm run start` or `npm start` to start a local Azure Functions instance that listens to defined triggers and `npm run test` or `npm test` for running all tests. 

## Running the functions
In case you want to use `npm start`, it is important to note that another command needs to be executed on another console to start all other Azure services that our Azure functions need. For this, open a terminal and run:
```bash
npx azurite --location ./.azurite
```

In order to have everything up and running and for changes to take direct effect on your functions, you need to have three consoles running:
1. A console running `npm run watch`.
2. A console running `npx azurite --location ./.azurite`.
3. A console running `npm start`.

(The use of background tasks is not recommended since all outputs might be important and shall not overlap each other.)

After all those processes are run, you can send HTTP Requests to trigger the defined HTTP triggers. This can be done using for example the prepared HTTP requests in `requests/functions.http`.

## Running tests
If you want to run tests that establish a connection to the SharePoint or the Power BI Database, then defining the following environment variables is necessary:
```bash
export SHAREPOINT_CLIENT_ID="<my client id>";
export SHAREPOINT_TENANT_ID="<my tenant id>";
export SHAREPOINT_CLIENT_SECRET="<my client secret>";
```
Those variables can be found in the 1Password Vault that is linked in the above mentioned slack channel.

Now, just run
```bash
npm test
```
If you only want to run Feature Tests written in Cucumber, use
```bash
npm run cucumber
```
instead.

Now, you are ready to develop this application!


[azure-tools-install]: https://learn.microsoft.com/en-us/cli/azure/install-azure-cli?view=azure-cli-latest
[core-tools-install]: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local?pivots=programming-language-typescript&tabs=macos%2Cisolated-process%2Cnode-v4%2Cpython-v2%2Chttp-trigger%2Ccontainer-apps#install-the-azure-functions-core-tools
