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
