import re

with open('extracted_Module56Live_clean.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix syntax errors (escaped backticks and dollars)
content = content.replace('\\`', '`').replace('\\${', '${')
content = content.replace('const [videoFile, setVideoFile]', 'const [_videoFile, setVideoFile]')
content = content.replace('(p, idx)', '(_, __)')

# Now, swap sections SAFELY
# Let's split on the sections exactly.
# They are inside <main ...>
# <main className="max-w-4xl mx-auto space-y-8 relative">\n
#     <section> SfM </section>
#     <section> Tracking </section>
# </main>

# Let's just find the first <section... and the second <section... 
# Actually, the SfM section contains runSfm
sfm_match = re.search(r'(<section className=\"bg-white p-6 rounded-lg shadow-md\">[\s\S]*?Run sfm_planar\.py\"\}[\s\S]*?</section>)', content)
trk_match = re.search(r'(<section className=\"bg-white p-6 rounded-lg shadow-md\">[\s\S]*?Run validate_tracking\.py\"\}[\s\S]*?</section>)', content)

sfm_code = sfm_match.group(1)
trk_code = trk_match.group(1)

# Modify the titles
new_sfm = sfm_code.replace('1. Structure from Motion (Planar SVD)', '2. Structure from Motion (Planar SVD)')
new_trk = trk_code.replace('2. Tracking Validation (Math vs OpenCV)', '1. Tracking Validation (Math vs OpenCV)')

# Now do the swap using string partitioning to avoid replace matching both
start_sfm = content.find(sfm_code)
end_sfm = start_sfm + len(sfm_code)

start_trk = content.find(trk_code, end_sfm)
end_trk = start_trk + len(trk_code)

if start_sfm != -1 and start_trk != -1:
    new_content = (
        content[:start_sfm] +
        new_trk +
        content[end_sfm:start_trk] +
        new_sfm +
        content[end_trk:]
    )
    
    with open('src/pages/Module56Live.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Successfully rewritten and swapped.")
else:
    print("Could not find sections safely.")

