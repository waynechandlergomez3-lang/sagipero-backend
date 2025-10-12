// Smoke test: create resident, responder, admin; create emergency; admin assigns responder; responder marks arrive; verify history
// Run: node smoke_arrive.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const API = 'http://localhost:8080/api';

async function signup(user){
  const res = await fetch(`${API}/users/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
  const j = await res.json().catch(()=>({ error: 'invalid-json' }));
  if (j && j.user) return { ...j, id: j.user.id };
  if (j && j.id) return j;
  return j;
}

async function login(email, pass){
  const res = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
  return res.json();
}

async function createEmergency(token){
  const res = await fetch(`${API}/emergencies`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ type: 'MEDICAL', description: 'Smoke arrive test', location: { lat: 14.8, lng: 120.78 } }) });
  return res.json();
}

async function assignResponder(adminToken, emergencyId, responderId){
  const res = await fetch(`${API}/emergencies/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` }, body: JSON.stringify({ emergencyId, responderId }) });
  return res.json();
}

async function responderArrive(responderToken, emergencyId){
  const res = await fetch(`${API}/emergencies/arrive`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${responderToken}` }, body: JSON.stringify({ emergencyId }) });
  return res.json();
}

async function getHistory(token, emergencyId){
  const res = await fetch(`${API}/emergencies/${emergencyId}/history`, { headers: { Authorization: `Bearer ${token}` } });
  return res.json();
}

(async ()=>{
  console.log('Smoke ARRIVE test start');
  const SUFFIX = Date.now();

  const resident = { email: `smoke-resident-${SUFFIX}@example`, password: 'password', name: 'Smoke Resident' };
  const r1 = await signup(resident);
  const residentId = r1.id || (r1.user && r1.user.id);
  console.log('Resident signup:', residentId || r1.error);
  const rLogin = await login(resident.email, resident.password);
  const residentToken = rLogin.token;
  if (!residentToken) { console.error('Resident login failed', rLogin); return }

  const responder = { email: `smoke-responder-${SUFFIX}@example`, password: 'password', name: 'Smoke Responder', role: 'RESPONDER' };
  const r2 = await signup(responder);
  const responderId = r2.id || (r2.user && r2.user.id);
  console.log('Responder signup:', responderId || r2.error);
  const respLogin = await login(responder.email, responder.password);
  const responderToken = respLogin.token;
  if (!responderToken) { console.error('Responder login failed', respLogin); return }

  const admin = { email: `smoke-admin-${SUFFIX}@example`, password: 'password', name: 'Smoke Admin', role: 'ADMIN' };
  const r3 = await signup(admin);
  const adminId = r3.id || (r3.user && r3.user.id);
  console.log('Admin signup:', adminId || r3.error);
  const adminLogin = await login(admin.email, admin.password);
  const adminToken = adminLogin.token;
  if (!adminToken) { console.error('Admin login failed', adminLogin); return }

  const e1 = await createEmergency(residentToken);
  const e1id = e1.id || (e1.emergency && e1.emergency.id);
  console.log('Emergency created:', e1id || e1.error);
  if (!e1id) return;

  // assign
  const assign = await assignResponder(adminToken, e1id, responderId);
  console.log('Assign response:', assign.error || (assign.id || assign));

  // responder marks arrived
  const arrived = await responderArrive(responderToken, e1id);
  console.log('Responder arrive response:', arrived);

  // fetch history as resident (owner) and admin
  const histResident = await getHistory(residentToken, e1id);
  console.log('History (resident view):', histResident);
  const histAdmin = await getHistory(adminToken, e1id);
  console.log('History (admin view):', histAdmin);

  console.log('Smoke ARRIVE test end');
})();
