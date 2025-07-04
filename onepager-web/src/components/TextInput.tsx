import React from 'react';

interface TextInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    type?: 'text' | 'email' | 'password' | 'tel';
    className?: string;
    error?: string;
    required?: boolean;
    disabled?: boolean;
    maxLength?: number;
}

export const TextInput: React.FC<TextInputProps> = ({
    value,
    onChange,
    placeholder,
    label,
    type = 'text',
    className = '',
    error,
    required = false,
    disabled = false,
    maxLength
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
    };

    const inputClasses = `
    block w-full p-4 border-2 rounded-lg text-base bg-gray-50 transition-all duration-300
    focus:outline-none focus:bg-white
    ${error
            ? 'border-red-300 focus:border-red-500'
            : 'border-gray-200 focus:border-brand-blue'
        }
    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
    ${className}
  `.trim().replace(/\s+/g, ' ');

    return (
        <div className="space-y-1">
            {label && (
                <label className="block text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <input
                type={type}
                value={value}
                onChange={handleChange}
                placeholder={placeholder}
                className={inputClasses}
                disabled={disabled}
                maxLength={maxLength}
                required={required}
            />

            {error && (
                <p className="text-red-500 text-sm">{error}</p>
            )}

            {maxLength && (
                <p className="text-gray-400 text-xs text-right">
                    {value.length}/{maxLength}
                </p>
            )}
        </div>
    );
};
