/**
 * California Legal Codes Scraper
 *
 * Scrapes Penal Code (PC), Vehicle Code (VC), and Health & Safety Code (HSC)
 * from California Legislative Information website.
 *
 * Output: data/california-codes.json
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// California codes to scrape
const CODE_TYPES = [
  {
    type: 'PC',
    name: 'Penal Code',
    tocCode: 'PEN',
    category: 'Crimes & Punishments'
  },
  {
    type: 'VC',
    name: 'Vehicle Code',
    tocCode: 'VEH',
    category: 'Traffic & Vehicle'
  },
  {
    type: 'HSC',
    name: 'Health & Safety Code',
    tocCode: 'HSC',
    category: 'Health & Safety'
  }
];

// Manual curated list of common California codes for GTA V roleplay
// This is a comprehensive starter database that can be used immediately
const CURATED_CODES = [
  // Penal Code - Crimes Against Person
  { code: 'PC 187', title: 'Murder', type: 'PC', section: '187', category: 'Crimes Against Person' },
  { code: 'PC 192', title: 'Manslaughter', type: 'PC', section: '192', category: 'Crimes Against Person' },
  { code: 'PC 203', title: 'Mayhem', type: 'PC', section: '203', category: 'Crimes Against Person' },
  { code: 'PC 207', title: 'Kidnapping', type: 'PC', section: '207', category: 'Crimes Against Person' },
  { code: 'PC 209', title: 'Kidnapping for Ransom', type: 'PC', section: '209', category: 'Crimes Against Person' },
  { code: 'PC 211', title: 'Robbery', type: 'PC', section: '211', category: 'Crimes Against Person' },
  { code: 'PC 215', title: 'Carjacking', type: 'PC', section: '215', category: 'Crimes Against Person' },
  { code: 'PC 217.1', title: 'Assault on Public Official', type: 'PC', section: '217.1', category: 'Crimes Against Person' },
  { code: 'PC 220', title: 'Assault with Intent to Commit Felony', type: 'PC', section: '220', category: 'Crimes Against Person' },
  { code: 'PC 240', title: 'Assault', type: 'PC', section: '240', category: 'Crimes Against Person' },
  { code: 'PC 241', title: 'Assault on Peace Officer', type: 'PC', section: '241', category: 'Crimes Against Person' },
  { code: 'PC 242', title: 'Battery', type: 'PC', section: '242', category: 'Crimes Against Person' },
  { code: 'PC 243', title: 'Battery on Peace Officer', type: 'PC', section: '243', category: 'Crimes Against Person' },
  { code: 'PC 245', title: 'Assault with Deadly Weapon', type: 'PC', section: '245', category: 'Crimes Against Person' },
  { code: 'PC 246', title: 'Shooting at Inhabited Dwelling', type: 'PC', section: '246', category: 'Crimes Against Person' },
  { code: 'PC 261', title: 'Rape', type: 'PC', section: '261', category: 'Crimes Against Person' },
  { code: 'PC 273.5', title: 'Domestic Battery', type: 'PC', section: '273.5', category: 'Crimes Against Person' },
  { code: 'PC 288', title: 'Lewd Acts with Child', type: 'PC', section: '288', category: 'Crimes Against Person' },

  // Penal Code - Property Crimes
  { code: 'PC 415', title: 'Disturbing the Peace', type: 'PC', section: '415', category: 'Public Order' },
  { code: 'PC 417', title: 'Brandishing a Weapon', type: 'PC', section: '417', category: 'Public Order' },
  { code: 'PC 422', title: 'Criminal Threats', type: 'PC', section: '422', category: 'Public Order' },
  { code: 'PC 451', title: 'Arson', type: 'PC', section: '451', category: 'Property Crimes' },
  { code: 'PC 459', title: 'Burglary', type: 'PC', section: '459', category: 'Property Crimes' },
  { code: 'PC 470', title: 'Forgery', type: 'PC', section: '470', category: 'Property Crimes' },
  { code: 'PC 484', title: 'Theft', type: 'PC', section: '484', category: 'Property Crimes' },
  { code: 'PC 487', title: 'Grand Theft', type: 'PC', section: '487', category: 'Property Crimes' },
  { code: 'PC 488', title: 'Petty Theft', type: 'PC', section: '488', category: 'Property Crimes' },
  { code: 'PC 496', title: 'Receiving Stolen Property', type: 'PC', section: '496', category: 'Property Crimes' },
  { code: 'PC 503', title: 'Embezzlement', type: 'PC', section: '503', category: 'Property Crimes' },
  { code: 'PC 530.5', title: 'Identity Theft', type: 'PC', section: '530.5', category: 'Property Crimes' },
  { code: 'PC 594', title: 'Vandalism', type: 'PC', section: '594', category: 'Property Crimes' },
  { code: 'PC 597', title: 'Animal Cruelty', type: 'PC', section: '597', category: 'Public Order' },
  { code: 'PC 602', title: 'Trespassing', type: 'PC', section: '602', category: 'Property Crimes' },

  // Penal Code - Weapons
  { code: 'PC 12020', title: 'Possession of Prohibited Weapon', type: 'PC', section: '12020', category: 'Weapons' },
  { code: 'PC 25400', title: 'Carrying Concealed Firearm', type: 'PC', section: '25400', category: 'Weapons' },
  { code: 'PC 25850', title: 'Carrying Loaded Firearm', type: 'PC', section: '25850', category: 'Weapons' },
  { code: 'PC 26100', title: 'Drive-By Shooting', type: 'PC', section: '26100', category: 'Weapons' },
  { code: 'PC 29800', title: 'Felon in Possession of Firearm', type: 'PC', section: '29800', category: 'Weapons' },
  { code: 'PC 30305', title: 'Possession of Ammunition by Prohibited Person', type: 'PC', section: '30305', category: 'Weapons' },

  // Penal Code - Obstructing Justice
  { code: 'PC 69', title: 'Resisting Executive Officer', type: 'PC', section: '69', category: 'Obstruction' },
  { code: 'PC 118', title: 'Perjury', type: 'PC', section: '118', category: 'Obstruction' },
  { code: 'PC 136.1', title: 'Witness Intimidation', type: 'PC', section: '136.1', category: 'Obstruction' },
  { code: 'PC 148', title: 'Resisting Arrest', type: 'PC', section: '148', category: 'Obstruction' },
  { code: 'PC 148.5', title: 'False Report to Police', type: 'PC', section: '148.5', category: 'Obstruction' },
  { code: 'PC 182', title: 'Conspiracy', type: 'PC', section: '182', category: 'Obstruction' },
  { code: 'PC 186.22', title: 'Gang Enhancement', type: 'PC', section: '186.22', category: 'Gang Activity' },
  { code: 'PC 32', title: 'Accessory After the Fact', type: 'PC', section: '32', category: 'Obstruction' },
  { code: 'PC 31', title: 'Aiding and Abetting', type: 'PC', section: '31', category: 'Obstruction' },

  // Penal Code - Sex Offenses
  { code: 'PC 647(b)', title: 'Prostitution', type: 'PC', section: '647(b)', category: 'Sex Offenses' },
  { code: 'PC 266h', title: 'Pimping', type: 'PC', section: '266h', category: 'Sex Offenses' },
  { code: 'PC 266i', title: 'Pandering', type: 'PC', section: '266i', category: 'Sex Offenses' },
  { code: 'PC 314', title: 'Indecent Exposure', type: 'PC', section: '314', category: 'Sex Offenses' },

  // Penal Code - Miscellaneous
  { code: 'PC 25658', title: 'Furnishing Alcohol to Minor', type: 'PC', section: '25658', category: 'Public Order' },
  { code: 'PC 148.9', title: 'False Impersonation of Another', type: 'PC', section: '148.9', category: 'Public Order' },
  { code: 'PC 529', title: 'False Personation', type: 'PC', section: '529', category: 'Public Order' },
  { code: 'PC 653m', title: 'Annoying Phone Calls', type: 'PC', section: '653m', category: 'Public Order' },

  // Vehicle Code - DUI & Reckless Driving
  { code: 'VC 23152(a)', title: 'DUI - Alcohol', type: 'VC', section: '23152(a)', category: 'DUI' },
  { code: 'VC 23152(b)', title: 'DUI - BAC 0.08% or Higher', type: 'VC', section: '23152(b)', category: 'DUI' },
  { code: 'VC 23152(f)', title: 'DUI - Drugs', type: 'VC', section: '23152(f)', category: 'DUI' },
  { code: 'VC 23153', title: 'DUI Causing Injury', type: 'VC', section: '23153', category: 'DUI' },
  { code: 'VC 2800.1', title: 'Evading Peace Officer', type: 'VC', section: '2800.1', category: 'Reckless Driving' },
  { code: 'VC 2800.2', title: 'Evading with Wanton Disregard', type: 'VC', section: '2800.2', category: 'Reckless Driving' },
  { code: 'VC 2800.3', title: 'Evading Causing Injury or Death', type: 'VC', section: '2800.3', category: 'Reckless Driving' },
  { code: 'VC 2800.4', title: 'Evading While DUI', type: 'VC', section: '2800.4', category: 'Reckless Driving' },
  { code: 'VC 23103', title: 'Reckless Driving', type: 'VC', section: '23103', category: 'Reckless Driving' },
  { code: 'VC 23104', title: 'Reckless Driving Causing Injury', type: 'VC', section: '23104', category: 'Reckless Driving' },
  { code: 'VC 23109', title: 'Speed Contest/Racing', type: 'VC', section: '23109', category: 'Reckless Driving' },
  { code: 'VC 23109(c)', title: 'Exhibition of Speed', type: 'VC', section: '23109(c)', category: 'Reckless Driving' },
  { code: 'VC 20001', title: 'Hit and Run - Injury', type: 'VC', section: '20001', category: 'Hit and Run' },
  { code: 'VC 20002', title: 'Hit and Run - Property Damage', type: 'VC', section: '20002', category: 'Hit and Run' },

  // Vehicle Code - License & Registration
  { code: 'VC 12500', title: 'Driving Without License', type: 'VC', section: '12500', category: 'License & Registration' },
  { code: 'VC 14601', title: 'Driving on Suspended License', type: 'VC', section: '14601', category: 'License & Registration' },
  { code: 'VC 14601.1', title: 'Driving on Suspended License - DUI', type: 'VC', section: '14601.1', category: 'License & Registration' },
  { code: 'VC 14601.2', title: 'Driving on Suspended License - Repeat', type: 'VC', section: '14601.2', category: 'License & Registration' },
  { code: 'VC 14601.5', title: 'Driving on Suspended License - Reckless', type: 'VC', section: '14601.5', category: 'License & Registration' },
  { code: 'VC 10851', title: 'Vehicle Theft/Joyriding', type: 'VC', section: '10851', category: 'Vehicle Theft' },
  { code: 'VC 4461', title: 'False Vehicle Registration', type: 'VC', section: '4461', category: 'License & Registration' },
  { code: 'VC 5204', title: 'Display of License Plates', type: 'VC', section: '5204', category: 'License & Registration' },

  // Vehicle Code - Traffic Violations
  { code: 'VC 21453', title: 'Failure to Stop at Red Light', type: 'VC', section: '21453', category: 'Traffic Violations' },
  { code: 'VC 22349', title: 'Speed Limit Violation', type: 'VC', section: '22349', category: 'Traffic Violations' },
  { code: 'VC 22350', title: 'Basic Speed Law', type: 'VC', section: '22350', category: 'Traffic Violations' },
  { code: 'VC 22107', title: 'Unsafe Lane Change', type: 'VC', section: '22107', category: 'Traffic Violations' },
  { code: 'VC 21750', title: 'Crossing Yellow Line', type: 'VC', section: '21750', category: 'Traffic Violations' },
  { code: 'VC 22450', title: 'Failure to Stop at Stop Sign', type: 'VC', section: '22450', category: 'Traffic Violations' },
  { code: 'VC 27315', title: 'Child Seat Violation', type: 'VC', section: '27315', category: 'Traffic Violations' },
  { code: 'VC 27360', title: 'Seatbelt Violation', type: 'VC', section: '27360', category: 'Traffic Violations' },
  { code: 'VC 24250', title: 'Headlight Violation', type: 'VC', section: '24250', category: 'Equipment Violations' },
  { code: 'VC 26708', title: 'Window Tint Violation', type: 'VC', section: '26708', category: 'Equipment Violations' },
  { code: 'VC 27150', title: 'Muffler/Exhaust Violation', type: 'VC', section: '27150', category: 'Equipment Violations' },

  // Health & Safety Code - Narcotics
  { code: 'HSC 11350', title: 'Possession of Controlled Substance', type: 'HSC', section: '11350', category: 'Narcotics' },
  { code: 'HSC 11351', title: 'Possession for Sale - Narcotics', type: 'HSC', section: '11351', category: 'Narcotics' },
  { code: 'HSC 11352', title: 'Sale/Transportation of Controlled Substance', type: 'HSC', section: '11352', category: 'Narcotics' },
  { code: 'HSC 11353', title: 'Possession for Sale in Jail', type: 'HSC', section: '11353', category: 'Narcotics' },
  { code: 'HSC 11354', title: 'Possession of Heroin', type: 'HSC', section: '11354', category: 'Narcotics' },
  { code: 'HSC 11357', title: 'Possession of Marijuana', type: 'HSC', section: '11357', category: 'Narcotics' },
  { code: 'HSC 11358', title: 'Cultivation of Marijuana', type: 'HSC', section: '11358', category: 'Narcotics' },
  { code: 'HSC 11359', title: 'Possession of Marijuana for Sale', type: 'HSC', section: '11359', category: 'Narcotics' },
  { code: 'HSC 11360', title: 'Sale/Transportation of Marijuana', type: 'HSC', section: '11360', category: 'Narcotics' },
  { code: 'HSC 11364', title: 'Possession of Drug Paraphernalia', type: 'HSC', section: '11364', category: 'Narcotics' },
  { code: 'HSC 11366', title: 'Maintaining Drug House', type: 'HSC', section: '11366', category: 'Narcotics' },
  { code: 'HSC 11377', title: 'Possession of Methamphetamine', type: 'HSC', section: '11377', category: 'Narcotics' },
  { code: 'HSC 11378', title: 'Possession of Meth for Sale', type: 'HSC', section: '11378', category: 'Narcotics' },
  { code: 'HSC 11379', title: 'Sale/Transportation of Methamphetamine', type: 'HSC', section: '11379', category: 'Narcotics' },
  { code: 'HSC 11379.6', title: 'Manufacturing Controlled Substance', type: 'HSC', section: '11379.6', category: 'Narcotics' },
  { code: 'HSC 11380', title: 'Manufacturing Controlled Substance', type: 'HSC', section: '11380', category: 'Narcotics' },
  { code: 'HSC 11550', title: 'Under the Influence of Controlled Substance', type: 'HSC', section: '11550', category: 'Narcotics' },

  // Health & Safety Code - Alcohol
  { code: 'HSC 11014.5', title: 'Drunk in Public', type: 'HSC', section: '11014.5', category: 'Alcohol' },
  { code: 'HSC 25662', title: 'Minor in Possession of Alcohol', type: 'HSC', section: '25662', category: 'Alcohol' },
];

/**
 * Fetch URL using HTTPS module
 */
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

