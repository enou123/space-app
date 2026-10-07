"""Export the app's existing stars/lines for the calibration tool, without changing them."""
import json,re
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/'index.html').read_text()
catalog=json.loads(re.search(r'const CONSTELLATIONS=(\[.*?\]);',html).group(1))
items=json.loads((root/'assets/constellations/index.json').read_text())['items']
by_name={c['jp']:c for c in catalog}
result=[{'code':i['code'],**by_name[i['jp']]} for i in items]
(root/'assets/constellations/catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
