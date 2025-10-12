import { PrismaClient, UserRole, SpecialCircumstance } from '../generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testMedicalProfiles() {
  try {
    // Create a test user with medical profile
    const hashedPassword = await bcrypt.hash('testpass123', 10);
    const user = await prisma.user.create({
      data: {
        email: `testuser_${Date.now()}@sagipero.local`,
        password: hashedPassword,
        name: 'Test User',
        phone: '+1234567890',
        role: UserRole.ADMIN,
        specialCircumstances: [SpecialCircumstance.PWD, SpecialCircumstance.ELDERLY],
        medicalConditions: ['Hypertension', 'Diabetes Type 2'],
        allergies: ['Penicillin', 'Latex'],
        bloodType: 'A+',
        emergencyContactName: 'John Doe',
        emergencyContactPhone: '+9876543210',
        emergencyContactRelation: 'Sibling',
        address: 'Test Address'
      }
    });
    console.log('Created test user:', user);
    // Test fetching medical conditions
    const conditions = await prisma.commonMedicalCondition.findMany();
    console.log('Medical Conditions:', conditions);

    // Test fetching allergies
    const allergies = await prisma.commonAllergy.findMany();
    console.log('Allergies:', allergies);

    // Test user with medical profile
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        specialCircumstances: true,
        medicalConditions: true,
        allergies: true,
        bloodType: true,
        emergencyContactName: true
      }
    });
    console.log('Users with medical profiles:', users);

  } catch (error) {
    console.error('Error testing medical profiles:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testMedicalProfiles();
