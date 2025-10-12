// Simple test to diagnose body parsing issues
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testBodyParsing() {
  console.log('🧪 Testing Body Parsing on Railway...');
  
  const testData = {
    test: 'hello',
    number: 123,
    nested: { key: 'value' }
  };
  
  try {
    const response = await fetch('https://sagipero-backend-production.up.railway.app/health', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    console.log('Response:', result);
    console.log('Status:', response.status);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testBodyParsing();