import { PRODUCT_CATEGORIES, PAYMENT_METHODS, STYLE_PREFERENCES } from '../config/constants.js';

// ── Rich, lived-in demo data for Tanvi Boutique, Hyderabad ───────────────
// Real-looking South-Indian / Hyderabadi names, varied history and spend.

const AVATAR_COLORS = [
  '#6B2C4F', '#A8456B', '#8E5572', '#B8860B', '#7A6C5D',
  '#4A5859', '#9C6644', '#5C4B51', '#856084', '#3E5641',
];

export const colorFor = (seed) =>
  AVATAR_COLORS[Math.abs([...String(seed)].reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

// A curated catalogue of items per category with realistic INR price bands.
const CATALOGUE = {
  Sarees: [
    ['Kanjivaram Silk Saree', 18500], ['Banarasi Georgette Saree', 12200],
    ['Pochampally Ikat Saree', 6800], ['Mangalagiri Cotton Saree', 3200],
    ['Tussar Silk Saree', 9400], ['Organza Floral Saree', 7600],
  ],
  Lehengas: [
    ['Embroidered Bridal Lehenga', 42000], ['Georgette Party Lehenga', 16800],
    ['Raw Silk Lehenga Set', 24500], ['Sequin Net Lehenga', 19200],
  ],
  Kurtis: [
    ['Chikankari Anarkali Kurti', 2850], ['Cotton Printed Kurti', 1250],
    ['Rayon Straight Kurti', 1650], ['Silk Blend A-line Kurti', 2200],
  ],
  'Anarkali Suits': [
    ['Floor-length Anarkali Suit', 8900], ['Velvet Anarkali Set', 11400],
    ['Cotton Anarkali Suit', 4200],
  ],
  Gowns: [
    ['Indo-Western Gown', 9800], ['Net Embellished Gown', 13600],
    ['Satin Evening Gown', 7400],
  ],
  Blouses: [
    ['Designer Maggam Blouse', 4200], ['Readymade Silk Blouse', 1600],
    ['Boat-neck Embroidered Blouse', 2400],
  ],
  'Dupattas & Stoles': [
    ['Phulkari Dupatta', 1850], ['Banarasi Zari Dupatta', 2600],
    ['Pashmina Stole', 3400],
  ],
  'Bridal Wear': [
    ['Bridal Kanjivaram Set', 58000], ['Reception Gown Couture', 46500],
    ['Bridal Lehenga Couture', 72000],
  ],
  Accessories: [
    ['Temple Jewellery Set', 5600], ['Potli Bag', 1200],
    ['Embroidered Clutch', 1850], ['Kundan Maang Tikka', 2200],
  ],
  'Fabric & Unstitched': [
    ['Unstitched Silk Suit Piece', 3800], ['Pure Cotton Fabric (3m)', 1400],
    ['Banarasi Brocade Fabric', 4600],
  ],
};

const CUSTOMERS = [
  ['Aishwarya Reddy', '9848012345', 'aishwarya.reddy@gmail.com', ['Bridal', 'Designer'], 'Jubilee Hills'],
  ['Sneha Kothapalli', '9701123456', 'sneha.k@outlook.com', ['Festive', 'Traditional'], 'Banjara Hills'],
  ['Lakshmi Narayanan', '9885234567', 'lakshmi.n@gmail.com', ['Traditional', 'Handloom'], 'Himayatnagar'],
  ['Priya Varma', '9963345678', 'priya.varma@yahoo.com', ['Contemporary', 'Indo-Western'], 'Gachibowli'],
  ['Fatima Begum', '9000456789', 'fatima.begum@gmail.com', ['Festive', 'Designer'], 'Charminar'],
  ['Divya Sundaram', '9849567890', 'divya.s@gmail.com', ['Casual', 'Contemporary'], 'Madhapur'],
  ['Ananya Iyer', '9701678901', 'ananya.iyer@gmail.com', ['Designer', 'Bridal'], 'Kondapur'],
  ['Meghana Rao', '9885789012', 'meghana.rao@gmail.com', ['Traditional', 'Festive'], 'Kukatpally'],
  ['Sushmita Naidu', '9963890123', 'sushmita.n@gmail.com', ['Handloom', 'Casual'], 'Secunderabad'],
  ['Zoya Khan', '9000901234', 'zoya.khan@gmail.com', ['Indo-Western', 'Designer'], 'Tolichowki'],
  ['Bhavana Chowdary', '9848112233', 'bhavana.c@gmail.com', ['Festive', 'Traditional'], 'Manikonda'],
  ['Ritika Agarwal', '9701223344', 'ritika.a@gmail.com', ['Contemporary', 'Casual'], 'Begumpet'],
  ['Keerthana Pillai', '9885334455', 'keerthana.p@gmail.com', ['Traditional', 'Handloom'], 'Ameerpet'],
  ['Nandini Goud', '9963445566', 'nandini.goud@gmail.com', ['Festive', 'Designer'], 'Miyapur'],
  ['Sai Sruthi', '9000556677', 'sai.sruthi@gmail.com', ['Casual', 'Contemporary'], 'Nallagandla'],
  ['Harika Devi', '9848667788', 'harika.devi@gmail.com', ['Bridal', 'Festive'], 'KPHB'],
  ['Pooja Malhotra', '9701778899', 'pooja.m@gmail.com', ['Designer', 'Indo-Western'], 'Hitech City'],
  ['Tanvi Sharma', '9885889900', 'tanvi.sharma@gmail.com', ['Contemporary', 'Casual'], 'Financial District'],
  ['Indira Menon', '9963990011', 'indira.menon@gmail.com', ['Traditional', 'Handloom'], 'Somajiguda'],
  ['Yamini Prasad', '9000101122', 'yamini.p@gmail.com', ['Festive', 'Traditional'], 'Dilsukhnagar'],
  ['Rukhsar Sultana', '9848212233', 'rukhsar.s@gmail.com', ['Designer', 'Bridal'], 'Mehdipatnam'],
  ['Deepika Reddy', '9701323344', 'deepika.reddy@gmail.com', ['Festive', 'Contemporary'], 'Kompally'],
  ['Vaishnavi Rao', '9885434455', 'vaishnavi.r@gmail.com', ['Traditional', 'Casual'], 'Uppal'],
  ['Aaliya Hussain', '9963545566', 'aaliya.h@gmail.com', ['Indo-Western', 'Festive'], 'Toli Chowki'],
  ['Manasa Kiran', '9000656677', 'manasa.k@gmail.com', ['Handloom', 'Traditional'], 'LB Nagar'],
  ['Swathi Reddy', '9848767788', 'swathi.reddy@gmail.com', ['Casual', 'Contemporary'], 'Chandanagar'],
  ['Nazia Parveen', '9701878899', '', ['Festive', 'Designer'], 'Malakpet'],
  ['Charitha Vemuri', '9885989900', 'charitha.v@gmail.com', ['Bridal', 'Traditional'], 'Sainikpuri'],
  ['Komal Jaiswal', '9963090011', 'komal.j@gmail.com', ['Contemporary', 'Indo-Western'], 'ECIL'],
  ['Sirisha Babu', '9000191122', 'sirisha.b@gmail.com', ['Traditional', 'Festive'], 'Alwal'],
  ['Anjali Mehta', '9848303344', 'anjali.mehta@gmail.com', ['Designer', 'Casual'], 'Jubilee Hills'],
  ['Rohini Sastry', '9701414455', 'rohini.s@gmail.com', ['Handloom', 'Traditional'], 'Banjara Hills'],
  [' Feeroza Anjum', '9885525566', 'feeroza.a@gmail.com', ['Festive', 'Bridal'], 'Nampally'],
  ['Geetha Krishnan', '9963636677', 'geetha.k@gmail.com', ['Traditional', 'Handloom'], 'Sanathnagar'],
  ['Pallavi Nair', '9000747788', 'pallavi.nair@gmail.com', ['Contemporary', 'Designer'], 'Kphb Colony'],
];

// Deterministic pseudo-random so seeds are reproducible across runs.
function mulberry32(seed) {
  return function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (rand, arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (rand, arr, n) => {
  const copy = [...arr];
  const out = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0]);
  return out;
};

/**
 * Build customer documents + purchases. `now` anchors the history window so
 * "this month / quarter" analytics always have fresh data.
 * Returns { customers: [...customerInput], purchasesByIndex: Map }.
 */
export function buildSeed(now = new Date()) {
  const rand = mulberry32(20252026);
  const customers = [];
  const purchasesByIndex = []; // array aligned with customers index

  CUSTOMERS.forEach(([name, phone, email, prefs, city], idx) => {
    const cleanName = name.trim();
    customers.push({
      name: cleanName,
      phone,
      email,
      address: { line: `${city}, Hyderabad`, city: 'Hyderabad', pincode: String(500001 + (idx * 7) % 90) },
      stylePreferences: prefs.filter((p) => STYLE_PREFERENCES.includes(p)),
      avatarColor: colorFor(cleanName),
      notes: idx % 6 === 0 ? 'Prefers WhatsApp for new arrivals.' : '',
    });

    // Decide how many purchases this customer has (skew toward a long tail).
    // ~12% inactive (no purchases), big spenders get many.
    const roll = rand();
    let count;
    if (roll < 0.1) count = 0; // inactive / just added
    else if (roll < 0.4) count = 1; // new
    else if (roll < 0.75) count = 2 + Math.floor(rand() * 3); // regular 2-4
    else count = 5 + Math.floor(rand() * 8); // loyal 5-12

    const purchases = [];
    for (let i = 0; i < count; i += 1) {
      // Spread purchases over the last ~14 months, weighted toward recent.
      const monthsAgo = Math.floor(rand() * rand() * 14); // squared -> recency bias
      const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1 + Math.floor(rand() * 27));
      d.setHours(10 + Math.floor(rand() * 9), Math.floor(rand() * 60), 0, 0);

      const numLines = 1 + Math.floor(rand() * 3);
      const cats = pickN(rand, PRODUCT_CATEGORIES, numLines);
      const items = cats.map((category) => {
        const [itemName, basePrice] = pick(rand, CATALOGUE[category]);
        // ±15% price variation to feel organic.
        const unitPrice = Math.round((basePrice * (0.9 + rand() * 0.25)) / 50) * 50;
        const quantity = rand() < 0.8 ? 1 : 1 + Math.floor(rand() * 2);
        return { name: itemName, category, quantity, unitPrice };
      });

      purchases.push({
        date: d,
        items,
        paymentMethod: pick(rand, PAYMENT_METHODS),
        invoiceNo: `TB-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${1000 + idx * 13 + i}`,
        notes: '',
      });
    }
    purchasesByIndex.push(purchases);
  });

  return { customers, purchasesByIndex };
}
