import re
with open('src/pages/Module56Live.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('\\`', '`').replace('\\${', '${')

with open('src/pages/Module56Live.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

