const http = require('http');
http.get('http://localhost:3000/api/admin/notifications', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Body:', data);
  });
}).on('error', err => console.error(err));
