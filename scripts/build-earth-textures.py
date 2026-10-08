"""Resize NASA BMNG 21600 x 10800 source into same-origin power-of-two textures.

Usage: python3 scripts/build-earth-textures.py /path/to/world.topo.bathy.200412.3x21600x10800.jpg
Requires Pillow. Source/attribution and hashes: assets/textures/README.md.
The existing 2048 image is deliberately retained unchanged.
"""
import hashlib
import sys
from pathlib import Path
from PIL import Image

Image.MAX_IMAGE_PIXELS = 300_000_000
source = Path(sys.argv[1])
assert hashlib.sha256(source.read_bytes()).hexdigest() == '3006c58b1272362db0a8c2df02dc07cea4b12dfe820b7dc4a159a075caf5d4d4'
image = Image.open(source).convert('RGB')
assert image.size == (21600, 10800)
for width in (4096, 8192):
    dest = Path(__file__).resolve().parents[1] / 'assets' / 'textures' / f'earth-blue-marble-{width}.jpg'
    image.resize((width, width // 2), Image.Resampling.LANCZOS).save(dest, quality=90, subsampling=0, optimize=True)
    print(dest.name, dest.stat().st_size, hashlib.sha256(dest.read_bytes()).hexdigest())
