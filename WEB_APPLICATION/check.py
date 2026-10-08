import re
with open('src/pages/Module56Live.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# I will find the last occurrence of the tracking section and delete it
# The tracking section starts with <section className="bg-white p-6 rounded-lg shadow-md">\n              <h3 className="text-2xl font-bold mb-4">2. Tracking Validation (Math vs OpenCV)</h3>

# Actually, the file was corrupted by:
# content = content.replace(sfm_code, '###TEMP_SFM###')
# content = content.replace(trk_code, new_sfm_code)
# content = content.replace('###TEMP_SFM###', new_trk_code)

# Since `sfm_code` and `trk_code` were matched using non-greedy `[\s\S]*?</section>`, let's see what the sections are now.
matches = re.finditer(r'<section className="bg-white p-6 rounded-lg shadow-md">.*?</section>', content, re.DOTALL)
sections = [m.group(0) for m in matches]
print("Found", len(sections), "sections")
for i, s in enumerate(sections):
    print("Section", i, s[:150])


