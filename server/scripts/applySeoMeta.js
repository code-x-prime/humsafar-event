// One-time script: applies the exact meta title/description the SEO team
// supplied for the homepage, category pages, and location (city) pages.
// Matches existing rows by slug and updates ONLY metaTitle/metaDescription —
// nothing is created or deleted, and any row whose slug isn't found here is
// left completely untouched.
//
// Run from server/: node scripts/applySeoMeta.js
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  {
    slug: 'birthday',
    metaTitle: 'Birthday Decoration Across Delhi NCR, Jaipur, Chandigarh & More',
    metaDescription:
      'Make the cake-cutting corner the party highlight. Explore birthday decoration with themes, balloons and backdrops across Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'baby-shower',
    metaTitle: 'Baby Shower Decoration: Delhi NCR, Jaipur, Chandigarh & More',
    metaDescription:
      'Celebrate the parents-to-be with baby shower decoration. Choose elegant backdrops and thoughtful themed details across Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'welcome-baby',
    metaTitle: 'Welcome Baby Decoration Across Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Bring the baby home to warmth, colour and thoughtful details. Get welcome baby decoration in Delhi NCR, Jaipur, Chandigarh and other Indian cities.',
  },
  {
    slug: 'naming-ceremony',
    metaTitle: 'Naming Ceremony Decoration | Delhi NCR, Jaipur, Chandigarh & More',
    metaDescription:
      'Give the ritual a setting that feels personal. Discover naming ceremony decoration with stages and backdrops in Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'annaprashan',
    metaTitle: 'Annaprashan Decoration in Delhi NCR, Jaipur, Chandigarh & More',
    metaDescription:
      'Mark the first-rice ceremony with cultural details and a child-friendly backdrop. Find Annaprashan decoration in Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'mundan-ceremony',
    metaTitle: 'Mundan Ceremony Decoration: Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Create a setting for your child’s milestone with traditional accents and family-ready Mundan ceremony decoration in Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'anniversary-decoration',
    metaTitle: 'Anniversary Decoration Across Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Surprise your partner with anniversary decoration built around your story, from candlelit rooms to floral setups across Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'bachelorette-party',
    metaTitle: 'Bachelorette Party Decoration | Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Give the bride-to-be a night worth posting. Choose bachelorette party decoration with bold backdrops and photo zones in Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'first-night-just-married',
    metaTitle: 'First Night Room Decoration | Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Set the mood without an overdone room. Choose first night room decoration with flowers and warm lights across Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'canopy-decoration',
    metaTitle: 'Canopy Decoration Across Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Create an intimate date-night setting with canopy decoration featuring drapes, candles and warm lighting across Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'proposal-decoration',
    metaTitle: 'Proposal Decoration in Delhi NCR, Jaipur, Chandigarh & More',
    metaDescription:
      'Build the surprise around your story. Get proposal decoration with a backdrop, flowers and lighting across Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'wedding-decoration',
    metaTitle: 'Wedding Decoration Across Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Connect every detail from entrance to mandap. Explore wedding decoration with stages and venue décor across Delhi NCR, Jaipur, Chandigarh and more.',
  },
  {
    slug: 'corporate-event',
    metaTitle: 'Corporate Event Decoration | Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Give launches, annual meets and office events a polished identity with corporate event decoration, branded stages and venue styling across key Indian cities.',
  },
  {
    slug: 'festive-decor',
    metaTitle: 'Festive Decoration Services | Delhi NCR, Jaipur & Chandigarh',
    metaDescription:
      'Make offices, stores and homes celebration-ready with festive decoration services for Diwali, Christmas and more across Delhi NCR, Jaipur and Chandigarh.',
  },
];

