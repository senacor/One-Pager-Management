# OnePager Import Functionality

This document describes the import functionality that allows users to import existing OnePager data from the Azure Functions backend.

## Overview

The import functionality consists of several components:

1. **OnePagerApiService** - API service for communicating with Azure Functions endpoints
2. **ImportWizard** - React component providing a user-friendly import wizard
3. **Multi-language support** - Translations for English and German

## Features

### Current Implementation

- **Employee Search**: Search for employees by name (minimum 3 characters)
- **OnePager Selection**: View and select from available OnePager files for an employee
- **Data Preview**: Preview basic information before importing
- **Basic Import**: Import name, position, and profile photo

### Azure Functions Integration

The import functionality integrates with the following Azure Functions endpoints:

- `GET /api/employee?name={name}` - Search employees
- `GET /api/employee/{id}/onepager` - Get OnePager files for employee
- `GET /api/employee/{id}/onepager/{fileName}` - Get OnePager data (photo URL)
- `GET /api/employee/{id}/onepager/{fileName}/photo/{imageName}` - Get photo

## Usage

### Opening the Import Wizard

1. Click the "Import OnePager" button in the top-left corner of the application
2. The import wizard modal will open

### Import Process

1. **Search Employee**
   - Enter at least 3 characters of the employee's name
   - Click "Search" or press Enter
   - Select from the search results

2. **Select OnePager**
   - Choose from available OnePager files for the selected employee
   - Each file shows the filename and local path

3. **Preview and Import**
   - Review the employee information and photo
   - Click "Import" to apply the data to the current OnePager form

## API Service Details

### OnePagerApiService

```typescript
class OnePagerApiService {
  constructor(baseUrl?: string)
  
  // Search for employees by name
  searchEmployees(name: string): Promise<Employee[]>
  
  // Get OnePager files for an employee
  getEmployeeOnePagers(employeeId: string): Promise<OnePagerFile[]>
  
  // Get OnePager data (currently photo URL)
  getOnePagerData(employeeId: string, fileName: string): Promise<OnePagerData>
  
  // Download OnePager file as blob
  downloadOnePager(employeeId: string, fileName: string): Promise<Blob>
}
```

### Type Definitions

```typescript
interface Employee {
  id: string;
  name: string;
  position: string;
}

interface OnePagerFile {
  fileName: string;
  local: string;
}

interface OnePagerData {
  photo: string; // URL to the photo
}
```

## Current Limitations

- Only basic information can be imported (name, position, photo)
- No full OnePager content import yet
- Position mapping is basic (may need refinement for proper type conversion)
- Photos are imported as URLs (not downloaded locally)

## Future Enhancements

- Full OnePager content import (focus areas, experience, projects)
- Photo download and local storage
- Better position mapping
- Bulk import capabilities
- Import history and undo functionality
- Progress indicators for large imports

## Error Handling

The import wizard includes comprehensive error handling:

- Search validation (minimum 3 characters)
- Network error handling
- No results found scenarios
- Loading states for all async operations
- User-friendly error messages in multiple languages

## Internationalization

The import functionality supports both English and German languages with complete translations for all user-facing text.

## Configuration

### API Endpoint Configuration

The import functionality can be configured to work with different Azure Functions endpoints:

#### Environment Variables

Create a `.env.local` file (for local development) or set environment variables:

```bash
# For local development (Azure Functions running locally)
VITE_API_BASE_URL=http://localhost:7071
VITE_FUNCTIONS_KEY=
VITE_ENVIRONMENT=local

# For production (Azure Functions deployed)
VITE_API_BASE_URL=https://poc-one-pager.azurewebsites.net
VITE_ENVIRONMENT=production
```

#### Default Configuration

If no environment variables are set, the system defaults to:
- **Local development**: `http://localhost:7071` (no functions key required)
- **Auto-detection**: If the base URL contains `azurewebsites.net`, it automatically switches to production mode

#### Configuration File

The configuration is managed in `src/config/apiConfig.ts`:

```typescript
export interface ApiConfig {
  baseUrl: string;
  functionsKey?: string;
}

export interface AppConfig {
  api: ApiConfig;
  environment: 'local' | 'production' | 'development';
}
```

### Azure Functions Key Authentication

When connecting to the production Azure Functions endpoint, authentication is handled via function keys:
- The key is automatically included in the `x-functions-key` header
- For local development, no key is typically required

## Development Notes

- The API service uses the current window origin as default base URL
- All API calls include proper error handling and response validation
- The import wizard manages its own state independently
- Integration with the existing OnePager context is seamless
