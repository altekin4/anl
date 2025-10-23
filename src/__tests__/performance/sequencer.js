const Sequencer = require('@jest/test-sequencer').default;

class PerformanceTestSequencer extends Sequencer {
  sort(tests) {
    // Define the order of performance tests
    const testOrder = [
      'DatabasePerformance.test.ts', // Run database tests first
      'CachePerformance.test.ts',    // Then cache tests
      'LoadTest.test.ts',            // Finally load tests
    ];

    return tests.sort((testA, testB) => {
      const aIndex = testOrder.findIndex(name => testA.path.includes(name));
      const bIndex = testOrder.findIndex(name => testB.path.includes(name));
      
      // If both tests are in our order list, sort by order
      if (aIndex !== -1 && bIndex !== -1) {
        return aIndex - bIndex;
      }
      
      // If only one is in the list, prioritize it
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      
      // If neither is in the list, maintain original order
      return 0;
    });
  }
}

module.exports = PerformanceTestSequencer;