(async ()=>{
  const cp = require('child_process');
  const fetch = (...args) => import('node-fetch').then(m=>m.default(...args));
  try{
    const out = cp.execSync('node scripts/get_admin_token.js', { encoding: 'utf8' });
    // find ADMIN_TOKEN= line
    const lines = out.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
    const tokenLine = lines.find(l=>l.startsWith('ADMIN_TOKEN='));
    if(!tokenLine){ console.error('No ADMIN_TOKEN found in script output', out); process.exit(1) }
    const token = tokenLine.replace('ADMIN_TOKEN=','').trim();
    console.log('Using admin token (first 8 chars):', token.slice(0,8)+'...');
    const res = await fetch('http://localhost:8080/api/emergencies/history/all', { headers: { Authorization: 'Bearer '+token } });
    console.log('Status:', res.status);
    const j = await res.json().catch(()=>null);
    console.log('Body:', JSON.stringify(j, null, 2));
  }catch(e){ console.error(e); process.exit(1) }
})();
