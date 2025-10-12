const fetch = require('node-fetch');
const { generateToken } = require('../src/utils/jwt');
(async ()=>{
  const userId = '029ce8e6-5831-480a-994e-db9905b7c75d';
  const token = generateToken(userId);
  console.log('Generated token for user', userId);
  try{
    const res = await fetch('http://localhost:8080/api/emergencies/latest', { headers: { Authorization: `Bearer ${token}` } });
    console.log('status', res.status);
    const body = await res.text();
    console.log('body', body);
  }catch(e){
    console.error(e);
  }
})();
