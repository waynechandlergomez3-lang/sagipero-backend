const fetch = require('node-fetch');
const { URL } = require('url');

const API = process.env.API || 'http://localhost:8080/api';
// configure tokens from env for admin and responder
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const RESPONDER_TOKEN = process.env.RESPONDER_TOKEN || '';

if (!ADMIN_TOKEN || !RESPONDER_TOKEN) {
  console.error('Set ADMIN_TOKEN and RESPONDER_TOKEN in env to run this smoke');
  process.exit(1);
}

async function createEmergency() {
  const res = await fetch(`${API}/emergencies`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ADMIN_TOKEN }, body: JSON.stringify({ type: 'MEDICAL', description: 'Smoke test', location: { lat: 14.6, lng: 121.0 }, priority: 3 }) });
  return res.json();
}

async function setResponderStatus(responderId, status, token) {
  const res = await fetch(`${API}/users/status`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ status }) });
  return res.json();
}

async function assign(emergencyId, responderId) {
  const res = await fetch(`${API}/emergencies/assign`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + ADMIN_TOKEN }, body: JSON.stringify({ emergencyId, responderId }) });
  const text = await res.text();
  return { status: res.status, body: text };
}

async function accept(emergencyId, token) {
  const res = await fetch(`${API}/emergencies/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ emergencyId }) });
  const text = await res.text();
  return { status: res.status, body: text };
}

(async ()=>{
  try {
    console.log('Creating emergency...');
    const e = await createEmergency();
    console.log('Emergency created:', e.id);

    // get a list of responders
    const rres = await fetch(`${API}/users?role=RESPONDER`, { headers: { Authorization: 'Bearer ' + ADMIN_TOKEN } });
    const responders = await rres.json();
    if (!Array.isArray(responders) || responders.length === 0) { console.error('No responders'); process.exit(1); }
    const candidate = responders[0];
    console.log('Using responder:', candidate.id, candidate.name, 'status=', candidate.responderStatus);

    console.log('Setting responder to VEHICLE_UNAVAILABLE...');
    await setResponderStatus(candidate.id, 'VEHICLE_UNAVAILABLE', RESPONDER_TOKEN);
    console.log('Attempting assign (expect failure)...');
    const assignRes1 = await assign(e.id, candidate.id);
    console.log('Assign response:', assignRes1.status, assignRes1.body);

    console.log('Setting responder to AVAILABLE...');
    await setResponderStatus(candidate.id, 'AVAILABLE', RESPONDER_TOKEN);
    console.log('Attempting assign (expect success)...');
    const assignRes2 = await assign(e.id, candidate.id);
    console.log('Assign response:', assignRes2.status, assignRes2.body);

    if (assignRes2.status === 200) {
      console.log('Calling accept as responder...');
      const parsed = JSON.parse(assignRes2.body);
      const acceptRes = await accept(parsed.id, RESPONDER_TOKEN);
      console.log('Accept response:', acceptRes.status, acceptRes.body);
    }
  } catch (e) { console.error('Smoke script failed', e); process.exit(1); }
})();