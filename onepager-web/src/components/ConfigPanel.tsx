import React, { useState } from 'react';
import { appConfig } from '../config/apiConfig';
import { onePagerApiService } from '../services/OnePagerApiService';

interface ConfigPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ isOpen, onClose }) => {
    const [testResult, setTestResult] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);

    const testConnection = async () => {
        setIsLoading(true);
        setTestResult('');

        try {
            // Try to search for a test employee
            const employees = await onePagerApiService.searchEmployees('test');
            setTestResult(`✅ Connection successful! Found ${employees.length} employees.`);
        } catch (error) {
            setTestResult(`❌ Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">API Configuration</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 text-2xl"
                    >
                        ×
                    </button>
                </div>

                <div className="space-y-4">
                    <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="font-semibold mb-2">Current Configuration</h3>
                        <div className="text-sm space-y-1">
                            <p><strong>Environment:</strong> {appConfig.environment}</p>
                            <p><strong>Base URL:</strong> {appConfig.api.baseUrl}</p>
                            <p><strong>Functions Key:</strong> {appConfig.api.functionsKey ? '***' + appConfig.api.functionsKey.slice(-4) : 'Not set'}</p>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-md">
                        <h3 className="font-semibold mb-2">Environment Variables</h3>
                        <div className="text-sm space-y-1">
                            <p><strong>VITE_API_BASE_URL:</strong> {import.meta.env.VITE_API_BASE_URL || 'Not set'}</p>
                            <p><strong>VITE_FUNCTIONS_KEY:</strong> {import.meta.env.VITE_FUNCTIONS_KEY ? 'Set' : 'Not set'}</p>
                            <p><strong>VITE_ENVIRONMENT:</strong> {import.meta.env.VITE_ENVIRONMENT || 'Not set'}</p>
                            <p><strong>MODE:</strong> {import.meta.env.MODE}</p>
                            <p><strong>DEV:</strong> {import.meta.env.DEV ? 'true' : 'false'}</p>
                        </div>
                    </div>

                    <div>
                        <button
                            onClick={testConnection}
                            disabled={isLoading}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isLoading ? 'Testing Connection...' : 'Test API Connection'}
                        </button>

                        {testResult && (
                            <div className="mt-3 p-3 rounded-md bg-gray-50">
                                <p className="text-sm">{testResult}</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-md">
                        <h4 className="font-semibold mb-2">Configuration Help</h4>
                        <div className="text-sm space-y-2">
                            <p><strong>Local Development:</strong> Create a <code>.env.local</code> file with:</p>
                            <pre className="bg-gray-100 p-2 rounded text-xs">
                                {`VITE_API_BASE_URL=http://localhost:7071
VITE_FUNCTIONS_KEY=
VITE_ENVIRONMENT=local`}
                            </pre>

                            <p><strong>Production:</strong> Set environment variables:</p>
                            <pre className="bg-gray-100 p-2 rounded text-xs">
                                {`VITE_API_BASE_URL=https://poc-one-pager.azurewebsites.net
VITE_FUNCTIONS_KEY=your-production-key-here
VITE_ENVIRONMENT=production`}
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
