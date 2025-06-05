import { loadFeature, autoBindSteps } from 'jest-cucumber';
import { localOnePagerSteps } from '../../features/step_definitions/stepDefs.steps';



const feature = loadFeature("features/LocalizedOnePagers.feature");

autoBindSteps(feature, [localOnePagerSteps]);
