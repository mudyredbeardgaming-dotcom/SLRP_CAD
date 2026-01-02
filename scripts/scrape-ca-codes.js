/**
 * California Legal Codes Scraper - Enhanced Version
 *
 * Generates comprehensive charge data including charge type, bond type, bond amount, and jail time
 *
 * Output: data/california-codes.json
 */

const fs = require('fs');
const path = require('path');

// Helper function to determine charge details based on code and category
function getChargeDetails(code, title, category) {
  const codeStr = code.toLowerCase();
  const titleLower = title.toLowerCase();

  // Determine charge type and details
  let chargeType = 'MISDEMEANOR';
  let bondType = 'CASH BAIL';
  let bondAmount = 5000;
  let jailTime = '1 year';

  // FELONIES - Serious crimes
  if (titleLower.includes('murder') || titleLower.includes('manslaughter') ||
      titleLower.includes('kidnapping') || titleLower.includes('rape') ||
      titleLower.includes('arson') || titleLower.includes('robbery') ||
      titleLower.includes('carjacking') || codeStr.includes('pc 187') ||
      codeStr.includes('pc 192') || codeStr.includes('pc 207') ||
      codeStr.includes('pc 209') || codeStr.includes('pc 211') ||
      codeStr.includes('pc 215') || codeStr.includes('pc 261') ||
      codeStr.includes('pc 451') || titleLower.includes('ransom') ||
      titleLower.includes('drive-by')) {
    chargeType = 'FELONY';
    bondType = 'NO BAIL';
    bondAmount = 0;
    jailTime = '25 years to life';
  }
  else if (titleLower.includes('assault with deadly') || titleLower.includes('shooting at') ||
           titleLower.includes('mayhem') || codeStr.includes('pc 245') ||
           codeStr.includes('pc 246') || codeStr.includes('pc 203') ||
           codeStr.includes('pc 220')) {
    chargeType = 'FELONY';
    bondType = 'CASH BAIL';
    bondAmount = 50000;
    jailTime = '5-10 years';
  }
  else if (titleLower.includes('burglary') || titleLower.includes('grand theft') ||
           titleLower.includes('felon in possession') || titleLower.includes('forgery') ||
           titleLower.includes('embezzlement') || titleLower.includes('identity theft') ||
           codeStr.includes('pc 459') || codeStr.includes('pc 487') ||
           codeStr.includes('pc 29800') || codeStr.includes('pc 470') ||
           codeStr.includes('pc 503') || codeStr.includes('pc 530.5')) {
    chargeType = 'FELONY';
    bondType = 'SURETY BOND';
    bondAmount = 25000;
    jailTime = '2-5 years';
  }
  else if (titleLower.includes('assault on') || titleLower.includes('battery on peace') ||
           titleLower.includes('witness intimidation') || titleLower.includes('gang enhancement') ||
           titleLower.includes('carrying loaded') || codeStr.includes('pc 241') ||
           codeStr.includes('pc 243') || codeStr.includes('pc 136.1') ||
           codeStr.includes('pc 186.22') || codeStr.includes('pc 25850')) {
    chargeType = 'FELONY';
    bondType = 'CASH BAIL';
    bondAmount = 15000;
    jailTime = '1-3 years';
  }
  // MISDEMEANORS - Less serious crimes
  else if (titleLower.includes('assault') || titleLower.includes('battery') ||
           titleLower.includes('brandishing') || titleLower.includes('criminal threats') ||
           titleLower.includes('domestic battery') || titleLower.includes('petty theft') ||
           titleLower.includes('receiving stolen') || titleLower.includes('vandalism') ||
           titleLower.includes('trespassing') || titleLower.includes('resisting') ||
           titleLower.includes('carrying concealed') || codeStr.includes('pc 240') ||
           codeStr.includes('pc 242') || codeStr.includes('pc 417') ||
           codeStr.includes('pc 422') || codeStr.includes('pc 273.5') ||
           codeStr.includes('pc 488') || codeStr.includes('pc 496') ||
           codeStr.includes('pc 594') || codeStr.includes('pc 602') ||
           codeStr.includes('pc 148') || codeStr.includes('pc 25400')) {
    chargeType = 'MISDEMEANOR';
    bondType = 'RECOGNIZANCE RELEASE';
    bondAmount = 2500;
    jailTime = '6 months';
  }
  else if (titleLower.includes('disturbing the peace') || titleLower.includes('false report') ||
           titleLower.includes('prostitution') || titleLower.includes('indecent exposure') ||
           titleLower.includes('public intoxication') || titleLower.includes('disorderly') ||
           codeStr.includes('pc 415') || codeStr.includes('pc 148.5') ||
           codeStr.includes('pc 647(b)') || codeStr.includes('pc 314') ||
           codeStr.includes('pc 647(f)')) {
    chargeType = 'MISDEMEANOR';
    bondType = 'CITATION RELEASE';
    bondAmount = 500;
    jailTime = '90 days';
  }
  // VEHICLE CODE - Mostly infractions with some misdemeanors
  else if (codeStr.includes('vc 23152') || titleLower.includes('dui')) {
    chargeType = 'MISDEMEANOR';
    bondType = 'CASH BAIL';
    bondAmount = 5000;
    jailTime = '6 months';
  }
  else if (codeStr.includes('vc 2800') || titleLower.includes('evading') ||
           titleLower.includes('fleeing')) {
    chargeType = 'FELONY';
    bondType = 'CASH BAIL';
    bondAmount = 10000;
    jailTime = '1-3 years';
  }
  else if (codeStr.includes('vc 10851') || titleLower.includes('vehicle theft') ||
           titleLower.includes('unlawful taking')) {
    chargeType = 'FELONY';
    bondType = 'SURETY BOND';
    bondAmount = 20000;
    jailTime = '2-4 years';
  }
  else if (codeStr.includes('vc 23103') || titleLower.includes('reckless')) {
    chargeType = 'MISDEMEANOR';
    bondType = 'CITATION RELEASE';
    bondAmount = 1000;
    jailTime = '90 days';
  }
  else if (codeStr.startsWith('vc')) {
    chargeType = 'INFRACTION';
    bondType = 'CITATION RELEASE';
    bondAmount = 250;
    jailTime = 'N/A';
  }
  // HEALTH & SAFETY CODE - Drug crimes
  else if (titleLower.includes('possession with intent') || titleLower.includes('sale of') ||
           titleLower.includes('manufacturing') || titleLower.includes('trafficking') ||
           codeStr.includes('hsc 11351') || codeStr.includes('hsc 11352') ||
           codeStr.includes('hsc 11378') || codeStr.includes('hsc 11379')) {
    chargeType = 'FELONY';
    bondType = 'CASH BAIL';
    bondAmount = 30000;
    jailTime = '2-5 years';
  }
  else if (titleLower.includes('possession of controlled') || titleLower.includes('possession of narcotic') ||
           codeStr.includes('hsc 11350') || codeStr.includes('hsc 11377')) {
    chargeType = 'MISDEMEANOR';
    bondType = 'RECOGNIZANCE RELEASE';
    bondAmount = 2000;
    jailTime = '1 year';
  }
  else if (titleLower.includes('possession of marijuana') || titleLower.includes('under the influence') ||
           codeStr.includes('hsc 11357') || codeStr.includes('hsc 11550')) {
    chargeType = 'INFRACTION';
    bondType = 'CITATION RELEASE';
    bondAmount = 100;
    jailTime = 'N/A';
  }

  return { chargeType, bondType, bondAmount, jailTime };
}

