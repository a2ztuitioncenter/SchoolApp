import http from 'http';

const data = JSON.stringify({
  name: 'Test User ',
  phone: '1111111111',
  email: 'test@example.com',
  role: 'teacher',
  password: 'TestPass123'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/admin/users/create',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(data);
req.end();
