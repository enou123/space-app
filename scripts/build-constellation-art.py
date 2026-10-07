"""Build transparent WebP app textures from the approved PNG originals.
Usage: python scripts/build-constellation-art.py /path/to/constellation-set
Requires Pillow. Original images are never modified.
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
assets = root / 'assets/constellations'
source = Path(sys.argv[1])
layout = json.loads((assets / 'layout.json').read_text())
items = []
for item in layout['items']:
    png = source / item['sourceFile']
    with Image.open(png) as image:
        assert image.mode == 'RGBA' and image.size == (1254, 1254), png
        assert image.getextrema()[3][0] == 0, png
        entry = dict(item)
        entry['sourceSha256'] = hashlib.sha256(png.read_bytes()).hexdigest()
        for level, size in [('full', 1254), ('mobile', 768)]:
            target = assets / ('mobile' if level == 'mobile' else '') / (png.stem + '.webp')
            target.parent.mkdir(exist_ok=True)
            resized = image.copy()
            resized.thumbnail((size, size), Image.Resampling.LANCZOS)
            resized.save(target, format='WEBP', quality=88, method=2)
            entry['mobileFile' if level == 'mobile' else 'file'] = str(target.relative_to(assets))
            entry['mobileSha256' if level == 'mobile' else 'sha256'] = hashlib.sha256(target.read_bytes()).hexdigest()
        items.append(entry)
(assets / 'index.json').write_text(json.dumps({'version': layout.get('version', 'blue-nebula-v1'), 'illustrator': 'AI-generated artwork directed by the project owner', 'placement': layout['placement'], 'items': items}, ensure_ascii=False, indent=2) + '\n')
print(f'Built {len(items)} full and mobile textures')