// Comprehensive curated list with charge details
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

  // Penal Code - Public Order & Property Crimes
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
  { code: 'PC 31', title: 'Aiding and Abetting', type: 'PC', section: '31', category: 'Obstruction' },
  { code: 'PC 32', title: 'Accessory After the Fact', type: 'PC', section: '32', category: 'Obstruction' },
  { code: 'PC 69', title: 'Resisting Executive Officer', type: 'PC', section: '69', category: 'Obstruction' },
  { code: 'PC 118', title: 'Perjury', type: 'PC', section: '118', category: 'Obstruction' },
  { code: 'PC 136.1', title: 'Witness Intimidation', type: 'PC', section: '136.1', category: 'Obstruction' },
  { code: 'PC 148', title: 'Resisting Arrest', type: 'PC', section: '148', category: 'Obstruction' },
  { code: 'PC 148.5', title: 'False Report to Police', type: 'PC', section: '148.5', category: 'Obstruction' },
  { code: 'PC 182', title: 'Conspiracy', type: 'PC', section: '182', category: 'Obstruction' },
  { code: 'PC 186.22', title: 'Gang Enhancement', type: 'PC', section: '186.22', category: 'Gang Activity' },

  // Penal Code - Sex Offenses
  { code: 'PC 266h', title: 'Pimping', type: 'PC', section: '266h', category: 'Sex Offenses' },
  { code: 'PC 266i', title: 'Pandering', type: 'PC', section: '266i', category: 'Sex Offenses' },
  { code: 'PC 314', title: 'Indecent Exposure', type: 'PC', section: '314', category: 'Sex Offenses' },
  { code: 'PC 647(b)', title: 'Prostitution', type: 'PC', section: '647(b)', category: 'Sex Offenses' },
  { code: 'PC 647(f)', title: 'Public Intoxication', type: 'PC', section: '647(f)', category: 'Public Order' },

  // Vehicle Code - DUI & Serious Offenses
  { code: 'VC 23152(a)', title: 'DUI - Alcohol', type: 'VC', section: '23152(a)', category: 'DUI' },
  { code: 'VC 23152(b)', title: 'DUI - BAC 0.08% or Higher', type: 'VC', section: '23152(b)', category: 'DUI' },
  { code: 'VC 23152(f)', title: 'DUI - Drugs', type: 'VC', section: '23152(f)', category: 'DUI' },
  { code: 'VC 2800.1', title: 'Evading Peace Officer', type: 'VC', section: '2800.1', category: 'Evading' },
  { code: 'VC 2800.2', title: 'Evading with Disregard for Safety', type: 'VC', section: '2800.2', category: 'Evading' },
  { code: 'VC 2800.3', title: 'Evading Causing Injury/Death', type: 'VC', section: '2800.3', category: 'Evading' },
  { code: 'VC 10851', title: 'Vehicle Theft / Unlawful Taking', type: 'VC', section: '10851', category: 'Vehicle Theft' },
  { code: 'VC 23103', title: 'Reckless Driving', type: 'VC', section: '23103', category: 'Reckless Driving' },

  // Vehicle Code - Traffic Infractions
  { code: 'VC 12500', title: 'Unlicensed Driver', type: 'VC', section: '12500', category: 'License Violations' },
  { code: 'VC 14601', title: 'Driving on Suspended License', type: 'VC', section: '14601', category: 'License Violations' },
  { code: 'VC 16028', title: 'Failure to Provide Insurance', type: 'VC', section: '16028', category: 'Insurance Violations' },
  { code: 'VC 21453', title: 'Failure to Stop at Red Light', type: 'VC', section: '21453', category: 'Traffic Violations' },
  { code: 'VC 21461', title: 'Failure to Obey Traffic Device', type: 'VC', section: '21461', category: 'Traffic Violations' },
  { code: 'VC 21650', title: 'Wrong Side of Road', type: 'VC', section: '21650', category: 'Traffic Violations' },
  { code: 'VC 21651', title: 'Driving Over Divided Highway', type: 'VC', section: '21651', category: 'Traffic Violations' },
  { code: 'VC 21750', title: 'Unsafe Passing', type: 'VC', section: '21750', category: 'Traffic Violations' },
  { code: 'VC 21801', title: 'Failure to Yield', type: 'VC', section: '21801', category: 'Traffic Violations' },
  { code: 'VC 22100', title: 'Illegal Turn', type: 'VC', section: '22100', category: 'Traffic Violations' },
  { code: 'VC 22348', title: 'Excessive Speed', type: 'VC', section: '22348', category: 'Speed Violations' },
  { code: 'VC 22349', title: 'Speeding', type: 'VC', section: '22349', category: 'Speed Violations' },
  { code: 'VC 22350', title: 'Unsafe Speed', type: 'VC', section: '22350', category: 'Speed Violations' },
  { code: 'VC 22450', title: 'Failure to Stop at Stop Sign', type: 'VC', section: '22450', category: 'Traffic Violations' },
  { code: 'VC 23109', title: 'Exhibition of Speed / Street Racing', type: 'VC', section: '23109', category: 'Reckless Driving' },
  { code: 'VC 24002', title: 'Unsafe Vehicle', type: 'VC', section: '24002', category: 'Equipment Violations' },
  { code: 'VC 26708', title: 'Obstructed Windshield', type: 'VC', section: '26708', category: 'Equipment Violations' },
  { code: 'VC 27153', title: 'Loud Exhaust', type: 'VC', section: '27153', category: 'Equipment Violations' },
  { code: 'VC 27315', title: 'Child Safety Seat Violation', type: 'VC', section: '27315', category: 'Safety Violations' },
  { code: 'VC 27360', title: 'Seatbelt Violation', type: 'VC', section: '27360', category: 'Safety Violations' },

  // Health & Safety Code - Narcotics
  { code: 'HSC 11350', title: 'Possession of Controlled Substance', type: 'HSC', section: '11350', category: 'Narcotics' },
  { code: 'HSC 11351', title: 'Possession with Intent to Sell', type: 'HSC', section: '11351', category: 'Narcotics' },
  { code: 'HSC 11352', title: 'Sale of Controlled Substance', type: 'HSC', section: '11352', category: 'Narcotics' },
  { code: 'HSC 11357', title: 'Possession of Marijuana', type: 'HSC', section: '11357', category: 'Narcotics' },
  { code: 'HSC 11358', title: 'Cultivation of Marijuana', type: 'HSC', section: '11358', category: 'Narcotics' },
  { code: 'HSC 11359', title: 'Possession of Marijuana for Sale', type: 'HSC', section: '11359', category: 'Narcotics' },
  { code: 'HSC 11360', title: 'Sale of Marijuana', type: 'HSC', section: '11360', category: 'Narcotics' },
  { code: 'HSC 11377', title: 'Possession of Methamphetamine', type: 'HSC', section: '11377', category: 'Narcotics' },
  { code: 'HSC 11378', title: 'Possession of Meth with Intent to Sell', type: 'HSC', section: '11378', category: 'Narcotics' },
  { code: 'HSC 11379', title: 'Sale of Methamphetamine', type: 'HSC', section: '11379', category: 'Narcotics' },
  { code: 'HSC 11550', title: 'Under Influence of Controlled Substance', type: 'HSC', section: '11550', category: 'Narcotics' },
];

