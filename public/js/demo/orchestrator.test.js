/**
 * Unit Tests for Demo Mode Orchestrator
 * Simple test suite for core orchestrator functionality
 */

// Mock browser environment for Node.js testing
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

// Mock window object for Node.js
if (typeof window === 'undefined') {
  global.window = {
    location: {
      search: '',
      pathname: '/test'
    },
    addEventListener: () => {},
    DEMO_MODE_ENABLED: false
  };
  global.document = {
    cookie: '',
    addEventListener: () => {},
    hidden: false,
    readyState: 'complete'
  };
  global.localStorage = mockLocalStorage;
  global.sessionStorage = mockLocalStorage;
  global.fetch = async () => ({ ok: false });
}

// Test suite
const tests = {
  passed: 0,
  failed: 0,
  results: []
};

function assert(condition, message) {
  if (condition) {
    tests.passed++;
    tests.results.push({ status: 'PASS', message });
    console.log('✓', message);
  } else {
    tests.failed++;
    tests.results.push({ status: 'FAIL', message });
    console.error('✗', message);
  }
}

function assertEqual(actual, expected, message) {
  const condition = actual === expected;
  if (!condition) {
    console.error(`  Expected: ${expected}, Got: ${actual}`);
  }
  assert(condition, message);
}

function assertNotNull(value, message) {
  assert(value !== null && value !== undefined, message);
}

function assertArrayIncludes(array, value, message) {
  assert(array.includes(value), message);
}

// Load the orchestrator
if (typeof require !== 'undefined') {
  // Node.js environment
  const DemoModeOrchestrator = require('./orchestrator.js');
  global.DemoModeOrchestrator = DemoModeOrchestrator;
}

console.log('\n=== Demo Mode Orchestrator Tests ===\n');

// Test 1: Initialization
console.log('Test Suite: Initialization');
try {
  const orchestrator = new DemoModeOrchestrator();
  assertNotNull(orchestrator, 'Orchestrator should be created');
  assertNotNull(orchestrator.state, 'State should be initialized');
  assertNotNull(orchestrator.config, 'Config should be initialized');
  assertEqual(orchestrator.state.currentRole, 'investor', 'Default role should be investor');
  assertEqual(orchestrator.state.simulationRunning, false, 'Simulation should not be running initially');
  assertEqual(orchestrator.state.walkthroughActive, false, 'Walkthrough should not be active initially');
  assertEqual(orchestrator.state.scenarioPlaying, false, 'Scenario should not be playing initially');
} catch (error) {
  console.error('Initialization test failed:', error);
  tests.failed++;
}

// Test 2: State Management
console.log('\nTest Suite: State Management');
try {
  const orchestrator = new DemoModeOrchestrator();
  
  // Test getState
  const state = orchestrator.getState();
  assertNotNull(state, 'getState should return state object');
  assertEqual(typeof state.isActive, 'boolean', 'isActive should be boolean');
  assertEqual(typeof state.currentRole, 'string', 'currentRole should be string');
  
  // Test state immutability
  const originalRole = state.currentRole;
  state.currentRole = 'modified';
  const newState = orchestrator.getState();
  assertEqual(newState.currentRole, originalRole, 'State should be immutable');
} catch (error) {
  console.error('State management test failed:', error);
  tests.failed++;
}

// Test 3: Configuration Management
console.log('\nTest Suite: Configuration Management');
try {
  const orchestrator = new DemoModeOrchestrator();
  
  // Test getConfiguration
  const config = orchestrator.getConfiguration();
  assertNotNull(config, 'getConfiguration should return config object');
  assertEqual(typeof config.enableLiveSimulation, 'boolean', 'enableLiveSimulation should be boolean');
  assertEqual(typeof config.simulationInterval, 'number', 'simulationInterval should be number');
  
  // Test updateConfiguration
  orchestrator.updateConfiguration({ simulationInterval: 30000 });
  const updatedConfig = orchestrator.getConfiguration();
  assertEqual(updatedConfig.simulationInterval, 30000, 'Configuration should be updated');
} catch (error) {
  console.error('Configuration management test failed:', error);
  tests.failed++;
}

// Test 4: Event Emitter
console.log('\nTest Suite: Event Emitter');
try {
  const orchestrator = new DemoModeOrchestrator();
  let eventFired = false;
  let eventData = null;
  
  // Test on/emit
  orchestrator.on('test-event', (data) => {
    eventFired = true;
    eventData = data;
  });
  
  orchestrator.emit('test-event', { test: 'data' });
  assertEqual(eventFired, true, 'Event listener should be called');
  assertNotNull(eventData, 'Event data should be passed to listener');
  assertEqual(eventData.test, 'data', 'Event data should match emitted data');
  
  // Test off
  eventFired = false;
  const callback = () => { eventFired = true; };
  orchestrator.on('test-event-2', callback);
  orchestrator.off('test-event-2', callback);
  orchestrator.emit('test-event-2');
  assertEqual(eventFired, false, 'Removed listener should not be called');
} catch (error) {
  console.error('Event emitter test failed:', error);
  tests.failed++;
}

