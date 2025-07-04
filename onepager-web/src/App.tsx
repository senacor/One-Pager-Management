import { useEffect, useState } from 'react';
import { ProgressNav, StepBasicInfo, StepFocus, StepExperience, StepProjects, LanguageSwitcher, ImportWizard } from './components';
import { DebugPanel } from './components/DebugPanel';
import { OnePagerProvider } from './context/OnePagerContext';
import { ActiveStepProvider } from './context/ActiveStepContext.tsx';
import { useScrollSpy } from './hooks/useScrollSpy';
import { initializeMockAIService } from './services';
import './i18n';

const sectionIds = ['basic-info', 'focus', 'experience', 'projects'];

function App() {
    const activeIndex = useScrollSpy(sectionIds);
    const [isImportWizardOpen, setIsImportWizardOpen] = useState(false);

    // Initialize AI service on app startup
    useEffect(() => {
        const initializeAI = async () => {
            try {
                await initializeMockAIService({
                    responseDelay: 800,
                    failureRate: 0 // No failures in production mock
                });
                console.log('AI service initialized successfully');
            } catch (error) {
                console.error('Failed to initialize AI service:', error);
            }
        };

        initializeAI();
    }, []);

    const handleStepClick = (stepIndex: number) => {
        const targetSection = document.getElementById(sectionIds[stepIndex]);
        if (targetSection) {
            targetSection.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <OnePagerProvider>
            <ActiveStepProvider activeStepIndex={activeIndex} sectionIds={sectionIds}>
                <div className="bg-gray-50 min-h-screen">
                    {/* Language Switcher positioned at top-right */}
                    <div className="fixed top-4 right-4 z-60">
                        <LanguageSwitcher />
                    </div>

                    {/* Progress Navigation - with import button integrated */}
                    <div className="hidden lg:block">
                        <ProgressNav
                            currentStep={activeIndex}
                            onStepClick={handleStepClick}
                            onImportClick={() => setIsImportWizardOpen(true)}
                        />
                    </div>

                    {/* Main Content */}
                    <main className="lg:ml-64 bg-white lg:mx-10 lg:my-10 lg:rounded-3xl lg:shadow-2xl">
                        <div className="p-16">
                            <StepBasicInfo onNext={() => handleStepClick(1)} />
                            <StepFocus />
                            <StepExperience />
                            <StepProjects />
                        </div>
                    </main>

                    {/* Debug Panel for Development */}
                    <DebugPanel />

                    {/* Import Wizard */}
                    <ImportWizard
                        isOpen={isImportWizardOpen}
                        onClose={() => setIsImportWizardOpen(false)}
                    />
                </div>
            </ActiveStepProvider>
        </OnePagerProvider>
    );
}

export default App;
