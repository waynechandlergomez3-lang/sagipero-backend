require('dotenv').config();
const { PrismaClient } = require('../src/generated/prisma');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';
const API = process.env.API || 'http://localhost:8080/api';

const log = (...args) => console.log('[SMOKE]', ...args);

async function genTokenForUser(u) {
  return jwt.sign({ userId: u.id }, JWT_SECRET, { expiresIn: '7d' });
}

async function ensureUser(email, role, name) {
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    user = await prisma.user.create({ data: { email, password: 'changeme', name, role } });
    log('Created', role, 'user', user.id);
  } else {
    log('Found', role, 'user', user.id, 'status', user.responderStatus);
  }
  return user;
}

async function apiFetch(path, token, opts = {}) {
  const url = API + path;
  const headers = Object.assign({ 'Content-Type': 'application/json', Authorization: token ? 'Bearer ' + token : undefined }, opts.headers || {});
  const res = await fetch(url, Object.assign({ headers }, opts));
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch(e) {}
  return { status: res.status, body };
}

(async ()=>{
  try {
    log('Ensuring admin and two responders (available, vehicle_unavailable)');
    const admin = await ensureUser(process.env.SMOKE_ADMIN_EMAIL || 'smoke-admin@example', 'ADMIN', 'Smoke Admin');
    const respAvailable = await ensureUser(process.env.SMOKE_RESP1_EMAIL || 'smoke-resp-available@example', 'RESPONDER', 'Smoke Responder Available');
    const respUnavailable = await ensureUser(process.env.SMOKE_RESP2_EMAIL || 'smoke-resp-unavail@example', 'RESPONDER', 'Smoke Responder Unavail');

    const adminToken = await genTokenForUser(admin);
    const tokenAvailable = await genTokenForUser(respAvailable);
    const tokenUnavailable = await genTokenForUser(respUnavailable);

  log('Tokens ready. Admin:', admin.id, 'RespA:', respAvailable.id, 'RespU:', respUnavailable.id);

  // create a fresh resident user to own the emergency to avoid conflicts with previous runs
  const resident = await ensureUser(process.env.SMOKE_RESIDENT_EMAIL || `smoke-resident-${Date.now()}@example`, 'RESIDENT', 'Smoke Resident');
  const residentToken = await genTokenForUser(resident);

  // Set statuses
  log('Setting responder statuses...');
  const s1 = await apiFetch('/users/status', tokenAvailable, { method: 'POST', body: JSON.stringify({ status: 'AVAILABLE' }) });
  log('Set AVAILABLE response:', s1.status, JSON.stringify(s1.body));
  const s2 = await apiFetch('/users/status', tokenUnavailable, { method: 'POST', body: JSON.stringify({ status: 'VEHICLE_UNAVAILABLE' }) });
  log('Set VEHICLE_UNAVAILABLE response:', s2.status, JSON.stringify(s2.body));
  log('Statuses set');

  // Debug: list responder statuses as seen by admin
  log('Listing responders (admin view)');
  const listRes = await apiFetch('/users?role=RESPONDER', adminToken, { method: 'GET' });
  log('Responders list status', listRes.status, JSON.stringify(listRes.body, null, 2));

    // Create emergency as admin
  log('Creating emergency as resident...');
  const createRes = await apiFetch('/emergencies', residentToken, { method: 'POST', body: JSON.stringify({ type: 'MEDICAL', description: 'Smoke test emergency', location: { lat: 14.6, lng: 121.0 }, priority: 3 }) });
    log('Create emergency response:', createRes.status);
    if (createRes.status !== 201) { console.error('Failed to create emergency', createRes); process.exit(1); }
    const emergency = createRes.body;
    log('Emergency created id=', emergency.id);

    // Attempt assign to VEHICLE_UNAVAILABLE responder (expect 400)
    log('Attempting assign to VEHICLE_UNAVAILABLE responder (expect failure)');
    const assign1 = await apiFetch('/emergencies/assign', adminToken, { method: 'POST', body: JSON.stringify({ emergencyId: emergency.id, responderId: respUnavailable.id }) });
    log('Assign to unavail status:', assign1.status, JSON.stringify(assign1.body));

    // Attempt assign to AVAILABLE responder (expect success)
    log('Attempting assign to AVAILABLE responder (expect success)');
    const assign2 = await apiFetch('/emergencies/assign', adminToken, { method: 'POST', body: JSON.stringify({ emergencyId: emergency.id, responderId: respAvailable.id }) });
    log('Assign to available status:', assign2.status, JSON.stringify(assign2.body));
    if (assign2.status !== 200) { console.error('Assign failed unexpectedly', assign2); process.exit(1); }
    const assignedEmergency = assign2.body;

    // As the assigned responder, accept the assignment
    log('Responder accepting assignment...');
    const acceptRes = await apiFetch('/emergencies/accept', tokenAvailable, { method: 'POST', body: JSON.stringify({ emergencyId: assignedEmergency.id }) });
    log('Accept response:', acceptRes.status, JSON.stringify(acceptRes.body));

    // Fetch history
    log('Fetching emergency history (admin)...');
    const hist = await apiFetch(`/emergencies/${emergency.id}/history`, adminToken, { method: 'GET' });
    log('History status', hist.status, JSON.stringify(hist.body, null, 2));

    log('Smoke test complete');
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.error('Smoke run failed', e);
    try { await prisma.$disconnect(); } catch(_){}
    process.exit(1);
  }
})();