/**
 * Basic HTML parsing to extract code sections
 * Note: This is a simplified parser. Real scraping might need a library like cheerio.
 */
function parseCodeSections(html, codeType) {
  const sections = [];
  // This is a placeholder - actual scraping would require proper HTML parsing
  // For now, we'll use the curated list
  console.log(`Parsing ${codeType} codes...`);
  return sections;
}

/**
 * Generate the california-codes.json database
 */
async function generateCodesDatabase() {
  console.log('🚀 California Legal Codes Database Generator');
  console.log('===========================================\n');

  const allCodes = [];

  // Use curated database for now
  console.log('📋 Using curated database of common California codes...');
  console.log(`   - Penal Code (PC): ${CURATED_CODES.filter(c => c.type === 'PC').length} codes`);
  console.log(`   - Vehicle Code (VC): ${CURATED_CODES.filter(c => c.type === 'VC').length} codes`);
  console.log(`   - Health & Safety Code (HSC): ${CURATED_CODES.filter(c => c.type === 'HSC').length} codes`);
  console.log(`   - Total: ${CURATED_CODES.length} codes\n`);

  // Add fullText field to all codes
  const codesWithFullText = CURATED_CODES.map(code => ({
    ...code,
    fullText: `${code.code} - ${code.title}`
  }));

  // Create database structure
  const database = {
    codes: codesWithFullText,
    metadata: {
      lastUpdated: new Date().toISOString().split('T')[0],
      totalCodes: codesWithFullText.length,
      sources: ['PC', 'VC', 'HSC'],
      version: '1.0.0',
      description: 'Curated California legal codes for GTA V roleplay'
    }
  };

  // Write to file
  const outputPath = path.join(__dirname, '..', 'data', 'california-codes.json');
  const outputDir = path.dirname(outputPath);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));

  console.log('✅ Database created successfully!');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB\n`);

  // Print statistics
  console.log('📈 Statistics:');
  console.log(`   - Total codes: ${database.codes.length}`);
  console.log(`   - Penal Code: ${database.codes.filter(c => c.type === 'PC').length}`);
  console.log(`   - Vehicle Code: ${database.codes.filter(c => c.type === 'VC').length}`);
  console.log(`   - Health & Safety: ${database.codes.filter(c => c.type === 'HSC').length}`);

  const categories = [...new Set(database.codes.map(c => c.category))];
  console.log(`   - Categories: ${categories.length}`);
  categories.forEach(cat => {
    const count = database.codes.filter(c => c.category === cat).length;
    console.log(`     • ${cat}: ${count}`);
  });

  console.log('\n✨ Done! You can now use this database in your CAD system.');
}

// Run the generator
if (require.main === module) {
  generateCodesDatabase().catch(console.error);
}

module.exports = { generateCodesDatabase };