// Test 5: Simulation Control
console.log('\nTest Suite: Simulation Control');
try {
  const orchestrator = new DemoModeOrchestrator();
  orchestrator.config.enableLiveSimulation = true;
  
  let simulationStarted = false;
  orchestrator.on('simulation-started', () => { simulationStarted = true; });
  
  // Test startSimulation
  orchestrator.startSimulation();
  assertEqual(orchestrator.state.simulationRunning, true, 'Simulation should be running after start');
  assertEqual(simulationStarted, true, 'simulation-started event should fire');
  
  // Test stopSimulation
  let simulationStopped = false;
  orchestrator.on('simulation-stopped', () => { simulationStopped = true; });
  orchestrator.stopSimulation();
  assertEqual(orchestrator.state.simulationRunning, false, 'Simulation should stop');
  assertEqual(simulationStopped, true, 'simulation-stopped event should fire');
} catch (error) {
  console.error('Simulation control test failed:', error);
  tests.failed++;
}

// Test 6: Walkthrough Control
console.log('\nTest Suite: Walkthrough Control');
try {
  const orchestrator = new DemoModeOrchestrator();
  orchestrator.config.enableWalkthrough = true;
  
  let walkthroughStarted = false;
  let walkthroughId = null;
  orchestrator.on('walkthrough-started', (data) => {
    walkthroughStarted = true;
    walkthroughId = data.walkthroughId;
  });
  
  // Test startWalkthrough
  orchestrator.startWalkthrough('test-walkthrough');
  assertEqual(orchestrator.state.walkthroughActive, true, 'Walkthrough should be active');
  assertEqual(orchestrator.state.currentWalkthrough, 'test-walkthrough', 'Current walkthrough should be set');
  assertEqual(walkthroughStarted, true, 'walkthrough-started event should fire');
  assertEqual(walkthroughId, 'test-walkthrough', 'Event should include walkthrough ID');
  
  // Test completeWalkthrough
  let walkthroughCompleted = false;
  orchestrator.on('walkthrough-completed', () => { walkthroughCompleted = true; });
  orchestrator.completeWalkthrough('test-walkthrough');
  assertEqual(orchestrator.state.walkthroughActive, false, 'Walkthrough should not be active after completion');
  assertEqual(walkthroughCompleted, true, 'walkthrough-completed event should fire');
  assertArrayIncludes(
    orchestrator.state.analytics.walkthroughsCompleted,
    'test-walkthrough',
    'Completed walkthrough should be tracked'
  );
} catch (error) {
  console.error('Walkthrough control test failed:', error);
  tests.failed++;
}

// Test 7: Scenario Control
console.log('\nTest Suite: Scenario Control');
try {
  const orchestrator = new DemoModeOrchestrator();
  orchestrator.config.enableScenarios = true;
  
  let scenarioStarted = false;
  orchestrator.on('scenario-started', () => { scenarioStarted = true; });
  
  // Test playScenario
  orchestrator.playScenario('test-scenario');
  assertEqual(orchestrator.state.scenarioPlaying, true, 'Scenario should be playing');
  assertEqual(orchestrator.state.currentScenario, 'test-scenario', 'Current scenario should be set');
  assertEqual(scenarioStarted, true, 'scenario-started event should fire');
  
  // Test completeScenario
  let scenarioCompleted = false;
  orchestrator.on('scenario-completed', () => { scenarioCompleted = true; });
  orchestrator.completeScenario('test-scenario');
  assertEqual(orchestrator.state.scenarioPlaying, false, 'Scenario should not be playing after completion');
  assertEqual(scenarioCompleted, true, 'scenario-completed event should fire');
  assertArrayIncludes(
    orchestrator.state.analytics.scenariosCompleted,
    'test-scenario',
    'Completed scenario should be tracked'
  );
} catch (error) {
  console.error('Scenario control test failed:', error);
  tests.failed++;
}

