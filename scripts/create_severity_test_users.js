const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

async function createUsers() {
  const prisma = new PrismaClient();
  try {
    const users = [
      {
        email: 'severe_pregnant@example.com',
        name: 'SEVERE_PREGNANT',
        specialCircumstances: ['PREGNANT'],
        medicalConditions: [],
      },
      {
        email: 'severe_medical@example.com',
        name: 'SEVERE_MEDICAL',
        specialCircumstances: ['NONE'],
        medicalConditions: ['heart_condition'],
      },
      {
        email: 'normal_user@example.com',
        name: 'NORMAL_USER',
        specialCircumstances: ['NONE'],
        medicalConditions: [],
      }
      ,
      {
        email: 'elderly_user@example.com',
        name: 'ELDERLY_USER',
        specialCircumstances: ['ELDERLY'],
        medicalConditions: [],
      }
    ];

    const password = 'password123';
    const hashed = await bcrypt.hash(password, 10);

    for (const u of users) {
      try {
        const created = await prisma.user.create({
          data: {
            id: uuidv4(),
            email: u.email,
            password: hashed,
            name: u.name,
            role: 'RESIDENT',
            specialCircumstances: u.specialCircumstances,
            medicalConditions: u.medicalConditions,
            updatedAt: new Date(),
            createdAt: new Date()
          }
        });
        console.log('✅ Created user', created.email, 'name=', created.name);
      } catch (err) {
        if (err && err.code === 'P2002') {
          console.log('⚠️ User already exists:', u.email);
        } else {
          console.error('❌ Failed creating user', u.email, err);
        }
      }
    }
  } catch (e) {
    console.error('Unexpected error', e);
  } finally {
    try { await prisma.$disconnect(); } catch(e){}
  }
}

createUsers();
