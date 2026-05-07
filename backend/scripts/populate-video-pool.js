import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';
import { populateAllChannels } from '../src/jobs/populatePool.js';

async function main() {
  console.log('🎬 ReLiveTV — populating video pool from YouTube');
  const results = await populateAllChannels();
  console.log('\n📊 Final stats:', results);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error('❌ Populate failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });