import { describe, it, expect, beforeEach } from '@jest/globals';
import { onePagerReducer, createInitialState } from '../store/onePagerReducer';
import type { OnePagerAction } from '../types/onepager';

describe('OnePager Reducer', () => {
  let initialState: ReturnType<typeof createInitialState>;

  beforeEach(() => {
    initialState = createInitialState();
  });

  it('should create initial state correctly', () => {
    expect(initialState.basicInfo.fullName).toBe('');
    expect(initialState.basicInfo.position).toBe('');
    expect(initialState.focusAreas).toEqual([]);
    expect(initialState.experience).toEqual([]);
    expect(initialState.projects).toEqual([]);
    expect(initialState.metadata.isComplete).toBe(false);
    expect(initialState.validation.isValid).toBe(false);
  });

  it('should update basic info', () => {
    const action: OnePagerAction = {
      type: 'UPDATE_BASIC_INFO',
      payload: { fullName: 'John Doe', position: 'Software Engineer' }
    };

    const newState = onePagerReducer(initialState, action);

    expect(newState.basicInfo.fullName).toBe('John Doe');
    expect(newState.basicInfo.position).toBe('Software Engineer');
    expect(newState.metadata.lastUpdated).toBeInstanceOf(Date);
  });

  it('should update focus areas', () => {
    const action: OnePagerAction = {
      type: 'UPDATE_FOCUS_AREAS',
      payload: ['React', 'TypeScript', 'Node.js']
    };

    const newState = onePagerReducer(initialState, action);

    expect(newState.focusAreas).toEqual(['React', 'TypeScript', 'Node.js']);
  });

  it('should update experience', () => {
    const action: OnePagerAction = {
      type: 'UPDATE_EXPERIENCE',
      payload: ['Senior Developer at Company A', 'Team Lead at Company B']
    };

    const newState = onePagerReducer(initialState, action);

    expect(newState.experience).toEqual(['Senior Developer at Company A', 'Team Lead at Company B']);
  });

  it('should update projects', () => {
    const action: OnePagerAction = {
      type: 'UPDATE_PROJECTS',
      payload: ['E-commerce Platform', 'Mobile App Development']
    };

    const newState = onePagerReducer(initialState, action);

    expect(newState.projects).toEqual(['E-commerce Platform', 'Mobile App Development']);
  });

  it('should set step completion status', () => {
    const action: OnePagerAction = {
      type: 'SET_STEP_COMPLETION',
      payload: { step: 'basicInfo', isComplete: true }
    };

    const newState = onePagerReducer(initialState, action);

    expect(newState.metadata.stepCompletionStatus.basicInfo).toBe(true);
  });

  it('should set validation errors', () => {
    const action: OnePagerAction = {
      type: 'SET_VALIDATION_ERRORS',
      payload: { field: 'fullName', errors: ['Full name is required'] }
    };

    const newState = onePagerReducer(initialState, action);

    expect(newState.validation.errors.fullName).toEqual(['Full name is required']);
    expect(newState.validation.isValid).toBe(false);
  });

  it('should clear validation errors when field is valid', () => {
    // First set an error
    const setErrorAction: OnePagerAction = {
      type: 'SET_VALIDATION_ERRORS',
      payload: { field: 'fullName', errors: ['Full name is required'] }
    };

    let newState = onePagerReducer(initialState, setErrorAction);
    expect(newState.validation.errors.fullName).toEqual(['Full name is required']);

    // Then clear the error
    const clearErrorAction: OnePagerAction = {
      type: 'SET_VALIDATION_ERRORS',
      payload: { field: 'fullName', errors: [] }
    };

    newState = onePagerReducer(newState, clearErrorAction);
    expect(newState.validation.errors.fullName).toBeUndefined();
    expect(newState.validation.isValid).toBe(true);
  });

  it('should reset data', () => {
    // First modify the state
    let modifiedState = onePagerReducer(initialState, {
      type: 'UPDATE_BASIC_INFO',
      payload: { fullName: 'John Doe' }
    });

    modifiedState = onePagerReducer(modifiedState, {
      type: 'UPDATE_FOCUS_AREAS',
      payload: ['React']
    });

    expect(modifiedState.basicInfo.fullName).toBe('John Doe');
    expect(modifiedState.focusAreas).toEqual(['React']);

    // Then reset
    const resetAction: OnePagerAction = { type: 'RESET_DATA' };
    const resetState = onePagerReducer(modifiedState, resetAction);

    expect(resetState.basicInfo.fullName).toBe('');
    expect(resetState.focusAreas).toEqual([]);
  });

  it('should load data', () => {
    const loadedData = {
      ...initialState,
      basicInfo: { ...initialState.basicInfo, fullName: 'Loaded User' },
      focusAreas: ['React', 'Vue']
    };

    const action: OnePagerAction = {
      type: 'LOAD_DATA',
      payload: loadedData
    };

    const newState = onePagerReducer(initialState, action);

    expect(newState.basicInfo.fullName).toBe('Loaded User');
    expect(newState.focusAreas).toEqual(['React', 'Vue']);
    expect(newState.metadata.lastUpdated).toBeInstanceOf(Date);
  });
});
