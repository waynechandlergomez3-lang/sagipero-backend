const { PrismaClient } = require('@prisma/client');

async function checkUserFields() {
  const prisma = new PrismaClient();
  try {
    console.log('🔍 CHECKING ALL USER FIELDS');
    console.log('===========================');
    
    // Get the new user with ALL fields that the login controller expects
    console.log('\n1️⃣ New user complete data:');
    const newUser = await prisma.$queryRaw`
      SELECT 
        id, email, password, name, role, phone, address, barangay,
        "specialCircumstances", "medicalConditions", allergies, "bloodType",
        "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
        "createdAt", "updatedAt"
      FROM "User" 
      WHERE email = 'sampleuser@email.com'
    `;
    
    if (newUser.length > 0) {
      console.log('New user fields:');
      Object.entries(newUser[0]).forEach(([key, value]) => {
        if (key === 'password') {
          console.log(`  ${key}: [HIDDEN]`);
        } else {
          console.log(`  ${key}: ${value === null ? 'NULL' : JSON.stringify(value)}`);
        }
      });
    }
    
    // Get existing user for comparison
    console.log('\n2️⃣ Existing user complete data:');
    const existingUser = await prisma.$queryRaw`
      SELECT 
        id, email, password, name, role, phone, address, barangay,
        "specialCircumstances", "medicalConditions", allergies, "bloodType",
        "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation",
        "createdAt", "updatedAt"
      FROM "User" 
      WHERE email = 'admin@sagipero.local'
    `;
    
    if (existingUser.length > 0) {
      console.log('Existing user fields:');
      Object.entries(existingUser[0]).forEach(([key, value]) => {
        if (key === 'password') {
          console.log(`  ${key}: [HIDDEN]`);
        } else {
          console.log(`  ${key}: ${value === null ? 'NULL' : JSON.stringify(value)}`);
        }
      });
    }
    
    // Compare field differences
    if (newUser.length > 0 && existingUser.length > 0) {
      console.log('\n3️⃣ Field comparison:');
      const newUserFields = newUser[0];
      const existingUserFields = existingUser[0];
      
      Object.keys(newUserFields).forEach(key => {
        if (key !== 'password' && key !== 'id' && key !== 'email' && key !== 'createdAt') {
          const newValue = newUserFields[key];
          const existingValue = existingUserFields[key];
          
          if (JSON.stringify(newValue) !== JSON.stringify(existingValue)) {
            console.log(`  ${key}:`);
            console.log(`    New user:      ${newValue === null ? 'NULL' : JSON.stringify(newValue)}`);
            console.log(`    Existing user: ${existingValue === null ? 'NULL' : JSON.stringify(existingValue)}`);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking user fields:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserFields();