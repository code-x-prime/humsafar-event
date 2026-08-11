import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';

const adapter = new PrismaPg(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter });

const CITIES = [
  { name: 'Delhi', region: 'Delhi NCR', pincodes: ['110001', '110002', '110003'] },
  { name: 'Gurugram', region: 'Delhi NCR', pincodes: ['122001', '122002', '122003'] },
  { name: 'Noida', region: 'Delhi NCR', pincodes: ['201301', '201304', '201305'] },
  { name: 'Greater Noida', region: 'Delhi NCR', pincodes: ['201306', '201310'] },
  { name: 'Ghaziabad', region: 'Delhi NCR', pincodes: ['201001', '201002'] },
  { name: 'Faridabad', region: 'Delhi NCR', pincodes: ['121001', '121002'] },
  { name: 'Chandigarh', region: 'Chandigarh', pincodes: ['160001', '160002'] },
  { name: 'Jaipur', region: 'Rajasthan', pincodes: ['302001', '302002'] },
];

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// Top-level categories shown in the homepage "Shop by Category" grid, with a
// lucide-react icon name (see CategoryGrid.tsx's ICONS map) each.
const HOME_CATEGORY_ICONS = {
  Birthday: 'PartyPopper',
  'Baby Shower': 'Baby',
  'Welcome Baby': 'Heart',
  'Naming Ceremony': 'BookOpenText',
  'Anniversary Decoration': 'HeartHandshake',
  'Bachelorette Party': 'Wine',
  'Proposal Decoration': 'Gem',
  'Wedding Decoration': 'Sparkles',
  'Corporate Event': 'Briefcase',
};

// Full category tree per the master spec §4. Each node: { name, children? }.
const CATEGORY_TREE = [
  {
    name: 'Birthday',
    children: [
      { name: 'Adult Birthday' },
      { name: 'Kids Birthday' },
      {
        name: 'Kids Theme',
        children: [
          'All Kids Special',
          'Boss Baby Theme',
          'Butterfly Theme',
          'Disney Cars Theme',
          'Cocomelon Theme',
          'Disney Princess Theme',
          'Frozen Theme',
          'Jungle Theme',
          'Mermaid Theme',
          'Mickey Minnie Theme',
          'Peppa Pig Theme',
          'Space Theme',
          'Sports Theme',
          'Superhero Theme',
          'Unicorn Theme',
        ].map((name) => ({ name })),
      },
      { name: '1st Birthday Decoration' },
      { name: 'Car Boot Decoration' },
    ],
  },
  { name: 'Baby Shower' },
  { name: 'Welcome Baby' },
  { name: 'Naming Ceremony' },
  { name: 'Annaprashan' },
  { name: 'Mundan Ceremony' },
  { name: 'Anniversary Decoration' },
  { name: 'Bachelorette Party' },
  { name: 'First Night / Just Married' },
  { name: 'Canopy Decoration' },
  { name: 'Proposal Decoration' },
  {
    name: 'Wedding Decoration',
    children: [
      { name: 'Haldi / Mehndi Decoration' },
      { name: 'Wedding Car Decoration' },
      { name: 'Bride Welcome' },
    ],
  },
  { name: 'Corporate Event' },
  {
    name: 'Festive Decor',
    children: [
      'Lohri',
      'Republic Day',
      "Valentine's Day",
      "Women's Day",
      'Holi',
      "Mother's Day",
      "Father's Day",
      'Guruji Birthday',
      'Independence Day',
      'Janmashtami',
      'Ganesh Chaturthi',
      'Navratri',
      'Karva Chauth',
      'Halloween',
      'Diwali',
      'Christmas',
      'New Year',
    ].map((name) => ({ name })),
  },
];

