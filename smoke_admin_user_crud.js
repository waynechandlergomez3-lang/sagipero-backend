// Smoke test: admin create and edit user
// Run: node smoke_admin_user_crud.js
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const API = 'http://localhost:8080/api';

async function signup(user){
  const res = await fetch(`${API}/users/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(user) });
  return res.json().catch(()=>({ error: 'invalid-json' }))
}

async function login(email, pass){
  const res = await fetch(`${API}/users/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pass }) });
  return res.json();
}

async function adminCreateUser(token, user){
  const res = await fetch(`${API}/users`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(user) });
  return res.json();
}

async function adminGetUser(token, id){
  const res = await fetch(`${API}/users/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
  return res.json();
}

async function adminUpdateUser(token, id, payload){
  const res = await fetch(`${API}/users/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify(payload) });
  return res.json();
}

(async ()=>{
  console.log('Admin user CRUD smoke start')
  const SUFFIX = Date.now()

  // create admin via public signup
  const adminCred = { email: `smoke-admin-${SUFFIX}@example`, password: 'password', name: 'Smoke Admin', role: 'ADMIN' }
  const adminSignup = await signup(adminCred)
  console.log('Admin signup:', adminSignup.error ? adminSignup.error : (adminSignup.user ? adminSignup.user.id : adminSignup.id))
  const adminLogin = await login(adminCred.email, adminCred.password)
  const adminToken = adminLogin.token
  if(!adminToken){ console.error('Admin login failed', adminLogin); process.exit(1) }

  // Admin creates a user
  const newUser = {
    name: 'Created By Admin',
    email: `created-by-admin-${SUFFIX}@example`,
    phone: '09171234567',
    address: '100 Test St',
    barangay: 'Test Barangay',
    role: 'RESIDENT',
    bloodType: 'O+',
    medicalConditions: ['diabetes'],
    allergies: ['peanuts'],
    emergencyContactName: 'John Doe',
    emergencyContactPhone: '09170001111'
  }

  const created = await adminCreateUser(adminToken, newUser)
  console.log('Admin create response:', created.error ? created.error : created.user?.id || created.id)
  const createdId = (created.user && created.user.id) || created.id || (created.userId)
  if(!createdId){ console.error('Failed to create user'); process.exit(1) }

  // Fetch the created user
  const fetched = await adminGetUser(adminToken, createdId)
  console.log('Fetched user:', fetched)

  // Update the user
  const updated = await adminUpdateUser(adminToken, createdId, { phone: '09998887777', address: '200 New Address', medicalConditions: ['diabetes','hypertension'] })
  console.log('Update response:', updated)

  // Fetch after update
  const fetched2 = await adminGetUser(adminToken, createdId)
  console.log('Fetched after update:', fetched2)

  console.log('Admin user CRUD smoke end')
})()
