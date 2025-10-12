// Smoke test: create users, create an emergency, prevent spam, assign responder, check history
// Run: node smoke.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const API = 'http://localhost:8080/api';

async function signup(user){
  const res = await fetch(`${API}/users/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
  const j = await res.json().catch(()=>({ error: 'invalid-json' }))
  // normalize: return { user, token, id }
  if (j && j.user) return { ...j, id: j.user.id }
  if (j && j.id) return j
  return j
}

async function login(email, pass){
  const res = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
  return res.json();
}

async function createEmergency(token){
  const res = await fetch(`${API}/emergencies`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ type: 'FLOOD', description: 'Smoke test', location: { lat: 14.8, lng: 120.78 } }) });
  return res.json();
}

async function assignResponder(adminToken, emergencyId, responderId){
  const res = await fetch(`${API}/emergencies/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }, body: JSON.stringify({ emergencyId, responderId }) });
  return res.json();
}

async function getHistory(adminToken, emergencyId){
  const res = await fetch(`${API}/emergencies/${emergencyId}/history`, { headers: { Authorization: `Bearer ${adminToken}` } });
  return res.json();
}

(async ()=>{
  console.log('Smoke test start')
  const SUFFIX = Date.now()
  // create resident
  const resident = { email: `smoke-resident-${SUFFIX}@example`, password: 'password', name: 'Smoke Resident' }
  const r1 = await signup(resident)
  const residentId = r1.id || (r1.user && r1.user.id)
  console.log('Resident signup:', residentId || r1.error)
  const rLogin = await login(resident.email, resident.password)
  const residentToken = rLogin.token
  if (!residentToken) { console.error('Resident login failed', rLogin); return }


  // create responder user
  const responder = { email: `smoke-responder-${SUFFIX}@example`, password: 'password', name: 'Smoke Responder', role: 'RESPONDER' }
  const r2 = await signup(responder)
  const responderId = r2.id || (r2.user && r2.user.id)
  console.log('Responder signup:', responderId || r2.error)
  const respLogin = await login(responder.email, responder.password)
  const responderToken = respLogin.token
  if (!responderToken) { console.error('Responder login failed', respLogin); return }

  // create admin user
  const admin = { email: `smoke-admin-${SUFFIX}@example`, password: 'password', name: 'Smoke Admin', role: 'ADMIN' }
  const r3 = await signup(admin)
  const adminId = r3.id || (r3.user && r3.user.id)
  console.log('Admin signup:', adminId || r3.error)
  const adminLogin = await login(admin.email, admin.password)
  const adminToken = adminLogin.token
  if (!adminToken) { console.error('Admin login failed', adminLogin); return }

  // Resident creates first emergency
  const e1 = await createEmergency(residentToken)
  const e1id = e1.id || (e1.emergency && e1.emergency.id)
  console.log('First emergency created:', e1id || e1.error)

  // Resident tries to spam (create another) - should be blocked
  const e2 = await createEmergency(residentToken)
  console.log('Attempt second emergency (should fail):', e2.error || JSON.stringify(e2))

  // Admin assigns responder to first emergency
  const assign = await assignResponder(adminToken, e1.id, r2.id)
  console.log('Assign response:', assign.error || assign.id)

  // Admin tries to assign same responder to another emergency (create a second emergency by different resident)
  // create another resident to own second emergency
  const resident2 = { email: `smoke-resident2-${SUFFIX}@example`, password: 'password', name: 'Smoke Resident 2' }
  const r4 = await signup(resident2)
  const resident2Id = r4.id || (r4.user && r4.user.id)
  console.log('Resident2 signup:', resident2Id || r4.error)
  const r2Login = await login(resident2.email, resident2.password)
  const resident2Token = r2Login.token
  const e3 = await createEmergency(resident2Token)
  console.log('Resident2 emergency:', e3.id || e3.error)

  // Try assign same responder to e3 (should fail because responder is ON_DUTY)
  const assign2 = await assignResponder(adminToken, e3.id, r2.id)
  console.log('Assign same responder to second emergency (should fail):', assign2.error || assign2.id)

  // Fetch history for first emergency
  const hist = await getHistory(adminToken, e1id)
  console.log('History for e1:', hist)

  console.log('Smoke test end')
})()
