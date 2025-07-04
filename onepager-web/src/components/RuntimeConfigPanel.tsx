import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { runtimeConfigManager } from '../config/runtimeConfig';

interface RuntimeConfigPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function RuntimeConfigPanel({ isOpen, onClose }: RuntimeConfigPanelProps) {
    const { t } = useTranslation();
    const [functionsKey, setFunctionsKey] = useState('');
    const [customApiUrl, setCustomApiUrl] = useState('');
    const [showKey, setShowKey] = useState(false);

    // Load current config when panel opens
    useEffect(() => {
        if (isOpen) {
            const config = runtimeConfigManager.getConfig();
            setFunctionsKey(config.functionsKey || '');
            setCustomApiUrl(config.customApiUrl || '');
        }
    }, [isOpen]);

    const handleSave = () => {
        runtimeConfigManager.setFunctionsKey(functionsKey);
        runtimeConfigManager.setCustomApiUrl(customApiUrl);
        onClose();
    };

    const handleClear = () => {
        runtimeConfigManager.clearConfig();
        setFunctionsKey('');
        setCustomApiUrl('');
    };

    const debugInfo = runtimeConfigManager.getDebugInfo();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-auto">
                <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {t('runtimeConfig.title')}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>

                    {/* Configuration Form */}
                    <div className="space-y-6">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Runtime Configuration</h3>
                            <p className="text-blue-800 text-sm">
                                {t('runtimeConfig.description')}
                            </p>
                        </div>

                        {/* Custom API URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                {t('runtimeConfig.customApiUrl')}
                            </label>
                            <input
                                type="url"
                                value={customApiUrl}
                                onChange={(e) => setCustomApiUrl(e.target.value)}
                                placeholder={t('runtimeConfig.customApiUrlPlaceholder')}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {t('runtimeConfig.customApiUrlHelp')}
                            </p>
                        </div>

                        {/* Functions Key */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Azure Functions Key (optional)
                            </label>
                            <div className="relative">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={functionsKey}
                                    onChange={(e) => setFunctionsKey(e.target.value)}
                                    placeholder="Your Azure Functions access key"
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showKey ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                                Used when Azure Functions require authentication
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex space-x-3">
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
                            >
                                Save Configuration
                            </button>
                            <button
                                onClick={handleClear}
                                className="px-4 py-2 bg-red-50 border border-red-200 text-red-600 rounded-md hover:bg-red-100 transition-colors font-medium"
                            >
                                Clear All
                            </button>
                        </div>
                    </div>

                    {/* Debug Information */}
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h3 className="font-semibold text-gray-900 mb-4">🔍 Debug Information</h3>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <pre className="text-xs text-gray-800 whitespace-pre-wrap overflow-x-auto">
                                {JSON.stringify(debugInfo, null, 2)}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
