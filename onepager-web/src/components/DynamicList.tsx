import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface DynamicListProps {
  placeholder: string;
  onChange?: (values: string[]) => void;
  initialValues?: string[];
  maxItems?: number;
  enableAISuggestions?: boolean;
  onGetSuggestion?: (text: string) => Promise<string> | string;
  enableContextualDescription?: boolean;
  onGetContextualDescription?: (entries: string[]) => Promise<string> | string;
  baseDescription?: string;
}

export const DynamicList: React.FC<DynamicListProps> = ({ 
  placeholder, 
  onChange, 
  initialValues = [],
  maxItems,
  enableAISuggestions = false,
  onGetSuggestion,
  enableContextualDescription = false,
  onGetContextualDescription,
  baseDescription
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<string[]>(initialValues);
  const [newEntryText, setNewEntryText] = useState<string>('');
  const [suggestions, setSuggestions] = useState<{ [key: number]: string }>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<{ [key: number]: boolean }>({});
  const [newEntrySuggestions, setNewEntrySuggestions] = useState<string[]>([]);
  const [loadingNewEntrySuggestions, setLoadingNewEntrySuggestions] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [contextualDescription, setContextualDescription] = useState<string>('');
  const [loadingContextualDescription, setLoadingContextualDescription] = useState(false);

  // Mock AI suggestion function (replace with actual AI call later)
  const getMockSuggestion = useCallback(async (text: string): Promise<string> => {
    if (!text.trim()) return '';
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock suggestions based on content
    const mockSuggestions: { [key: string]: string } = {
      'project': 'Led cross-functional team in developing innovative solution that increased efficiency by 25%',
      'management': 'Managed a team of 5 developers while overseeing project delivery and stakeholder communication',
      'development': 'Developed scalable web application using modern technologies, serving 10,000+ users',
      'consulting': 'Provided strategic consulting to Fortune 500 companies, resulting in $2M cost savings',
    };
    
    // Find matching suggestion or create generic one
    const lowerText = text.toLowerCase();
    for (const [key, suggestion] of Object.entries(mockSuggestions)) {
      if (lowerText.includes(key)) {
        return suggestion;
      }
    }
    
    return `Enhanced version: ${text} with measurable impact and specific outcomes`;
  }, []);

  // Mock function to get new entry suggestions based on existing entries
  const getMockNewEntrySuggestions = useCallback(async (existingEntries: string[]): Promise<string[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Generate suggestions based on context
    const allEntries = existingEntries.filter(entry => entry.trim().length > 0);
    
    if (allEntries.length === 0) {
      return [
        'Led development of scalable web application',
        'Managed cross-functional team of 8 members',
        'Implemented cloud infrastructure reducing costs by 30%'
      ];
    }
    
    // Analyze existing entries and suggest related ones
    const hasProject = allEntries.some(entry => 
      entry.toLowerCase().includes('project') || 
      entry.toLowerCase().includes('development') ||
      entry.toLowerCase().includes('implement')
    );
    
    const hasManagement = allEntries.some(entry => 
      entry.toLowerCase().includes('manage') || 
      entry.toLowerCase().includes('lead') ||
      entry.toLowerCase().includes('team')
    );
    
    const hasConsulting = allEntries.some(entry => 
      entry.toLowerCase().includes('consult') || 
      entry.toLowerCase().includes('advise') ||
      entry.toLowerCase().includes('client')
    );
    
    const suggestions: string[] = [];
    
    if (hasProject && !hasManagement) {
      suggestions.push('Led team of 5 developers in agile environment');
    }
    if (hasManagement && !hasProject) {
      suggestions.push('Architected scalable microservices solution');
    }
    if (hasConsulting) {
      suggestions.push('Delivered training workshops for technical teams');
    }
    if (!hasConsulting && allEntries.length > 1) {
      suggestions.push('Provided strategic consulting to enterprise clients');
    }
    
    // Add some generic suggestions
    suggestions.push(
      'Optimized system performance resulting in 40% improvement',
      'Collaborated with stakeholders to define requirements',
      'Mentored junior developers and conducted code reviews'
    );
    
    return suggestions.slice(0, 3); // Return max 3 suggestions
  }, []);

  // Mock function to generate contextual descriptions based on existing entries
  const getMockContextualDescription = useCallback(async (existingEntries: string[]): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const filledEntries = existingEntries.filter(entry => entry.trim().length > 0);
    
    if (filledEntries.length === 0) {
      return baseDescription || `<ul><li>Start by adding your most impactful experiences or skills</li><li>Include specific achievements with measurable results</li><li>Think about what makes you unique in your field</li></ul>`;
    }
    
    // Analyze entries to provide contextual guidance
    const hasManagement = filledEntries.some(entry => 
      entry.toLowerCase().includes('manage') || 
      entry.toLowerCase().includes('lead') ||
      entry.toLowerCase().includes('team')
    );
    
    const hasTechnical = filledEntries.some(entry => 
      entry.toLowerCase().includes('develop') || 
      entry.toLowerCase().includes('implement') ||
      entry.toLowerCase().includes('architect') ||
      entry.toLowerCase().includes('code')
    );
    
    const hasConsulting = filledEntries.some(entry => 
      entry.toLowerCase().includes('consult') || 
      entry.toLowerCase().includes('advise') ||
      entry.toLowerCase().includes('client')
    );
    
    // Generate contextual descriptions based on detected patterns
    if (hasManagement && hasTechnical) {
      return `<ul><li>You're showing both technical and leadership experience - consider adding entries that highlight your ability to bridge technical and business domains</li><li>Consider including metrics and team sizes to quantify your impact</li><li>Add entries that show progression in responsibility</li></ul>`;
    }
    
    if (hasManagement) {
      return `<ul><li>Strong leadership profile emerging - consider adding technical depth to show your hands-on capabilities</li><li>Include specific team sizes and project outcomes</li><li>Consider adding entries about stakeholder management and strategic planning</li></ul>`;
    }
    
    if (hasTechnical) {
      return `<ul><li>Great technical foundation - consider adding leadership or mentoring experiences</li><li>Include business impact and metrics where possible</li><li>Consider adding collaborative and cross-functional experiences</li></ul>`;
    }
    
    if (hasConsulting) {
      return `<ul><li>Consulting experience is valuable - consider adding implementation details</li><li>Include client outcomes and business value delivered</li><li>Consider adding industry or domain expertise</li></ul>`;
    }
    
    // Generic guidance based on entry count
    if (filledEntries.length < 2) {
      return `<ul><li>Great start! Consider adding more entries to showcase the breadth of your experience</li><li>Include both technical and soft skills</li><li>Think about different types of experiences: project work, leadership, innovation, etc.</li></ul>`;
    }
    
    return `<ul><li>Good variety of experiences! Consider ensuring each entry has measurable outcomes</li><li>Balance different types of activities: individual contributor work, collaboration, and leadership</li><li>Consider organizing by impact or relevance to target roles</li></ul>`;
  }, [baseDescription]);

  // Function to update contextual description when entries change
  const updateContextualDescription = useCallback(async (entries: string[]) => {
    if (!enableContextualDescription || !onGetContextualDescription) return;
    
    try {
      setLoadingContextualDescription(true);
      const description = await (onGetContextualDescription(entries) || getMockContextualDescription(entries));
      setContextualDescription(description);
    } catch (error) {
      console.error('Error getting contextual description:', error);
      setContextualDescription(baseDescription || '');
    } finally {
      setLoadingContextualDescription(false);
    }
  }, [enableContextualDescription, onGetContextualDescription, baseDescription, getMockContextualDescription]);

  // Function to get new entry suggestions based on existing entries
  const getNewEntrySuggestions = useCallback(async (existingEntries: string[]) => {
    if (!enableAISuggestions) return;

    try {
      setLoadingNewEntrySuggestions(true);
      const suggestions = await getMockNewEntrySuggestions(existingEntries);
      setNewEntrySuggestions(suggestions);
    } catch (error) {
      console.error('Error getting new entry suggestions:', error);
      setNewEntrySuggestions([]);
    } finally {
      setLoadingNewEntrySuggestions(false);
    }
  }, [enableAISuggestions, getMockNewEntrySuggestions]);

  // Update item at specific index
  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    setItems(newItems);
    onChange?.(newItems);

    // Get AI suggestion for this item if enabled and has content
    if (enableAISuggestions && value.trim().length > 10) {
      getSuggestionForItem(index, value);
    } else if (suggestions[index]) {
      // Clear suggestion if item is too short
      const newSuggestions = { ...suggestions };
      delete newSuggestions[index];
      setSuggestions(newSuggestions);
    }

    // Update contextual description and new entry suggestions when items change
    if (enableContextualDescription) {
      updateContextualDescription(newItems);
    }
    if (enableAISuggestions) {
      // Debounce new entry suggestions to avoid too many API calls
      setTimeout(() => getNewEntrySuggestions(newItems), 500);
    }
  };

  // Add new item from input field
  const addItem = () => {
    if (newEntryText.trim()) {
      const newItems = [...items, newEntryText.trim()];
      setItems(newItems);
      onChange?.(newItems);
      setNewEntryText('');
      
      // Update contextual description when new item is added
      if (enableContextualDescription) {
        updateContextualDescription(newItems);
      }
      
      // Get AI suggestion for the new item if enabled
      if (enableAISuggestions && newEntryText.trim().length > 10) {
        getSuggestionForItem(newItems.length - 1, newEntryText.trim());
      }
      
      // Get new suggestions based on updated items
      if (enableAISuggestions) {
        getNewEntrySuggestions(newItems);
      }
    }
  };

  // Handle enter key press in new entry input
  const handleNewEntryKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  // Remove item at specific index
  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    onChange?.(newItems);

    // Remove suggestion for this item
    const newSuggestions = { ...suggestions };
    delete newSuggestions[index];
    
    // Adjust suggestion indices for items after the removed one
    Object.keys(newSuggestions).forEach(key => {
      const idx = parseInt(key);
      if (idx > index) {
        newSuggestions[idx - 1] = newSuggestions[idx];
        delete newSuggestions[idx];
      }
    });
    
    setSuggestions(newSuggestions);

    // Update contextual description and new entry suggestions when items change
    if (enableContextualDescription) {
      updateContextualDescription(newItems);
    }
    if (enableAISuggestions) {
      getNewEntrySuggestions(newItems);
    }
  };

  // Get AI suggestion for specific item
  const getSuggestionForItem = async (index: number, text: string) => {
    if (!enableAISuggestions || !text.trim()) return;

    try {
      setLoadingSuggestions(prev => ({ ...prev, [index]: true }));
      
      const suggestion = onGetSuggestion 
        ? await onGetSuggestion(text)
        : await getMockSuggestion(text);
      
      if (suggestion && suggestion.trim() !== text.trim()) {
        setSuggestions(prev => ({ ...prev, [index]: suggestion }));
      }
    } catch (error) {
      console.error('Error getting suggestion:', error);
    } finally {
      setLoadingSuggestions(prev => ({ ...prev, [index]: false }));
    }
  };

  // Apply AI suggestion to item
  const applySuggestion = (index: number) => {
    const suggestion = suggestions[index];
    if (suggestion) {
      updateItem(index, suggestion);
      // Clear the suggestion after applying
      const newSuggestions = { ...suggestions };
      delete newSuggestions[index];
      setSuggestions(newSuggestions);
    }
  };

  // Dismiss AI suggestion
  const dismissSuggestion = (index: number) => {
    const newSuggestions = { ...suggestions };
    delete newSuggestions[index];
    setSuggestions(newSuggestions);
  };

  // Add suggested entry as new item
  const addSuggestedEntry = (suggestion: string) => {
    const newItems = [...items, suggestion];
    setItems(newItems);
    onChange?.(newItems);
    
    // Update contextual description when new item is added
    if (enableContextualDescription) {
      updateContextualDescription(newItems);
    }
    
    // Get AI suggestion for the new item if enabled
    if (enableAISuggestions && suggestion.length > 10) {
      getSuggestionForItem(newItems.length - 1, suggestion);
    }
    
    // Get new suggestions based on updated items
    if (enableAISuggestions) {
      getNewEntrySuggestions(newItems);
    }
  };

  // Load initial suggestions when component mounts and AI is enabled
  useEffect(() => {
    if (enableAISuggestions) {
      // Small delay to let component render first
      setTimeout(() => {
        getNewEntrySuggestions(items);
      }, 1000);
    }
  }, [enableAISuggestions, getNewEntrySuggestions, items]);

  // Load initial contextual description
  useEffect(() => {
    if (enableContextualDescription) {
      updateContextualDescription(items);
    }
  }, [enableContextualDescription, updateContextualDescription, items]);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const draggedItem = newItems[draggedIndex];
    
    // Remove the dragged item
    newItems.splice(draggedIndex, 1);
    
    // Insert at new position (adjust index if we removed an item before the drop position)
    const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newItems.splice(insertIndex, 0, draggedItem);
    
    setItems(newItems);
    onChange?.(newItems);
    
    // Reset drag state
    setDraggedIndex(null);
    setDragOverIndex(null);
    
    // Update suggestions positions after reorder
    const newSuggestions: { [key: number]: string } = {};
    Object.entries(suggestions).forEach(([oldIndex, suggestion]) => {
      const oldIdx = parseInt(oldIndex);
      let newIdx = oldIdx;
      
      if (oldIdx === draggedIndex) {
        newIdx = insertIndex;
      } else if (draggedIndex < dropIndex) {
        if (oldIdx > draggedIndex && oldIdx <= dropIndex) {
          newIdx = oldIdx - 1;
        }
      } else {
        if (oldIdx >= dropIndex && oldIdx < draggedIndex) {
          newIdx = oldIdx + 1;
        }
      }
      
      if (newIdx !== oldIdx) {
        newSuggestions[newIdx] = suggestion;
      } else {
        newSuggestions[oldIdx] = suggestion;
      }
    });
    
    setSuggestions(newSuggestions);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="max-w-2xl space-y-4">
      {items.length > 0 && items.map((item, index) => (
        <div 
          key={index} 
          className={`space-y-2 transition-all duration-200 ${
            draggedIndex === index ? 'opacity-50 scale-95' : ''
          } ${
            dragOverIndex === index ? 'border-2 border-brand-blue border-dashed rounded-lg p-2 bg-blue-50' : ''
          }`}
          draggable
          onDragStart={(e) => handleDragStart(e, index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 items-start">
            {/* Drag Handle */}
            <div 
              className="mt-4 cursor-move text-gray-400 hover:text-gray-600 transition-colors"
              title="Drag to reorder"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 2zM7 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 8zM7 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 7 14zM13 2a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 2zM13 8a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 8zM13 14a2 2 0 1 1 .001 4.001A2 2 0 0 1 13 14z"/>
              </svg>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={item}
                onChange={(e) => updateItem(index, e.target.value)}
                placeholder={`${placeholder} ${index + 1}`}
                className="block w-full p-4 border-2 border-gray-200 rounded-lg text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:border-brand-blue focus:bg-white"
              />
            </div>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors duration-300"
                title={t('common.remove')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>
          
          {/* AI Suggestion Box */}
          {enableAISuggestions && (loadingSuggestions[index] || suggestions[index]) && (
            <div className="ml-0 pl-4 border-l-4 border-gray-300">
              {loadingSuggestions[index] ? (
                <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent"></div>
                  <span className="text-sm text-gray-500 italic">Getting AI suggestion...</span>
                </div>
              ) : suggestions[index] && (
                <div className="relative bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
                  {/* Quote styling */}
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                    </svg>
                    <div className="flex-1">
                      <p className="text-gray-700 italic leading-relaxed">{suggestions[index]}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => applySuggestion(index)}
                          className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200 transition-colors duration-200"
                          title="Apply suggestion"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Apply
                        </button>
                        <button
                          type="button"
                          onClick={() => dismissSuggestion(index)}
                          className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 transition-colors duration-200"
                          title="Dismiss suggestion"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {(!maxItems || items.length < maxItems) && (
        <div className="space-y-3">
          {/* New Entry Input Field */}
          <div className="flex gap-2">
            <input
              type="text"
              value={newEntryText}
              onChange={(e) => setNewEntryText(e.target.value)}
              onKeyPress={handleNewEntryKeyPress}
              placeholder={placeholder}
              className="flex-1 p-4 border-2 border-gray-200 rounded-lg text-base bg-gray-50 transition-all duration-300 focus:outline-none focus:border-brand-blue focus:bg-white"
            />
            <button
              type="button"
              onClick={addItem}
              disabled={!newEntryText.trim()}
              className="px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all duration-300 font-medium"
              title={t('common.addEntry')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
          </div>
          
          {/* Contextual Description - Smart Suggestions */}
          {enableContextualDescription && (contextualDescription || loadingContextualDescription) && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-amber-800 mb-2">
                    💡 Smart Suggestions
                  </h4>
                  {loadingContextualDescription ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                      <span className="text-sm text-amber-700">Analyzing your entries...</span>
                    </div>
                  ) : (
                    <div 
                      className="text-sm text-amber-700 prose prose-sm max-w-none prose-ul:my-2 prose-li:my-0"
                      dangerouslySetInnerHTML={{ __html: contextualDescription }}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* New Entry AI Suggestions */}
          {enableAISuggestions && (loadingNewEntrySuggestions || newEntrySuggestions.length > 0) && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">💡 Suggested entries:</p>
              {loadingNewEntrySuggestions ? (
                <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent"></div>
                  <span className="text-sm text-blue-700">Getting suggestions...</span>
                </div>
              ) : (
                <div className="grid gap-2">
                  {newEntrySuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => addSuggestedEntry(suggestion)}
                      className="text-left p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 hover:bg-blue-100 transition-colors duration-200 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="flex-1">{suggestion}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-xs text-blue-600">Add</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      {maxItems && items.length >= maxItems && (
        <p className="text-sm text-gray-500 italic">
          {t('common.maxItemsReached', { max: maxItems })}
        </p>
      )}
    </div>
  );
};
