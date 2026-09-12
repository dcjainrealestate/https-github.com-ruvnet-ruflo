import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { computeTwoFactorSetupDeadline } from '../src/services/twoFactorService';
import { OPTION_BACKED_FIELD_KEYS } from '../src/constants/fieldKeys';

const prisma = new PrismaClient();

const DEFAULT_OPTIONS: Record<string, string[]> = {
  microMarket: ['New Gurgaon', 'SPR', 'Dwarka Expressway', 'Golf Course Road', 'Golf Course Ext. Road'],
  accommodation: ['2 BHK', '3 BHK', '4 BHK', '5 BHK', 'Penthouse'],
  facing: ['North', 'South', 'East', 'West'],
  furnishingStatus: ['Raw', 'Semi-Furnished', 'Fully Furnished'],
};

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? 'superadmin@ruflo.example.com';
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'ChangeMe123!ChangeMe';

  const passwordHash = await bcrypt.hash(superAdminPassword, 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: superAdminEmail },
    update: {},
    create: {
      name: 'Super Admin',
      email: superAdminEmail,
      passwordHash,
      role: 'SUPER_ADMIN',
      twoFactorSetupDeadline: computeTwoFactorSetupDeadline(),
    },
  });

  for (const fieldKey of OPTION_BACKED_FIELD_KEYS) {
    const values = DEFAULT_OPTIONS[fieldKey] ?? [];
    for (const value of values) {
      await prisma.fieldOption.upsert({
        where: { fieldKey_value: { fieldKey, value } },
        update: {},
        create: { fieldKey, value, createdById: superAdmin.id },
      });
    }
  }

  console.log(`Seeded super admin (${superAdminEmail}) and default field options.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
