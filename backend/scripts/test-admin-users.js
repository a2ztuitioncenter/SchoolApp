import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const loginUrl = 'http://localhost:3000/api/auth/admin-login';
  const usersUrl = 'http://localhost:3000/api/admin/users';

  console.log('1. Attempting admin login...');
  const loginRes = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'admin',
      password: 'muslim'
    })
  });

  if (!loginRes.ok) {
    console.error('Login failed:', await loginRes.text());
    return;
  }

  const loginData = await loginRes.json();
  console.log('Login success! User:', loginData.user);
  console.log('Token:', loginData.token);

  // Set CSRF and token headers/cookies
  const cookieHeader = loginRes.headers.get('set-cookie');
  console.log('Set-Cookie headers from login:', cookieHeader);

  console.log('2. Requesting GET /api/admin/users...');
  const usersRes = await fetch(usersUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${loginData.token}`,
      'Cookie': cookieHeader || ''
    }
  });

  if (!usersRes.ok) {
    console.error('Fetch users failed:', await usersRes.text());
    return;
  }

  const usersData = await usersRes.json();
  console.log('Fetch users response success:', usersData.success);
  console.log('Returned users count:', usersData.data?.length);
  console.log('Users:', JSON.stringify(usersData.data, null, 2));
}

run().catch(console.error);
