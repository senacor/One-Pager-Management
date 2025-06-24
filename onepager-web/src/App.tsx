import { ProgressNav, StepBasicInfo, StepFocus, StepExperience, StepProjects, LanguageSwitcher } from './components';
import { useScrollSpy } from './hooks/useScrollSpy';
import './i18n';

const sectionIds = ['basic-info', 'focus', 'experience', 'projects'];

function App() {
  const activeIndex = useScrollSpy(sectionIds);

  const handleStepClick = (stepIndex: number) => {
    const targetSection = document.getElementById(sectionIds[stepIndex]);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Language Switcher */}
      <LanguageSwitcher />
      
      {/* Progress Navigation - hidden only on very small screens */}
      <div className="hidden lg:block">
        <ProgressNav currentStep={activeIndex} onStepClick={handleStepClick} />
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
    </div>
  );
}

export default App;
