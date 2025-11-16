/**
 * Live Simulator Verification Script
 * Run this to verify the Live Simulator implementation
 */

(function() {
  console.log('=== Live Simulator Verification ===\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };
  
  function test(name, fn) {
    try {
      fn();
      results.passed++;
      results.tests.push({ name, status: 'PASS' });
      console.log('✅', name);
    } catch (error) {
      results.failed++;
      results.tests.push({ name, status: 'FAIL', error: error.message });
      console.error('❌', name, '-', error.message);
    }
  }
  
  // Test 1: Class exists
  test('LiveSimulator class exists', () => {
    if (typeof LiveSimulator !== 'function') {
      throw new Error('LiveSimulator class not found');
    }
  });
  
  // Test 2: Can instantiate
  test('Can instantiate LiveSimulator', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    if (!simulator) {
      throw new Error('Failed to create instance');
    }
  });
  
  // Test 3: Has required methods
  test('Has required methods', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    const requiredMethods = [
      'start', 'stop', 'generateEvent', 'setEventProbabilities',
      'setIntensity', 'getEventHistory', 'clearHistory', 'getStatistics'
    ];
    
    requiredMethods.forEach(method => {
      if (typeof simulator[method] !== 'function') {
        throw new Error(`Missing method: ${method}`);
      }
    });
  });
  
  // Test 4: Has correct initial state
  test('Has correct initial state', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    if (simulator.isRunning !== false) {
      throw new Error('Should not be running initially');
    }
    if (!Array.isArray(simulator.eventHistory)) {
      throw new Error('eventHistory should be an array');
    }
  });
  
  // Test 5: Can generate event
  test('Can generate event', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    const event = simulator.generateEvent();
    
    if (!event || typeof event !== 'object') {
      throw new Error('generateEvent should return an object');
    }
    if (!event.id || !event.type || !event.timestamp || !event.data || !event.notification) {
      throw new Error('Event missing required properties');
    }
  });
  
  // Test 6: Event has correct structure
  test('Event has correct structure', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    const event = simulator.generateEvent();
    
    // Check notification structure
    if (!event.notification.title || !event.notification.icon || !event.notification.color) {
      throw new Error('Notification missing required properties');
    }
    
    // Check timestamp is Date
    if (!(event.timestamp instanceof Date)) {
      throw new Error('Timestamp should be a Date object');
    }
  });
  
  // Test 7: Supports all event types
  test('Supports all event types', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    const expectedTypes = [
      'new_application', 'status_change', 'document_uploaded',
      'review_completed', 'approval_granted', 'rejection_issued',
      'comment_added', 'ai_analysis_complete'
    ];
    
    const configTypes = simulator.config.eventTypes;
    expectedTypes.forEach(type => {
      if (!configTypes.includes(type)) {
        throw new Error(`Missing event type: ${type}`);
      }
    });
  });
  
  // Test 8: Can set intensity
  test('Can set intensity', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    ['low', 'medium', 'high'].forEach(intensity => {
      simulator.setIntensity(intensity);
      if (simulator.config.intensity !== intensity) {
        throw new Error(`Failed to set intensity to ${intensity}`);
      }
    });
  });
  
  // Test 9: Can set event probabilities
  test('Can set event probabilities', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    simulator.setEventProbabilities({
      new_application: 0.5,
      approval_granted: 0.5
    });
    
    if (simulator.config.eventProbabilities.new_application !== 0.5) {
      throw new Error('Failed to set event probabilities');
    }
  });
  
  // Test 10: Event history works
  test('Event history works', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    // Generate some events
    simulator.generateEvent();
    simulator.generateEvent();
    simulator.generateEvent();
    
    const history = simulator.getEventHistory();
    if (history.length !== 3) {
      throw new Error('Event history should have 3 events');
    }
  });
  
  // Test 11: Can clear history
  test('Can clear history', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    simulator.generateEvent();
    simulator.clearHistory();
    
    const history = simulator.getEventHistory();
    if (history.length !== 0) {
      throw new Error('History should be empty after clear');
    }
  });
  
  // Test 12: Statistics work
  test('Statistics work', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    simulator.generateEvent();
    simulator.generateEvent();
    
    const stats = simulator.getStatistics();
    if (!stats || typeof stats !== 'object') {
      throw new Error('getStatistics should return an object');
    }
    if (stats.totalEvents !== 2) {
      throw new Error('Statistics should show 2 total events');
    }
  });
  
  // Test 13: Start/stop work
  test('Start/stop work', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    simulator.start({ interval: 1000 });
    if (!simulator.isRunning) {
      throw new Error('Should be running after start');
    }
    
    simulator.stop();
    if (simulator.isRunning) {
      throw new Error('Should not be running after stop');
    }
  });
  
  // Test 14: Orchestrator integration
  test('Orchestrator integration', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    if (simulator.orchestrator !== window.demoOrchestrator) {
      throw new Error('Orchestrator not properly set');
    }
  });
  
  // Test 15: Event counter increments
  test('Event counter increments', () => {
    const simulator = new LiveSimulator(window.demoOrchestrator);
    
    const event1 = simulator.generateEvent();
    const event2 = simulator.generateEvent();
    
    const id1 = parseInt(event1.id.split('-').pop());
    const id2 = parseInt(event2.id.split('-').pop());
    
    if (id2 !== id1 + 1) {
      throw new Error('Event counter should increment');
    }
  });
  
  // Print results
  console.log('\n=== Verification Results ===');
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total: ${results.tests.length}`);
  
  if (results.failed === 0) {
    console.log('\n✅ All tests passed! Live Simulator is working correctly.');
  } else {
    console.log('\n❌ Some tests failed. Please review the errors above.');
  }
  
  return results;
})();