// Generate full database with charge details
const codesWithDetails = CURATED_CODES.map(code => {
  const details = getChargeDetails(code.code, code.title, code.category);
  return {
    ...code,
    fullText: `${code.code} - ${code.title}`,
    ...details
  };
});

// Create final database structure
const database = {
  codes: codesWithDetails,
  metadata: {
    lastUpdated: new Date().toISOString().split('T')[0],
    totalCodes: codesWithDetails.length,
    sources: ['PC', 'VC', 'HSC'],
    chargeTypes: ['FELONY', 'MISDEMEANOR', 'INFRACTION', 'WARNING', 'CORRECTABLE'],
    bondTypes: [
      'CITATION RELEASE',
      'RECOGNIZANCE RELEASE',
      'CASH BAIL',
      'SURETY BOND',
      'PROPERTY BOND',
      'FEDERAL BAIL BOND',
      'IMMIGRATION BAIL BOND',
      'NO BAIL',
      'PROBATION'
    ]
  }
};

// Write to file
const outputDir = path.join(__dirname, '..', 'data');
const outputPath = path.join(outputDir, 'california-codes.json');
const publicOutputPath = path.join(__dirname, '..', 'public', 'data', 'california-codes.json');

// Ensure directories exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const publicDataDir = path.join(__dirname, '..', 'public', 'data');
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}

// Write to both locations
fs.writeFileSync(outputPath, JSON.stringify(database, null, 2));
fs.writeFileSync(publicOutputPath, JSON.stringify(database, null, 2));

console.log(`✓ California codes database generated successfully!`);
console.log(`✓ Total codes: ${database.codes.length}`);
console.log(`✓ Output: ${outputPath}`);
console.log(`✓ Public: ${publicOutputPath}`);
console.log(`✓ File size: ${(fs.statSync(outputPath).size / 1024).toFixed(2)} KB`);
