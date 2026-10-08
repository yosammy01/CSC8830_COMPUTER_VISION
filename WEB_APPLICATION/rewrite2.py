import re

with open('extracted_Module56Live_clean.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix syntax errors (escaped backticks and dollars)
content = content.replace('\\`', '`').replace('\\${', '${')
content = content.replace('const [videoFile, setVideoFile]', 'const [_videoFile, setVideoFile]')
content = content.replace('(p, idx)', '(_, __)')

matches = list(re.finditer(r'<section className="bg-white p-6 rounded-lg shadow-md">', content))
if len(matches) >= 2:
    start_sfm = matches[0].start()
    end_sfm = content.find('</section>', start_sfm) + len('</section>')
    sfm_code = content[start_sfm:end_sfm]

    start_trk = matches[1].start()
    end_trk = content.find('</section>', start_trk) + len('</section>')
    trk_code = content[start_trk:end_trk]
    
    new_sfm = sfm_code.replace('1. Structure from Motion (Planar SVD)', '2. Structure from Motion (Planar SVD)')
    new_trk = trk_code.replace('2. Tracking Validation (Math vs OpenCV)', '1. Tracking Validation (Math vs OpenCV)')
    
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

