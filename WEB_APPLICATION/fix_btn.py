import re
import sys

with open('src/pages/Module56Live.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

pattern = r'\{trackingPoint && \(\s*<div className="text-center mt-6">\s*<button \s*onClick=\{runTracking\} \s*disabled=\{isProcessingTracking\}\s*className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium shadow disabled:bg-gray-400"\s*>\s*\{isProcessingTracking \? "Calculating Tracking Matrices\.\.\." : "Run validate_tracking\.py"\}\s*</button>\s*</div>\s*\)\}'

replacement = '''<div className="text-center mt-6 flex flex-col items-center">
                      {!trackingPoint && (
                        <p className="text-sm text-red-500 mb-2 font-semibold">Please pause the video and click on the object to track before running.</p>
                      )}
                      <button 
                        onClick={runTracking} 
                        disabled={isProcessingTracking || !trackingPoint}
                        className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium shadow disabled:bg-gray-400"
                      >
                        {isProcessingTracking ? "Calculating Tracking Matrices..." : "Run validate_tracking.py"}
                      </button>
                    </div>'''

if re.search(pattern, content):
    content = re.sub(pattern, replacement, content)
    with open('src/pages/Module56Live.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Replaced successfully')
else:
    print('Pattern not found')

