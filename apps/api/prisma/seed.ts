import { DEFAULT_CURRENCIES } from '@poozari/shared';
import { PrismaClient, PujaLocationType, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';

// tsx does not auto-load .env, so load it manually before creating the client.
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*"?([^"]*)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}
loadEnv();

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@poozari.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'admin12345';

  /*
   * The development defaults are published in this repository, so seeding a
   * production database with them would hand the admin panel to anyone who
   * reads the README. Refuse rather than do it quietly.
   */
  if (process.env.NODE_ENV === 'production') {
    const weak: string[] = [];
    if (!process.env.SEED_ADMIN_PASSWORD) weak.push('SEED_ADMIN_PASSWORD');
    if (!process.env.SEED_PANDIT_PASSWORD) weak.push('SEED_PANDIT_PASSWORD');
    if (weak.length) {
      throw new Error(
        `Refusing to seed production with default passwords. Set ${weak.join(' and ')} ` +
          'to strong values first. To skip the seeded test customer entirely, ' +
          'set SEED_TEST_CUSTOMER=false.',
      );
    }
  }

  const panditPassword = process.env.SEED_PANDIT_PASSWORD ?? 'pandit12345';

  // Super Admin
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Super Admin',
      role: UserRole.SUPER_ADMIN,
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });

  // Cities
  const cityData = [
    { name: 'Varanasi', slug: 'varanasi', state: 'Uttar Pradesh', imageUrl: 'https://img.pujariji.com/cities/a717d2e0-ddf2-4dec-80d4-c62e8048c5fd.jpeg?w=480&format=webp' },
    { name: 'Ujjain', slug: 'ujjain', state: 'Madhya Pradesh', imageUrl: 'https://img.pujariji.com/cities/8aa10525-317b-444e-926d-decf0051b2a9.jpeg?w=480&format=webp' },
    { name: 'Gaya', slug: 'gaya', state: 'Bihar', imageUrl: 'https://img.pujariji.com/cities/df4ec4f8-0ece-40dc-b419-8947fecc803f.jpeg?w=480&format=webp' },
    { name: 'Trimbkeshwer', slug: 'trimbkeshwer', state: 'Maharashtra', imageUrl: 'https://img.pujariji.com/cities/122d692b-6d70-4eca-aa1e-305a34e33c33.jpeg?w=480&format=webp' },
  ];
  const cities: Record<string, string> = {};
  for (const c of cityData) {
    const city = await prisma.city.upsert({
      where: { slug: c.slug },
      update: { imageUrl: c.imageUrl },
      create: c,
    });
    cities[c.slug] = city.id;
  }

  // Temples
  const templeData = [
    { name: 'Kashi Vishwanath Temple', slug: 'kashi-vishwanath-temple', city: 'varanasi', imageUrl: 'https://img.pujariji.com/temples/976c36d0-7786-45ac-89de-30e4401f4457.jpeg?w=480&format=webp' },
    { name: 'Batuk Bhairav Mandir', slug: 'batuk-bhairav-mandir', city: 'varanasi', imageUrl: 'https://img.pujariji.com/temples/189061cd-ab96-4d76-a20b-282d8fcc9614.jpg?w=480&format=webp' },
    { name: 'Shri Kamakhya Temple', slug: 'shri-kamakhya-temple', city: 'varanasi', imageUrl: 'https://img.pujariji.com/temples/d17fc28e-1264-4c5b-95db-f5f81727a9e7.jpg?w=480&format=webp' },
    { name: 'Trimbakeshwar Teerth', slug: 'trimbakeshwar-teerth', city: 'trimbkeshwer', imageUrl: 'https://img.pujariji.com/temples/7d3fdccb-9514-44a7-8b30-abe9f10e3c80.jpg?w=480&format=webp' },
  ];
  const temples: Record<string, string> = {};
  for (const t of templeData) {
    const temple = await prisma.temple.upsert({
      where: { slug: t.slug },
      update: { imageUrl: t.imageUrl },
      create: { name: t.name, slug: t.slug, cityId: cities[t.city], state: '', imageUrl: t.imageUrl },
    });
    temples[t.slug] = temple.id;
  }

  // Deities / Festivals / Benefits
  const deityData = [
    { name: 'Lord Shiva', slug: 'lord-shiva', imageUrl: 'https://img.pujariji.com/pujas/a404ee1c-8078-402f-b241-2fdf08a47219.jpg?w=480&format=webp' },
    { name: 'Goddess Durga', slug: 'goddess-durga', imageUrl: 'https://img.pujariji.com/pujas/a9aa7677-eec5-4ef3-a96b-b140279f763f.jpg?w=480&format=webp' },
    { name: 'Lord Vishnu', slug: 'lord-vishnu', imageUrl: 'https://img.pujariji.com/pujas/a5337a2f-a67d-4a09-9ce4-3fb1b5659685.jpg?w=480&format=webp' },
    { name: 'Lord Hanuman', slug: 'lord-hanuman', imageUrl: 'https://img.pujariji.com/pujas/a38ef3ff-5517-4fad-a971-eb252000d334.jpg?w=480&format=webp' },
  ];
  const deities: Record<string, string> = {};
  for (const d of deityData) {
    const deity = await prisma.deity.upsert({
      where: { slug: d.slug },
      update: { imageUrl: d.imageUrl },
      create: d,
    });
    deities[d.slug] = deity.id;
  }

  const festivalData = [
    { name: 'Navratri', slug: 'navratri', imageUrl: 'https://img.pujariji.com/pujas/a9aa7677-eec5-4ef3-a96b-b140279f763f.jpg?w=480&format=webp' },
    { name: 'Mahashivratri', slug: 'mahashivratri', imageUrl: 'https://img.pujariji.com/pujas/deb6c95a-0fc6-48d5-9bbb-6a812444f27a.jpg?w=480&format=webp' },
    { name: 'Diwali', slug: 'diwali', imageUrl: 'https://img.pujariji.com/pujas/9f154383-e4aa-4ee6-863c-84ed8a07f21c.jpg?w=480&format=webp' },
  ];
  const festivals: Record<string, string> = {};
  for (const f of festivalData) {
    const festival = await prisma.festival.upsert({
      where: { slug: f.slug },
      update: { imageUrl: f.imageUrl },
      create: f,
    });
    festivals[f.slug] = festival.id;
  }

  const benefitData = [
    { name: 'Health', slug: 'health', imageUrl: 'https://img.pujariji.com/pujas/4d98e3da-a806-443b-971e-33dbdb7851a4.jpg?w=480&format=webp' },
    { name: 'Prosperity', slug: 'prosperity', imageUrl: 'https://img.pujariji.com/pujas/b55dd0d2-fc6d-4cea-a9d2-cfdfa69a201d.jpg?w=480&format=webp' },
    { name: 'Peace', slug: 'peace', imageUrl: 'https://img.pujariji.com/pujas/159e3a46-ec87-4b11-8a4e-b23a4ddbb7ae.png?w=480&format=webp' },
    { name: 'Obstacle Removal', slug: 'obstacle-removal', imageUrl: 'https://img.pujariji.com/pujas/f61f12cd-cbe1-4038-9747-f6e95a3dc913.jpg?w=480&format=webp' },
  ];
  const benefits: Record<string, string> = {};
  for (const b of benefitData) {
    const benefit = await prisma.benefit.upsert({
      where: { slug: b.slug },
      update: { imageUrl: b.imageUrl },
      create: b,
    });
    benefits[b.slug] = benefit.id;
  }

  // Pujas
  const pujas = [
    {
      title: 'Rudrabhishek',
      slug: 'rudrabhishek',
      summary: 'One of the most powerful rituals to please Lord Shiva.',
      description:
        'Rudrabhishek involves offering sacred items to the Shivling along with chanting of Rudra mantras. Removes negative energies and brings peace, health and success.',
      imageUrl: 'https://img.pujariji.com/pujas/deb6c95a-0fc6-48d5-9bbb-6a812444f27a.jpg?w=480&format=webp',
      locationType: PujaLocationType.HOME,
      deities: ['lord-shiva'],
      festivals: ['mahashivratri'],
      benefits: ['health', 'peace'],
      packages: [
        { name: 'Standard', priceInr: 6100, inclusions: ['Verified pujari', 'Samagri included', 'Video proof'] },
        { name: 'Premium (with Havan)', priceInr: 11000, inclusions: ['Verified pujari', 'Samagri included', 'Havan', 'Video proof'] },
      ],
    },
    {
      title: 'Satya Narayan Vrat Katha',
      slug: 'satya-narayan-vrat-katha',
      summary: 'Popular ritual performed on auspicious occasions.',
      description:
        'Includes fasting, puja and narration of the sacred katha. Brings divine blessings, removes obstacles and ensures harmony.',
      imageUrl: 'https://img.pujariji.com/pujas/a5337a2f-a67d-4a09-9ce4-3fb1b5659685.jpg?w=480&format=webp',
      locationType: PujaLocationType.HOME,
      deities: ['lord-vishnu'],
      festivals: ['diwali'],
      benefits: ['prosperity', 'peace'],
      packages: [
        { name: 'Standard', priceInr: 5100, inclusions: ['Verified pujari', 'Samagri included', 'Video proof'] },
      ],
    },
    {
      title: 'Navratri Special Chandi Path',
      slug: 'navratri-special-chandi-path',
      summary: 'Sacred recitation dedicated to Goddess Durga.',
      description:
        'Chanting of 700 verses from the Durga Saptashati to remove negativity and bring prosperity, courage and spiritual growth.',
      imageUrl: 'https://img.pujariji.com/pujas/a9aa7677-eec5-4ef3-a96b-b140279f763f.jpg?w=480&format=webp',
      locationType: PujaLocationType.HOME,
      deities: ['goddess-durga'],
      festivals: ['navratri'],
      benefits: ['prosperity', 'obstacle-removal'],
      packages: [
        { name: 'Standard', priceInr: 21000, inclusions: ['Multiple pujaris', 'Samagri included', 'Havan', 'Video proof'] },
      ],
    },
    {
      title: 'Bhairav Stotra Paath',
      slug: 'bhairav-stotra-paath',
      summary: 'Performed at Batuk Bhairav Mandir, Varanasi.',
      description: 'Wish-fulfilment and protection ritual dedicated to Batuk Bhairav.',
      imageUrl: 'https://img.pujariji.com/pujas/13727705-a7ea-4221-8ac0-c26792928452.jpg?w=480&format=webp',
      locationType: PujaLocationType.TEERTH,
      temple: 'batuk-bhairav-mandir',
      city: 'varanasi',
      deities: ['lord-shiva'],
      benefits: ['obstacle-removal', 'peace'],
      packages: [
        { name: 'Standard', priceInr: 11000, inclusions: ['Temple-authorised pujari', 'Samagri included', 'Video proof'] },
      ],
    },
    {
      title: 'Narayan Nag Bali Puja',
      slug: 'narayan-nag-bali-puja',
      summary: 'Performed at Trimbakeshwar Teerth.',
      description: 'Ritual for ancestral peace and release from doshas, performed at the holy site.',
      imageUrl: 'https://img.pujariji.com/pujas/e9841655-a22c-476a-9d3f-e03d8a241165.jpg?w=480&format=webp',
      locationType: PujaLocationType.TEERTH,
      temple: 'trimbakeshwar-teerth',
      city: 'trimbkeshwer',
      deities: ['lord-vishnu'],
      benefits: ['peace', 'obstacle-removal'],
      packages: [
        { name: 'Standard', priceInr: 21000, inclusions: ['Temple-authorised pujari', 'Samagri included', 'Video proof'] },
      ],
    },
    {
      title: 'Maha Mrityunjaya Jaap',
      slug: 'maha-mrityunjaya-jaap-digital',
      summary: 'Performed in your name at Kashi and shared as video.',
      description: 'Sankalp in the devotee\'s name and gotra, followed by the Maha Mrityunjaya jaap for health and long life. The recorded video and prasad are sent to you.',
      imageUrl: 'https://img.pujariji.com/pujas/a404ee1c-8078-402f-b241-2fdf08a47219.jpg?w=480&format=webp',
      locationType: PujaLocationType.DIGITAL,
      city: 'varanasi',
      deities: ['lord-shiva'],
      benefits: ['health', 'peace'],
      packages: [
        { name: '11,000 Jaap', priceInr: 2100, inclusions: ['Sankalp in your name', 'Recorded video', 'Prasad by post'] },
        { name: '1,25,000 Jaap', priceInr: 11000, inclusions: ['Sankalp in your name', 'Recorded video', 'Prasad by post', '5 pandits'] },
      ],
    },
    {
      title: 'Lakshmi Kuber Puja',
      slug: 'lakshmi-kuber-puja-digital',
      summary: 'A prosperity puja performed on your behalf.',
      description: 'Pandits perform the Lakshmi Kuber puja with your sankalp on an auspicious muhurat. Watch the recording and receive the blessed prasad at home.',
      imageUrl: 'https://img.pujariji.com/pujas/b55dd0d2-fc6d-4cea-a9d2-cfdfa69a201d.jpg?w=480&format=webp',
      locationType: PujaLocationType.DIGITAL,
      deities: ['lord-vishnu'],
      festivals: ['diwali'],
      benefits: ['prosperity'],
      packages: [
        { name: 'Standard', priceInr: 1500, inclusions: ['Sankalp in your name', 'Recorded video', 'Prasad by post'] },
      ],
    },
  ];

  for (const p of pujas) {
    const existing = await prisma.puja.findUnique({ where: { slug: p.slug } });
    if (existing) {
      // Update imageUrl on existing pujas
      await prisma.puja.update({ where: { slug: p.slug }, data: { imageUrl: p.imageUrl } });
      continue;
    }
    await prisma.puja.create({
      data: {
        title: p.title,
        slug: p.slug,
        summary: p.summary,
        description: p.description,
        imageUrl: p.imageUrl,
        locationType: p.locationType,
        templeId: p.temple ? temples[p.temple] : undefined,
        cityId: p.city ? cities[p.city] : undefined,
        deities: { connect: (p.deities ?? []).map((d) => ({ id: deities[d] })) },
        festivals: { connect: (p.festivals ?? []).map((f) => ({ id: festivals[f] })) },
        benefits: { connect: (p.benefits ?? []).map((b) => ({ id: benefits[b] })) },
        packages: { create: p.packages },
      },
    });
  }

  // Products
  const productData = [
    {
      name: 'Panchmukhi Rudraksha Mala',
      slug: 'panchmukhi-rudraksha-mala',
      category: 'Rudraksha & Mala',
      description:
        'Traditional 108-bead Panchmukhi Rudraksha mala for daily japa, meditation and spiritual practice.',
      imageUrl: '/products/panchmukhi-rudraksha.png',
      priceInr: 1101,
      stockQuantity: 25,
      isActive: true,
    },
    {
      name: 'Complete Havan Samagri Kit',
      slug: 'complete-havan-samagri-kit',
      category: 'Havan Essentials',
      description:
        'A ready-to-use collection of essential herbs, woods and offerings for performing a traditional havan.',
      imageUrl: '/products/havan-samagri-kit.png',
      priceInr: 751,
      stockQuantity: 40,
      isActive: true,
    },
    {
      name: 'Brass Puja Thali Set',
      slug: 'brass-puja-thali-set',
      category: 'Puja Accessories',
      description:
        'Elegant brass puja thali with coordinated diya, bell, incense holder and offering bowls.',
      imageUrl: '/products/brass-puja-thali.png',
      priceInr: 1299,
      stockQuantity: 18,
      isActive: true,
    },
    {
      name: 'Pure Cow Ghee Diyas',
      slug: 'pure-cow-ghee-diyas',
      category: 'Diyas & Lighting',
      description:
        'Convenient ready-to-light cotton-wick diyas made with pure cow ghee for puja and aarti.',
      imageUrl: '/products/cow-ghee-diyas.png',
      priceInr: 351,
      stockQuantity: 60,
      isActive: true,
    },
    {
      name: 'Chandan & Kumkum Puja Set',
      slug: 'chandan-kumkum-puja-set',
      category: 'Puja Essentials',
      description:
        'Auspicious sandalwood paste and vibrant kumkum presented in traditional brass containers.',
      imageUrl: '/products/chandan-kumkum-set.png',
      priceInr: 451,
      stockQuantity: 35,
      isActive: true,
    },
    {
      name: 'Traditional Copper Kalash',
      slug: 'traditional-copper-kalash',
      category: 'Puja Accessories',
      description:
        'Classic polished copper kalash for puja, festivals, griha pravesh and other sacred ceremonies.',
      imageUrl: '/products/copper-kalash.png',
      priceInr: 899,
      stockQuantity: 22,
      isActive: true,
    },
  ];

  for (const product of productData) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: product,
      create: product,
    });
  }

  // Sample pandits
  const panditData = [
    {
      email: 'pandit.varanasi@poozari.com',
      displayName: 'Pandit Ram Shankar Shastri',
      phone: '9000000001',
      serviceCityIds: [cities['varanasi']],
      servicePincodes: ['221001', '221002'],
      specializations: ['Rudrabhishek', 'Bhairav'],
    },
    {
      email: 'pandit.ujjain@poozari.com',
      displayName: 'Pandit Mohan Dwivedi',
      phone: '9000000002',
      serviceCityIds: [cities['ujjain']],
      servicePincodes: ['456001'],
      specializations: ['Chandi', 'Navratri'],
    },
  ];
  for (const pd of panditData) {
    const exists = await prisma.user.findUnique({ where: { email: pd.email } });
    if (exists) continue;
    await prisma.user.create({
      data: {
        email: pd.email,
        name: pd.displayName,
        role: UserRole.PANDIT,
        passwordHash: await bcrypt.hash(panditPassword, 10),
        panditProfile: {
          create: {
            displayName: pd.displayName,
            phone: pd.phone,
            experienceYears: 15,
            specializations: pd.specializations,
            serviceCityIds: pd.serviceCityIds,
            servicePincodes: pd.servicePincodes,
          },
        },
      },
    });
  }

  // Test customer, for signing in with a password instead of an OTP.
  //
  // Customers normally arrive via OTP and never have a password, which makes
  // repeated manual testing tedious. This one is seeded with a password so
  // `/login` -> "Sign in with password" works straight away. It also carries
  // the sankalp details that pre-fill a booking form.
  // A known-password account has no place in production; opt out with
  // SEED_TEST_CUSTOMER=false.
  const wantTestCustomer = process.env.SEED_TEST_CUSTOMER !== 'false';
  const testCustomerPhone = process.env.SEED_CUSTOMER_PHONE ?? '9000000009';
  const testCustomerPassword = process.env.SEED_CUSTOMER_PASSWORD ?? 'customer12345';
  const testCustomer = wantTestCustomer ? await prisma.user.upsert({
    where: { phone: testCustomerPhone },
    create: {
      phone: testCustomerPhone,
      name: 'Test Devotee',
      email: 'test.devotee@example.com',
      role: UserRole.CUSTOMER,
      passwordHash: await bcrypt.hash(testCustomerPassword, 10),
      gotra: 'Bharadwaj',
      dateOfBirth: new Date('1990-05-14'),
      gender: 'MALE',
      addressLine: '14 Assi Ghat Road',
      city: 'Varanasi',
      state: 'Uttar Pradesh',
      pincode: '221005',
    },
    // Reseeding resets the password so the documented one always works, but
    // leaves anything else the account has accumulated alone.
    update: { passwordHash: await bcrypt.hash(testCustomerPassword, 10) },
  }) : null;

  // One completed booking, so the customer's account pages are not empty.
  // Keyed on a fixed reference, so reseeding does not pile up duplicates.
  const demoReference = 'POZ-DEMO01';
  const demoPuja = await prisma.puja.findUnique({
    where: { slug: 'rudrabhishek' },
    include: { packages: { orderBy: { priceInr: 'asc' }, take: 1 } },
  });
  if (
    testCustomer &&
    demoPuja?.packages[0] &&
    !(await prisma.booking.findUnique({ where: { reference: demoReference } }))
  ) {
    const demoPackage = demoPuja.packages[0];
    await prisma.booking.create({
      data: {
        reference: demoReference,
        customerId: testCustomer.id,
        pujaId: demoPuja.id,
        packageId: demoPackage.id,
        status: 'COMPLETED',
        devoteeName: 'Test Devotee',
        gotra: 'Bharadwaj',
        contactPhone: testCustomerPhone,
        contactEmail: 'test.devotee@example.com',
        preferredDate: new Date('2026-08-12'),
        preferredTime: 'Morning',
        addressLine: '14 Assi Ghat Road',
        city: 'Varanasi',
        pincode: '221005',
        packageAmountInr: demoPackage.priceInr,
        amountInr: demoPackage.priceInr,
        payment: {
          create: { amountInr: demoPackage.priceInr, status: 'PAID' },
        },
      },
    });
  }

  // Checkout add-ons, offered on every puja. Prices are starting points the
  // Super Admin edits under Admin -> Add-ons.
  const addons = [
    { slug: 'fruits-and-sweets', name: 'Fruits & Sweets', nameHi: 'फल और मिठाई', priceInr: 999, sortOrder: 1,
      description: 'Seasonal fruits and fresh sweets for the offering and prasad.',
      descriptionHi: 'भोग और प्रसाद के लिए मौसमी फल और ताज़ी मिठाई।' },
    { slug: 'hawan-kund', name: 'Hawan Kund', nameHi: 'हवन कुंड', priceInr: 999, sortOrder: 2,
      description: 'Copper hawan kund with wood and ghee for the fire ritual.',
      descriptionHi: 'हवन के लिए ताम्र हवन कुंड, समिधा और घी सहित।' },
    { slug: 'flowers', name: 'Flowers', nameHi: 'पुष्प', priceInr: 999, sortOrder: 3,
      description: 'Fresh flowers and garlands for the altar and the deity.',
      descriptionHi: 'वेदी और देव-विग्रह के लिए ताज़े पुष्प और मालाएँ।' },
    { slug: 'samagri', name: 'Samagri', nameHi: 'सामग्री', priceInr: 999, sortOrder: 4,
      description: 'Complete puja samagri kit — roli, kalava, akshat, dhoop and more.',
      descriptionHi: 'संपूर्ण पूजा सामग्री — रोली, कलावा, अक्षत, धूप इत्यादि।' },
  ];
  for (const addon of addons) {
    await prisma.addon.upsert({
      where: { slug: addon.slug },
      create: addon,
      // Never clobber a price an admin has already set.
      update: {},
    });
  }

  // Display currencies. Rates are indicative starting points that the Super
  // Admin maintains under Admin -> Currencies; money is always charged in INR.
  for (const currency of DEFAULT_CURRENCIES) {
    await prisma.currencyRate.upsert({
      where: { code: currency.code },
      create: currency,
      // Never clobber a rate an admin has already corrected.
      update: {},
    });
  }

  // eslint-disable-next-line no-console
  console.log('Seed complete. Admin:', adminEmail, '/ password from SEED_ADMIN_PASSWORD');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
