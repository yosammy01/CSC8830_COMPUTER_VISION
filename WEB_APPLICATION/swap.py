import re

with open('src/pages/Module56Live.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The first section is SfM:
sfm_match = re.search(r'(<section className="bg-white p-6 rounded-lg shadow-md">[\s\S]*?<h3 className="text-2xl font-bold mb-4">1\. Structure from Motion \(Planar SVD\)</h3>[\s\S]*?</section>)', content)
sfm_code = sfm_match.group(1)

# The second section is Tracking:
trk_match = re.search(r'(<section className="bg-white p-6 rounded-lg shadow-md">[\s\S]*?<h3 className="text-2xl font-bold mb-4">2\. Tracking Validation \(Math vs OpenCV\)</h3>[\s\S]*?</section>)', content)
trk_code = trk_match.group(1)

if not sfm_code or not trk_code:
    print('Error finding sections')
    exit(1)

# Modify titles
new_sfm_code = sfm_code.replace('1. Structure from Motion', '2. Structure from Motion')
new_trk_code = trk_code.replace('2. Tracking Validation', '1. Tracking Validation')

# Swap in the file
content = content.replace(sfm_code, '###TEMP_SFM###')
content = content.replace(trk_code, new_sfm_code)
content = content.replace('###TEMP_SFM###', new_trk_code)

with open('src/pages/Module56Live.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('Successfully swapped sections.')

