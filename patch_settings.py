import re

with open('src/pages/Settings.tsx', 'r') as f:
    code = f.read()

website_field = """                  <Input value={settings?.company_email || ''} onChange={e => updateField('company_email', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Website</label>
                  <Input value={settings?.company_website || ''} onChange={e => updateField('company_website', e.target.value)} />
                </div>"""

code = code.replace("                  <Input value={settings?.company_email || ''} onChange={e => updateField('company_email', e.target.value)} />\n                </div>", website_field)

with open('src/pages/Settings.tsx', 'w') as f:
    f.write(code)
