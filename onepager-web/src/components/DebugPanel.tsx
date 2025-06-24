import React, { useState } from 'react';
import { useOnePagerContext } from '../hooks/useOnePager';
import { useAIServiceProvider } from '../services';

export const DebugPanel: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [importText, setImportText] = useState('');
  const { data, exportData, importData, resetData, clearStorage } = useOnePagerContext();
  const { serviceInfo, useMockService, refreshServiceInfo, isRealServiceAvailable } = useAIServiceProvider();

  const handleExport = () => {
    const exported = exportData();
    navigator.clipboard.writeText(exported);
    alert('Data copied to clipboard!');
  };

  const handleImport = async () => {
    if (importText.trim()) {
      const success = await importData(importText);
      if (success) {
        alert('Data imported successfully!');
        setImportText('');
      } else {
        alert('Failed to import data. Please check the format.');
      }
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all data?')) {
      resetData();
    }
  };

  const handleClearStorage = () => {
    if (confirm('Are you sure you want to clear storage?')) {
      clearStorage();
    }
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        >
          📊 Debug
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-xl p-4 max-w-md z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-800">OnePager Data Management</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Data Summary */}
      <div className="mb-4 text-sm space-y-1">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-medium">Basic Info</div>
            <div className="text-gray-600">
              {data.basicInfo.fullName ? '✓' : '○'} Name: {data.basicInfo.fullName || 'Empty'}
            </div>
            <div className="text-gray-600">
              {data.basicInfo.position ? '✓' : '○'} Position: {data.basicInfo.position || 'Empty'}
            </div>
          </div>
          
          <div className="bg-gray-50 p-2 rounded">
            <div className="font-medium">Lists</div>
            <div className="text-gray-600">Focus: {data.focusAreas.length} items</div>
            <div className="text-gray-600">Experience: {data.experience.length} items</div>
            <div className="text-gray-600">Projects: {data.projects.length} items</div>
          </div>
        </div>
      </div>

      {/* Validation Status */}
      <div className="mb-4 text-sm">
        <div className="font-medium mb-2">Validation Status</div>
        <div className="space-y-1 text-xs">
          {Object.entries(data.metadata.stepCompletionStatus).map(([step, isComplete]) => (
            <div key={step} className="flex items-center justify-between">
              <span className="capitalize">{step}:</span>
              <span className={isComplete ? 'text-green-600' : 'text-red-600'}>
                {isComplete ? '✓ Complete' : '○ Incomplete'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* AI Service Status */}
      <div className="mb-4 text-sm">
        <div className="font-medium mb-2">AI Service Status</div>
        <div className="bg-gray-50 p-2 rounded text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span>Service:</span>
            <span className={`font-medium ${serviceInfo.type === 'mock' ? 'text-orange-600' : 'text-green-600'}`}>
              {serviceInfo.name}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Type:</span>
            <span className="font-mono">{serviceInfo.type}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <span className={`${serviceInfo.isFallback ? 'text-orange-600' : 'text-green-600'}`}>
              {serviceInfo.isFallback ? 'Fallback' : 'Active'}
            </span>
          </div>
          {!isRealServiceAvailable && (
            <div className="mt-2">
              <button
                onClick={refreshServiceInfo}
                className="w-full bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs hover:bg-blue-200"
              >
                Refresh Status
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex-1 bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
          >
            Export
          </button>
          <button
            onClick={handleReset}
            className="flex-1 bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600"
          >
            Reset
          </button>
          <button
            onClick={handleClearStorage}
            className="flex-1 bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600"
          >
            Clear
          </button>
        </div>

        {/* Import */}
        <div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste JSON data here to import..."
            className="w-full text-xs border border-gray-300 rounded p-2 h-20 resize-none"
          />
          <button
            onClick={handleImport}
            disabled={!importText.trim()}
            className="w-full bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed mt-1"
          >
            Import
          </button>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
        Last updated: {data.metadata.lastUpdated.toLocaleString()}
      </div>
    </div>
  );
};
