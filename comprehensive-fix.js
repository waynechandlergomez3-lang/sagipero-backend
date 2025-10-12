#!/usr/bin/env node
// Comprehensive fix script for TypeScript errors

const fs = require('fs');
const path = require('path');

function fixEmergencyController() {
  const filePath = path.join(__dirname, 'src', 'controllers', 'emergencyController.ts');
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix notification creates - replace user: { connect: { id: X } } with userId: X
  content = content.replace(/user:\s*{\s*connect:\s*{\s*id:\s*([^}]+)\s*}\s*}/g, 'userId: $1');
  
  // Fix emergency includes - replace user: true with User_Emergency_userIdToUser: true
  content = content.replace(/user:\s*true/g, 'User_Emergency_userIdToUser: true');
  
  // Fix emergency includes - replace responder: true with User_Emergency_responderIdToUser: true
  content = content.replace(/responder:\s*true/g, 'User_Emergency_responderIdToUser: true');
  
  // Fix property access - replace .user with .User_Emergency_userIdToUser
  content = content.replace(/\.user([^a-zA-Z_])/g, '.User_Emergency_userIdToUser$1');
  
  // Fix property access - replace .responder with .User_Emergency_responderIdToUser  
  content = content.replace(/\.responder([^a-zA-Z_])/g, '.User_Emergency_responderIdToUser$1');
  
  fs.writeFileSync(filePath, content);
  console.log('✅ Fixed emergencyController.ts');
}

function fixOtherControllers() {
  const files = [
    'notificationController.ts',
    'userController.ts', 
    'weatherAlertController.ts',
    'medicalProfileController.ts',
    'locationController.ts',
    'evacuationCenterController.ts'
  ];
  
  files.forEach(fileName => {
    const filePath = path.join(__dirname, 'src', 'controllers', fileName);
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    
    // Fix notification user relations
    const newContent1 = content.replace(/user:\s*{\s*connect:\s*{\s*id:\s*([^}]+)\s*}\s*}/g, 'userId: $1');
    if (newContent1 !== content) {
      content = newContent1;
      changed = true;
    }
    
    // Fix location relations (capitalize Location)
    const newContent2 = content.replace(/location:\s*{/g, 'Location: {');
    if (newContent2 !== content) {
      content = newContent2;
      changed = true;
    }
    
    // Fix emergencies relations
    const newContent3 = content.replace(/emergencies:\s*{/g, 'Emergency: {');
    if (newContent3 !== content) {
      content = newContent3;
      changed = true;
    }
    
    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed ${fileName}`);
    } else {
      console.log(`⚪ No changes needed in ${fileName}`);
    }
  });
}

console.log('🔧 Starting comprehensive fixes...');
fixEmergencyController();
fixOtherControllers();
console.log('✅ All fixes completed!');