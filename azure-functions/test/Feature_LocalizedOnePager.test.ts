import { loadFeatures, autoBindSteps } from 'jest-cucumber';
import { localOnePagerSteps } from '../features/step_definitions/stepDefs.steps';



const features = loadFeatures("features/*.feature");

autoBindSteps(features, [localOnePagerSteps]);
