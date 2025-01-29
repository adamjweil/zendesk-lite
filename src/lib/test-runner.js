import { langfuse } from './langfuse';
import { 
  processMessage, 
  generateEmbedding,
  testQueryPerformance, 
  testEmbeddingQuality, 
  testUserSession, 
  runComprehensiveTests 
} from './ai-service';

// Individual test runners
export const runTests = async (testType) => {
  console.log(`Starting ${testType} tests...`)
  
  const debugTrace = langfuse.trace({
    name: 'debug_test',
    metadata: {
      testType: testType,
      timestamp: new Date().toISOString()
    }
  });

  try {
    // Create a simple test based on type
    switch(testType) {
      case 'performance':
        await testPerformance(debugTrace)
        break
      case 'embedding':
        await testEmbeddings(debugTrace)
        break
      case 'comprehensive':
        await testComprehensive(debugTrace)
        break
      default:
        console.error('Unknown test type')
    }

    debugTrace.update({
      status: 'success',
      statusMessage: `${testType} tests completed successfully`
    });
    console.log(`${testType} tests completed`)
  } catch (error) {
    console.error(`Error running ${testType} tests:`, error)
    debugTrace.update({
      status: 'error',
      statusMessage: error.message
    });
  }
}

// Simple test implementations
async function testPerformance(trace) {
  const span = trace.span({
    name: 'performance_test'
  });
  
  try {
    // Test a simple query
    const startTime = Date.now();
    const result = await processMessage("Show all high priority tickets");
    const duration = Date.now() - startTime;

    span.end({
      status: 'success',
      output: {
        responseTime: duration,
        hasData: !!result.data
      }
    });
  } catch (error) {
    span.end({
      status: 'error',
      statusMessage: error.message
    });
    throw error;
  }
}

async function testEmbeddings(trace) {
  const span = trace.span({
    name: 'embedding_test'
  });
  
  try {
    const testQuery = "urgent tickets";
    const embedding = await generateEmbedding(testQuery);
    
    span.end({
      status: 'success',
      output: {
        embeddingGenerated: true,
        vectorLength: embedding.length
      }
    });
  } catch (error) {
    span.end({
      status: 'error',
      statusMessage: error.message
    });
    throw error;
  }
}

async function testComprehensive(trace) {
  await Promise.all([
    testPerformance(trace),
    testEmbeddings(trace)
  ]);
}

// Make tests available globally
if (typeof window !== 'undefined') {
  window.runTests = runTests
} 