// Demo products reference real leaf categories from the tree above so
// ProductCategory links stay valid — a small, real sample, not one product
// per category (that would be dozens of fabricated rows nobody asked for).
const PRODUCTS = [
  {
    title: 'Balloon Arch Birthday Special',
    category: 'Adult Birthday',
    price: 2499,
    shortDescription: 'Colorful balloon arch with happy birthday backdrop.',
    isFeatured: true,
  },
  {
    title: 'Romantic Rose Anniversary Setup',
    category: 'Anniversary Decoration',
    price: 3999,
    shortDescription: 'Red and white rose decoration with fairy lights.',
    isFeatured: true,
  },
  {
    title: 'Pastel Baby Shower Theme',
    category: 'Baby Shower',
    price: 3499,
    shortDescription: 'Soft pastel balloon and floral baby shower setup.',
  },
  {
    title: 'Haldi Ceremony Marigold Decor',
    category: 'Haldi / Mehndi Decoration',
    price: 5999,
    shortDescription: 'Traditional marigold and umbrella haldi decoration.',
  },
  {
    title: 'Mehndi Floral Swing Setup',
    category: 'Haldi / Mehndi Decoration',
    price: 6499,
    shortDescription: 'Floral swing with hanging marigold strings for mehndi functions.',
  },
  {
    title: 'Office Anniversary Celebration Package',
    category: 'Corporate Event',
    price: 7999,
    shortDescription: 'Branded backdrop and balloon setup for office celebrations.',
  },
  {
    title: 'Kids Jungle Theme Birthday',
    category: 'Jungle Theme',
    price: 4499,
    shortDescription: 'Jungle safari themed birthday decoration for kids.',
  },
];

async function seedAdmin() {
  const email = 'admin@humsafarevent.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin user already exists, skipping.');
    return;
  }

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);
  await prisma.user.create({
    data: { name: 'Humsafar Admin', email, passwordHash, role: 'ADMIN' },
  });
  console.log('Seeded admin user:', email, '(password: ChangeMe123! — change after first login)');
}

async function seedCities() {
  for (const [index, city] of CITIES.entries()) {
    const slug = slugify(city.name);

    const cityRow = await prisma.city.upsert({
      where: { slug },
      update: {},
      create: {
        name: city.name,
        slug,
        region: city.region,
        state: city.region === 'Delhi NCR' ? 'Delhi/NCR' : city.region,
        isServiceable: true,
        comingSoon: false,
        position: index,
      },
    });

    for (const code of city.pincodes) {
      await prisma.pincode.upsert({
        where: { code_cityId: { code, cityId: cityRow.id } },
        update: {},
        create: { code, cityId: cityRow.id, isServiceable: true },
      });
    }

    console.log(`Seeded city: ${city.name} (${city.pincodes.length} pincodes)`);
  }
}

// Recursively upserts a category tree, tracking every node (at any depth) by
// name in `categoryByName` so the flat PRODUCTS list can reference leaf
// categories regardless of nesting level.
async function seedCategoryTree(nodes, parentId, categoryByName) {
  for (const [index, node] of nodes.entries()) {
    const slug = slugify(node.name);
    const homeIcon = !parentId ? HOME_CATEGORY_ICONS[node.name] : undefined;
    const category = await prisma.category.upsert({
      where: { slug },
      update: { showOnHome: Boolean(homeIcon), icon: homeIcon },
      create: {
        name: node.name,
        slug,
        isActive: true,
        showInMenu: true,
        showOnHome: Boolean(homeIcon),
        icon: homeIcon,
        position: index,
        parentId: parentId || undefined,
      },
    });
    categoryByName[node.name] = category;

    if (node.children?.length) {
      await seedCategoryTree(node.children, category.id, categoryByName);
    }
  }
}

async function seedCategoriesAndProducts() {
  const categoryByName = {};
  await seedCategoryTree(CATEGORY_TREE, null, categoryByName);

  const topLevelCount = CATEGORY_TREE.length;
  const totalCount = Object.keys(categoryByName).length;
  console.log(`Seeded ${topLevelCount} top-level categories (${totalCount} total, including subcategories).`);

  for (const [index, prod] of PRODUCTS.entries()) {
    const slug = slugify(prod.title);
    const category = categoryByName[prod.category];

    const product = await prisma.product.upsert({
      where: { slug },
      update: { isFeatured: Boolean(prod.isFeatured) },
      create: {
        title: prod.title,
        slug,
        shortDescription: prod.shortDescription,
        price: prod.price,
        isActive: true,
        isFeatured: Boolean(prod.isFeatured),
        position: index,
      },
    });

    await prisma.productCategory.upsert({
      where: { productId_categoryId: { productId: product.id, categoryId: category.id } },
      update: {},
      create: { productId: product.id, categoryId: category.id },
    });

    console.log(`Seeded product: ${prod.title}`);
  }
}

async function main() {
  await seedAdmin();
  await seedCities();
  await seedCategoriesAndProducts();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
