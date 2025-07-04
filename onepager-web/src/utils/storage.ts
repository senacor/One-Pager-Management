import type { OnePagerData } from '../types/onepager';
import { STORAGE_KEYS } from '../types/onepager';

// Storage utility functions
export const saveToStorage = (data: OnePagerData): void => {
    try {
        const serializedData = JSON.stringify({
            ...data,
            metadata: {
                ...data.metadata,
                lastUpdated: data.metadata.lastUpdated.toISOString(),
            },
        });
        localStorage.setItem(STORAGE_KEYS.ONEPAGER_DATA, serializedData);
        console.log('💾 Data saved to localStorage:', {
            fullName: data.basicInfo.fullName,
            focusAreas: data.focusAreas.length,
            key: STORAGE_KEYS.ONEPAGER_DATA
        });
    } catch (error) {
        console.error('Failed to save data to localStorage:', error);
    }
};

export const loadFromStorage = (): OnePagerData | null => {
    try {
        const serializedData = localStorage.getItem(STORAGE_KEYS.ONEPAGER_DATA);
        console.log('📂 Loading from localStorage:', {
            key: STORAGE_KEYS.ONEPAGER_DATA,
            hasData: !!serializedData,
            dataLength: serializedData?.length
        });

        if (!serializedData) {
            console.log('📂 No data found in localStorage');
            return null;
        }

        const parsedData = JSON.parse(serializedData);

        // Convert lastUpdated back to Date object
        if (parsedData.metadata?.lastUpdated) {
            parsedData.metadata.lastUpdated = new Date(parsedData.metadata.lastUpdated);
        }

        console.log('📂 Data loaded from localStorage:', {
            fullName: parsedData.basicInfo?.fullName,
            focusAreas: parsedData.focusAreas?.length
        });

        return parsedData as OnePagerData;
    } catch (error) {
        console.error('Failed to load data from localStorage:', error);
        return null;
    }
};

export const clearStorage = (): void => {
    try {
        localStorage.removeItem(STORAGE_KEYS.ONEPAGER_DATA);
    } catch (error) {
        console.error('Failed to clear data from localStorage:', error);
    }
};

export const exportData = (data: OnePagerData): string => {
    return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): OnePagerData | null => {
    try {
        const parsedData = JSON.parse(jsonString);

        // Basic validation of the imported data structure
        if (!parsedData.basicInfo || !parsedData.focusAreas || !parsedData.experience || !parsedData.projects) {
            throw new Error('Invalid data structure');
        }

        // Convert date strings back to Date objects if needed
        if (parsedData.metadata?.lastUpdated && typeof parsedData.metadata.lastUpdated === 'string') {
            parsedData.metadata.lastUpdated = new Date(parsedData.metadata.lastUpdated);
        }

        return parsedData as OnePagerData;
    } catch (error) {
        console.error('Failed to import data:', error);
        return null;
    }
};