const CITIES = [
  {
    slug: 'gurugram',
    metaTitle: 'Event Decoration Services in Gurugram | Humsafar Events',
    metaDescription:
      'Plan a memorable celebration with event decoration services in Gurugram for weddings, birthdays and corporate events. Explore custom themes and enquire today.',
  },
  {
    slug: 'delhi',
    metaTitle: 'Event Decoration Services in Delhi | Humsafar Events',
    metaDescription:
      'Transform your venue with event decoration services in Delhi for weddings, birthdays, corporate events and parties. Explore custom décor and enquire now.',
  },
  {
    slug: 'noida',
    metaTitle: 'Event Decoration Services in Noida | Humsafar Events',
    metaDescription:
      'Book creative event decoration services in Noida for weddings, birthdays, corporate events and special occasions. Get a customised décor plan from our team.',
  },
  {
    slug: 'faridabad',
    metaTitle: 'Event Decoration Services in Faridabad | Humsafar Events',
    metaDescription:
      'Discover event decoration services in Faridabad for weddings, birthdays, corporate functions and private parties. Get custom themes and book a consultation.',
  },
  {
    slug: 'ghaziabad',
    metaTitle: 'Event Decoration Services in Ghaziabad | Humsafar Events',
    metaDescription:
      'Make your celebration stand out with event decoration services in Ghaziabad for weddings, birthdays and corporate events. Enquire today.',
  },
  {
    slug: 'chandigarh',
    metaTitle: 'Event Decoration Services in Chandigarh | Humsafar Events',
    metaDescription:
      'Explore event decoration services in Chandigarh for weddings, birthdays and corporate events. Get customised themes and discuss your celebration today.',
  },
  {
    slug: 'mohali',
    metaTitle: 'Event Decoration Services in Mohali | Humsafar Events',
    metaDescription:
      'Choose event decoration services in Mohali for weddings, birthdays and corporate events. Get a customised theme and book your consultation today.',
  },
  {
    slug: 'panchkula',
    metaTitle: 'Event Decoration Services in Panchkula | Humsafar Events',
    metaDescription:
      'Plan a celebration with event decoration services in Panchkula for weddings, birthdays and corporate events. Explore custom décor and reserve your date today.',
  },
  {
    slug: 'jaipur',
    metaTitle: 'Event Decoration Services in Jaipur | Humsafar Events',
    metaDescription:
      'Create a striking venue with event decoration services in Jaipur for weddings, birthdays and destination celebrations. Explore custom themes and enquire today.',
  },
  {
    slug: 'udaipur',
    metaTitle: 'Event Decoration Services in Udaipur | Humsafar Events',
    metaDescription:
      'Discover event decoration services in Udaipur for weddings, birthdays and destination celebrations. Get elegant, customised décor and reserve your date today.',
  },
  {
    slug: 'jodhpur',
    metaTitle: 'Event Decoration Services in Jodhpur | Humsafar Events',
    metaDescription:
      'Book event decoration services in Jodhpur for weddings, birthdays, corporate events and destination celebrations. Explore customised themes and enquire today.',
  },
];

async function run() {
  let catUpdated = 0;
  let catSkipped = [];
  for (const c of CATEGORIES) {
    const result = await prisma.category.updateMany({
      where: { slug: c.slug },
      data: { metaTitle: c.metaTitle, metaDescription: c.metaDescription },
    });
    if (result.count === 0) catSkipped.push(c.slug);
    else catUpdated += result.count;
  }

  let cityUpdated = 0;
  let citySkipped = [];
  for (const c of CITIES) {
    const result = await prisma.city.updateMany({
      where: { slug: c.slug },
      data: { metaTitle: c.metaTitle, metaDescription: c.metaDescription },
    });
    if (result.count === 0) citySkipped.push(c.slug);
    else cityUpdated += result.count;
  }

  console.log(`Categories updated: ${catUpdated}/${CATEGORIES.length}`);
  if (catSkipped.length) console.log(`  Not found (no matching slug, skipped): ${catSkipped.join(', ')}`);

  console.log(`Cities updated: ${cityUpdated}/${CITIES.length}`);
  if (citySkipped.length) console.log(`  Not found (no matching slug, skipped): ${citySkipped.join(', ')}`);

  console.log('\nHomepage title/description were updated directly in client/src/app/layout.tsx (code change, redeploy to apply).');
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
