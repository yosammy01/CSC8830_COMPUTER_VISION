import re

with open('src/pages/Module56Live.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the tracking point button
content = content.replace('disabled={isProcessingTracking || !trackingPoint}', 'disabled={isProcessingTracking}')

msg_block = '''{!trackingPoint && (
                        <p className="text-sm text-red-500 mb-2 font-semibold">Please pause the video and click on the object to track before running.</p>
                      )}'''
content = content.replace(msg_block, '')

# Fix the customProcess script string
old_script = '''    x_orig, y_orig = ${trackingPoint.x}, ${trackingPoint.y}
    point_orig = (x_orig, y_orig)'''

new_script = '''    x_orig = ${trackingPoint ? trackingPoint.x : 'frame1.shape[1]//2'}
    y_orig = ${trackingPoint ? trackingPoint.y : 'frame1.shape[0]//2'}
    point_orig = (int(x_orig), int(y_orig))'''

content = content.replace(old_script, new_script)

with open('src/pages/Module56Live.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

