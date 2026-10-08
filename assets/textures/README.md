# Earth color texture

`earth-blue-marble-2048.jpg` is NASA Blue Marble imagery (2048 × 1024),
redistributed unchanged from NASA WorldWind's WebWorldWind repository:

https://github.com/NASAWorldWind/WebWorldWind/blob/develop/images/BMNG_world.topo.bathy.200405.3.2048x1024.jpg

Downloaded on 2026-10-04. This is a static composite with topography and bathymetry,
not live satellite imagery. The shader uses the land colors and a separate
land/ocean mask to avoid displaying bathymetric relief on the ocean surface.
Clouds, lighting, and rotation are rendered separately.

Upstream copyright notice:
Copyright 2003-2006, 2009, 2017, 2020, 2022 United States Government, as represented
by the Administrator of the National Aeronautics and Space Administration.
All rights reserved.

Upstream licensing: Apache License 2.0, as stated at
https://github.com/NASAWorldWind/WebWorldWind#license
A copy is included in `LICENSE-Apache-2.0.txt`.

## Optional 4096 / 8192 textures

`earth-blue-marble-4096.jpg` and `earth-blue-marble-8192.jpg` are Lanczos
downsamples of NASA Blue Marble Next Generation's December 2004 composite,
`world.topo.bathy.200412.3x21600x10800.jpg` (21600 × 10800).
Credit: NASA Earth Observatory / Reto Stöckli (NASA GSFC).
NASA's public media imagery may be used under its media usage guidelines;
no NASA endorsement or NASA logo is implied.

Original collection: https://visibleearth.nasa.gov/collection/1484/blue-marble
Media guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

Because the managed environment cannot access the NASA image host directly,
the source was obtained on 2026-10-08 from this pinned distribution mirror:

https://github.com/stdcout1/airline3d/blob/7d261a4066f8600d808fbe274d6234267619015f/airports/world.topo.bathy.200412.3x21600x10800.jpg

Source SHA-256: `3006c58b1272362db0a8c2df02dc07cea4b12dfe820b7dc4a159a075caf5d4d4`.
The source filename, geographic content and dimensions match BMNG. A byte
comparison with NASA's direct original host has not been verified in this environment.
The optional images are December composites; the retained 2048 image is May.
Neither is a live photograph or an accurate depiction of current clouds, ice or seasons.
The app retains its original land/ocean mask, rotation, day/night and atmosphere shaders.

Reproduce using Pillow:

```
python3 scripts/build-earth-textures.py /path/to/world.topo.bathy.200412.3x21600x10800.jpg
```

Generated SHA-256 hashes:

- 4096: `8bf1e331a1c94c1a74c3e7d21735c8b98c86a6873bbe348fe85a7655009b2135`
- 8192: `d66a7f08867b3c880f96b16f6886b709b179a7aa71db9f9c99481ebeaa2e3ffc`

Automatic selection keeps 2048 for normal scenes, and selects up to 4096 near
Earth at true scale / ISS. Lite mode stays at 2048. 8192 is an explicit option
restricted by GPU texture size, available memory and reported CPU cores; mobile
devices stay at 4096 or lower. GPU capability reporting is a conservative heuristic,
not a frame-rate benchmark. Images are loaded only when selected. The original
texture is kept as a fallback; a failed download or GL upload restores it. Only
one optional GPU texture is retained, and it is released on return to the base.
