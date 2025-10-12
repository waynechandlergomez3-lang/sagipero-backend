#!/usr/bin/env node
// Generate a secure JWT secret for production use

const crypto = require('crypto');

const secret = crypto.randomBytes(32).toString('hex');
console.log('Generated JWT Secret:');
console.log(secret);
console.log('\nAdd this to your production environment variables:');
console.log(`JWT_SECRET="${secret}"`);
console.log('\nNever commit this secret to version control!');