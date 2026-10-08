import json
import sys

with open(r'C:\Users\samue\.gemini\antigravity\brain\6641a681-8745-4ba9-a9b2-e11520176fde\.system_generated\logs\transcript_full.jsonl', 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get('type') == 'PLANNER_RESPONSE':
                for tool in data.get('tool_calls', []):
                    if tool.get('name') == 'write_to_file' and 'Module56Live.tsx' in tool.get('args', {}).get('TargetFile', ''):
                        with open('extracted_Module56Live_clean.tsx', 'w', encoding='utf-8') as out:
                            out.write(tool['args']['CodeContent'])
                        print('Extracted successfully')
                        sys.exit(0)
        except Exception as e:
            pass