// Test 8: Role Switching
console.log('\nTest Suite: Role Switching');
try {
  const orchestrator = new DemoModeOrchestrator();
  
  let roleSwitched = false;
  let roleData = null;
  orchestrator.on('role-switched', (data) => {
    roleSwitched = true;
    roleData = data;
  });
  
  // Test switchRole
  orchestrator.switchRole('reviewer');
  assertEqual(orchestrator.state.currentRole, 'reviewer', 'Role should be switched');
  assertEqual(roleSwitched, true, 'role-switched event should fire');
  assertEqual(roleData.previousRole, 'investor', 'Previous role should be tracked');
  assertEqual(roleData.newRole, 'reviewer', 'New role should be tracked');
  
  // Test invalid role
  orchestrator.switchRole('invalid-role');
  assertEqual(orchestrator.state.currentRole, 'reviewer', 'Role should not change for invalid role');
} catch (error) {
  console.error('Role switching test failed:', error);
  tests.failed++;
}

// Test 9: Component Registration
console.log('\nTest Suite: Component Registration');
try {
  const orchestrator = new DemoModeOrchestrator();
  const mockComponent = { name: 'test-component' };
  
  let componentRegistered = false;
  orchestrator.on('component-registered', () => { componentRegistered = true; });
  
  // Test registerComponent
  orchestrator.registerComponent('walkthroughEngine', mockComponent);
  assertEqual(componentRegistered, true, 'component-registered event should fire');
  
  // Test getComponent
  const retrieved = orchestrator.getComponent('walkthroughEngine');
  assertEqual(retrieved, mockComponent, 'Retrieved component should match registered component');
  
  // Test unknown component
  const unknown = orchestrator.getComponent('unknown-component');
  assertEqual(unknown, null, 'Unknown component should return null');
} catch (error) {
  console.error('Component registration test failed:', error);
  tests.failed++;
}

// Test 10: Analytics
console.log('\nTest Suite: Analytics');
try {
  const orchestrator = new DemoModeOrchestrator();
  orchestrator.config.enableAnalytics = true;
  
  // Test trackFeatureView
  orchestrator.trackFeatureView('test-feature', 'test-details');
  assertEqual(orchestrator.state.analytics.featuresViewed.length, 1, 'Feature view should be tracked');
  
  // Test getAnalytics
  const analytics = orchestrator.getAnalytics();
  assertNotNull(analytics, 'getAnalytics should return analytics object');
  assertNotNull(analytics.sessionId, 'Analytics should include session ID');
  assertEqual(typeof analytics.duration, 'number', 'Duration should be a number');
  
  // Test resetAnalytics
  const oldSessionId = analytics.sessionId;
  orchestrator.resetAnalytics();
  const newAnalytics = orchestrator.getAnalytics();
  assert(newAnalytics.sessionId !== oldSessionId, 'Session ID should change after reset');
  assertEqual(newAnalytics.featuresViewed, 0, 'Features viewed should be reset');
} catch (error) {
  console.error('Analytics test failed:', error);
  tests.failed++;
}

// Test 11: Session ID Generation
console.log('\nTest Suite: Session ID Generation');
try {
  const orchestrator = new DemoModeOrchestrator();
  
  const sessionId1 = orchestrator.generateSessionId();
  const sessionId2 = orchestrator.generateSessionId();
  
  assertNotNull(sessionId1, 'Session ID should be generated');
  assert(sessionId1.startsWith('demo-session-'), 'Session ID should have correct prefix');
  assert(sessionId1 !== sessionId2, 'Session IDs should be unique');
} catch (error) {
  console.error('Session ID generation test failed:', error);
  tests.failed++;
}

// Test 12: Cleanup
console.log('\nTest Suite: Cleanup');
try {
  const orchestrator = new DemoModeOrchestrator();
  orchestrator.config.enableLiveSimulation = true;
  
  // Start features
  orchestrator.startSimulation();
  orchestrator.startWalkthrough('test');
  orchestrator.playScenario('test');
  
  let cleanupFired = false;
  orchestrator.on('cleanup', () => { cleanupFired = true; });
  
  // Test cleanup
  orchestrator.cleanup();
  assertEqual(orchestrator.state.simulationRunning, false, 'Simulation should stop on cleanup');
  assertEqual(orchestrator.state.walkthroughActive, false, 'Walkthrough should stop on cleanup');
  assertEqual(orchestrator.state.scenarioPlaying, false, 'Scenario should stop on cleanup');
  assertEqual(cleanupFired, true, 'cleanup event should fire');
} catch (error) {
  console.error('Cleanup test failed:', error);
  tests.failed++;
}

// Print summary
console.log('\n=== Test Summary ===');
console.log(`Total: ${tests.passed + tests.failed}`);
console.log(`Passed: ${tests.passed}`);
console.log(`Failed: ${tests.failed}`);
console.log(`Success Rate: ${((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1)}%`);

if (tests.failed === 0) {
  console.log('\n✓ All tests passed!');
} else {
  console.log('\n✗ Some tests failed');
  process.exit(1);
}
