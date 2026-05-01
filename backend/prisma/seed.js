import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

const channels = [
  {
    number: 1,
    name: 'Comedy Central',
    slug: 'comedy',
    themeColor: '#fbbf24',
    icon: '😂',
  },
  {
    number: 2,
    name: 'Crime Files',
    slug: 'crime',
    themeColor: '#dc2626',
    icon: '🔍',
  },
  {
    number: 3,
    name: 'News Now',
    slug: 'news',
    themeColor: '#2563eb',
    icon: '📰',
  },
  {
    number: 4,
    name: 'Music TV',
    slug: 'music',
    themeColor: '#9333ea',
    icon: '🎵',
  },
  {
    number: 5,
    name: 'Sports & More',
    slug: 'sports',
    themeColor: '#059669',
    icon: '⚽',
  },
];

async function main() {
  console.log('🌱 Seeding channels...');

  for (const channel of channels) {
    const result = await prisma.channel.upsert({
      where: { number: channel.number },
      update: channel,
      create: channel,
    });
    console.log(`   ✓ Channel ${result.number}: ${result.name}`);
  }

  const total = await prisma.channel.count();
  console.log(`\n✓ Done. ${total} channels in database.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });