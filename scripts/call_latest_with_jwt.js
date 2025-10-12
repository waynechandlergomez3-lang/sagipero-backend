const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const env = fs.existsSync('.env') ? fs.readFileSync('.env','utf8') : '';
let secret = 'your-super-secret-jwt-key-2025';
const m = env.match(/JWT_SECRET=(?:"|')?(.*?)(?:"|')?$/m);
if (m) secret = m[1];
(async ()=>{
  const token = jwt.sign({ userId: '029ce8e6-5831-480a-994e-db9905b7c75d' }, secret, { expiresIn: '7d' });
  console.log('Using token:', token);
  try{
    const res = await fetch('http://localhost:8080/api/emergencies/latest', { headers: { Authorization: `Bearer ${token}` } });
    console.log('status', res.status);
    console.log('body', await res.text());
  }catch(e){ console.error(e); }
})();
