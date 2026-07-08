with open('src/db/db.ts', 'r') as f:
    code = f.read()

migration_logic = """
  if (count === 0) {
    await db.settings.add({
      id: 1,
      company_name: 'AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)',
      company_address: 'Industrial Area, Al Sajaa, Sharjah, United Arab Emirates',
      company_phone: '+971 52 684 3809',
      company_email: 'sales@alzahrabm.com',
      company_website: 'www.alzahrabm.com',
      company_trn: '100259942900003',
      invoice_prefix: 'INV-',
      quotation_prefix: 'QT-',
      currency: 'AED',
      default_vat: 5,
      label_size: '38x21',
      theme: 'light'
    });
  } else {
    // Migration: forcefully update existing settings with the new company info
    await db.settings.update(1, {
      company_name: 'AL Zahra Al Malakia Bldg. Mat. Tr. LLC (Shj. Br.)',
      company_address: 'Industrial Area, Al Sajaa, Sharjah, United Arab Emirates',
      company_phone: '+971 52 684 3809',
      company_email: 'sales@alzahrabm.com',
      company_website: 'www.alzahrabm.com',
      company_trn: '100259942900003'
    });
  }
"""

import re
code = re.sub(r'if \(count === 0\) \{[\s\S]*?\}\s*\}', migration_logic + '}', code)

with open('src/db/db.ts', 'w') as f:
    f.write(code)
