import { Langfuse } from 'langfuse';
import { runTests } from './src/lib/test-runner.js';

// Initialize Langfuse with local credentials
const langfuse = new Langfuse({
    publicKey: "pk-local-test",    // Any string works for local testing
    secretKey: "sk-local-test",    // Any string works for local testing
    baseUrl: "http://localhost:3000"  // Points to your local Langfuse instance
});

async function runLocalTests() {
    try {
        // Run all test types
        await runTests('performance');
        await runTests('embedding');
        await runTests('comprehensive');
        
        console.log('All tests completed. Check results at http://localhost:3000');
    } catch (error) {
        console.error('Error running tests:', error);
    }
}

runLocalTests(); 