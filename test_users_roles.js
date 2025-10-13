const axios = require('axios');

const API_BASE = 'https://sagipero-backend-production.up.railway.app';

// Test credentials (you can modify these)
const TEST_CREDENTIALS = {
    email: 'admin@sagipero.local',
    password: 'adminpassword'
};

async function loginAndGetUsers() {
    try {
        console.log('🔐 Attempting to login...');
        
        // Step 1: Login to get token
        const loginResponse = await axios.post(`${API_BASE}/api/users/login`, TEST_CREDENTIALS, {
            timeout: 15000,
            headers: { 'Content-Type': 'application/json' }
        });
        
        const { token } = loginResponse.data;
        console.log('✅ Login successful!');
        
        // Step 2: Get all users
        console.log('👥 Fetching users...');
        const usersResponse = await axios.get(`${API_BASE}/api/users`, {
            timeout: 15000,
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const users = usersResponse.data;
        
        // Step 3: Display users with their roles
        console.log('\n📋 USERS AND THEIR ROLES:');
        console.log('═'.repeat(60));
        
        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.name || 'No Name'}`);
            console.log(`   📧 Email: ${user.email}`);
            console.log(`   🎭 Role: ${user.role}`);
            console.log(`   📱 Phone: ${user.phone || 'Not provided'}`);
            console.log(`   🏠 Address: ${user.address || 'Not provided'}`);
            console.log(`   🏘️  Barangay: ${user.barangay || 'Not assigned'}`);
            
            if (user.role === 'RESPONDER') {
                console.log(`   🚑 Responder Status: ${user.responderStatus || 'Not set'}`);
            }
            
            console.log(`   📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`);
            console.log('─'.repeat(40));
        });
        
        console.log(`\n📊 SUMMARY:`);
        console.log(`Total Users: ${users.length}`);
        
        // Count by role
        const roleCounts = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});
        
        Object.entries(roleCounts).forEach(([role, count]) => {
            console.log(`${role}: ${count} users`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.response?.data?.error || error.message);
        
        if (error.response?.status === 500) {
            console.log('\n🔧 This might be a database connection issue.');
            console.log('The Railway deployment may need to restart to pick up the new DATABASE_URL.');
        }
    }
}

// Run the function
loginAndGetUsers();