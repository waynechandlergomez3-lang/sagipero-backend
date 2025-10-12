#!/usr/bin/env node
// Script to fix common TypeScript issues in controllers

const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');

// Get all controller files
const controllerFiles = fs.readdirSync(controllersDir)
  .filter(file => file.endsWith('.ts'))
  .map(file => path.join(controllersDir, file));

const fixes = [
  // Fix notification user relations
  {
    pattern: /user:\s*{\s*connect:\s*{\s*id:\s*([^}]+)\s*}\s*}/g,
    replacement: 'userId: $1'
  },
  // Fix emergency includes - user relation
  {
    pattern: /include:\s*{\s*user:\s*true/g,
    replacement: 'include: { User_Emergency_userIdToUser: true'
  },
  // Fix emergency includes - user and responder
  {
    pattern: /include:\s*{\s*user:\s*true,\s*responder:\s*true\s*}/g,
    replacement: 'include: { User_Emergency_userIdToUser: true, User_Emergency_responderIdToUser: true }'
  },
  // Fix property access to user
  {
    pattern: /\.user([^a-zA-Z_])/g,
    replacement: '.User_Emergency_userIdToUser$1'
  },
  // Fix location includes
  {
    pattern: /location:\s*{\s*select:/g,
    replacement: 'Location: { select:'
  },
  // Fix location property access
  {
    pattern: /\.location([^a-zA-Z_])/g,
    replacement: '.Location$1'
  },
  // Fix emergencies includes
  {
    pattern: /emergencies:\s*{/g,
    replacement: 'Emergency: {'
  },
  // Fix barangay property access (should work as is, but need to ensure)
];

controllerFiles.forEach(filePath => {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  fixes.forEach(fix => {
    const newContent = content.replace(fix.pattern, fix.replacement);
    if (newContent !== content) {
      content = newContent;
      changed = true;
    }
  });
  
  if (changed) {
    fs.writeFileSync(filePath, content);
    console.log(`  ✅ Fixed ${filePath}`);
  } else {
    console.log(`  ⚪ No changes needed in ${filePath}`);
  }
});

console.log('Controller fixes completed!');