import React from 'react';
import { useTranslation, Trans } from 'react-i18next';

interface StepProps {
    id: string;
    title: string;
    descriptionKey?: string; // Optional translation key for Trans component
    children: React.ReactNode;
    className?: string;
}

export const Step: React.FC<StepProps> = ({
    id,
    title,
    descriptionKey,
    children,
    className = ''
}) => {
    const { t } = useTranslation();
    return (
        <section id={id} className={`min-h-screen py-8 border-b border-gray-200 ${className}`}>
            {/* Step Header - Full Width */}
            <div className="mb-8">
                <h2 className="text-3xl font-bold uppercase text-brand-blue mb-3 relative tracking-wide">
                    {title}
                    <div className="absolute bottom-[-10px] left-0 w-16 h-1 bg-brand-blue rounded opacity-80"></div>
                </h2>
            </div>      {/* Description for small screens - shown between header and content */}
            {descriptionKey && (
                <div className="lg:hidden mb-8">
                    <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-brand-blue">
                        <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                            {t('common.stepGuide')}
                        </h3>
                        <div className="text-gray-700 leading-relaxed text-sm">
                            <Trans
                                i18nKey={descriptionKey}
                                components={{
                                    ul: <ul className="list-disc list-outside ml-4 space-y-2 mt-3 mb-3 marker:text-brand-blue" />,
                                    li: <li className="leading-relaxed pl-2" />,
                                    strong: <strong className="font-semibold text-gray-800" />,
                                    em: <em className="italic text-gray-700" />
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area - Single column on small, two columns on large screens */}
            <div className="lg:flex lg:gap-12">
                {/* Main Content */}
                <div className="flex-1 max-w-3xl">
                    <div className="space-y-6">
                        {children}
                    </div>
                </div>        {/* Description - Right Side on large screens only */}
                {descriptionKey && (
                    <div className="hidden lg:block w-80 flex-shrink-0">
                        <div className="sticky top-8">
                            <div className="bg-gray-50 p-6 rounded-lg border-l-4 border-brand-blue">
                                <h3 className="font-semibold text-gray-800 mb-3 text-sm uppercase tracking-wide">
                                    {t('common.stepGuide')}
                                </h3>
                                <div className="text-gray-700 leading-relaxed text-sm">
                                    <Trans
                                        i18nKey={descriptionKey}
                                        components={{
                                            ul: <ul className="list-disc list-outside ml-4 space-y-2 mt-3 mb-3 marker:text-brand-blue" />,
                                            li: <li className="leading-relaxed pl-2" />,
                                            strong: <strong className="font-semibold text-gray-800" />,
                                            em: <em className="italic text-gray-700" />
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};
