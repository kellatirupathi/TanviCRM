import 'dotenv/config';
import { connectDB, disconnectDB } from './config/db.js';
import { runSeed } from './utils/seedRunner.js';

async function main() {
  await connectDB(process.env.MONGO_URI);
  console.log('🌱 Seeding TanviCRM…\n');

  const summary = await runSeed({
    adminEmail: process.env.SEED_ADMIN_EMAIL,
    adminPassword: process.env.SEED_ADMIN_PASSWORD,
    log: (m) => console.log('  ' + m),
  });

  console.log('\n✓ Seed complete:');
  console.log(`   Users      : ${summary.users}`);
  console.log(`   Customers  : ${summary.customers}`);
  console.log(`   Purchases  : ${summary.purchases}`);
  console.log(
    `   VIP cutoff : ₹${Number.isFinite(summary.vipThreshold) ? summary.vipThreshold.toLocaleString('en-IN') : '—'}`
  );
  console.log('\n   Admin login: ' + (process.env.SEED_ADMIN_EMAIL || 'admin@tanviboutique.in') + ' / ' + (process.env.SEED_ADMIN_PASSWORD || 'Admin@123'));
  console.log('   Staff login: staff@tanviboutique.in / Staff@123\n');

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  console.error('✗ Seed failed:', err);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
