import jwt from 'jsonwebtoken';
import https from 'https';

const JWT_SECRET = '53ba49a327fcac45bd0025cb3833991faace8c50b652758cf7bd0df2f618dd09';

// Generate a test token for student user 22
const token = jwt.sign(
  { userId: 22, role: 'student', phone: '1234567890', iat: Math.floor(Date.now() / 1000) },
  JWT_SECRET,
  { expiresIn: '24h' }
);

console.log('Generated Token:', token);

// Test the dashboard endpoint
async function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

// Also test with http
import http from 'http';

async function testEndpointHttp(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function test() {
  console.log('\n--- Testing API Endpoints ---\n');
  
  try {
    const dashboardResult = await testEndpointHttp('/api/student/22/dashboard');
    console.log('Dashboard Endpoint:');
    console.log('Status:', dashboardResult.status);
    if (dashboardResult.status === 500) {
      console.log('ERROR: Still getting 500 error');
      console.log('Response:', dashboardResult.body);
    } else {
      console.log('✓ Dashboard endpoint working');
    }
  } catch (e) {
    console.error('Dashboard test error:', e.message);
  }

  try {
    const resultsResult = await testEndpointHttp('/api/student/22/results');
    console.log('\nResults Endpoint:');
    console.log('Status:', resultsResult.status);
    if (resultsResult.status === 500) {
      console.log('ERROR: Still getting 500 error');
      console.log('Response:', resultsResult.body);
    } else {
      console.log('✓ Results endpoint working');
    }
  } catch (e) {
    console.error('Results test error:', e.message);
  }
}

test().catch(console.error);
