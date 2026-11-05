# Celestial Tracker

An interactive 3D solar-system and deep-space visualisation built with [Three.js](https://threejs.org/). Celestial Tracker combines real-time ephemeris data from the companion [Celestial Tracker API](https://github.com/Moksh44/Celestial-Tracker-API) with a highly visual WebGL interface for exploring planets, the Moon, a pulsar, and a black hole.

## Live application

- **Frontend:** <https://celestial-tracker-three.vercel.app>
- **Backend API:** <https://celestial-tracker-api.onrender.com>
- **API repository:** <https://github.com/Moksh44/Celestial-Tracker-API>

The frontend is configured to use the deployed API above by default.

## Features

- Interactive 3D view of the Sun, eight planets, and the Moon
- Live planetary positions and telemetry calculated from astronomical ephemeris data
- Orbital paths, Moon orbit, planet labels, pointers, poles, grid, and icons
- Inspect mode with:
  - Ecliptic longitude and latitude
  - Orbital distance and velocity
  - Distance from Earth
  - Right ascension, declination, and constellation
  - Light-travel time, phase, elongation, and Earth-specific rotation data
  - Upcoming astronomical events
- Deep Space mode with:
  - Vela pulsar visualisation and live pulse counter
  - Cygnus X-1 black-hole accretion-disc simulation
  - Star-field and hyperspace transition effects
- Adjustable lighting, planet scale, orbit visibility, overlays, auto-rotation, and fullscreen mode
- Responsive interface with adaptive rendering quality for lower-powered devices

## Technology

- HTML, CSS, and vanilla JavaScript
- Three.js `0.160.0`, loaded through an import map from `esm.sh`
- WebGL shaders for the black-hole lensing and accretion-disc effect
- Static astronomy assets, textures, and a star catalogue
- REST API integration with retry handling for a sleeping or restarting backend

## Project structure

```text
.
├── index.html              # Application shell and UI markup
├── main.js                 # Three.js scene, controls, telemetry, and UI logic
├── blackhole.js            # Cygnus X-1 shader-based visualisation
├── styles.css              # Interface styling and responsive layout
├── stars/
│   └── stars_final.json    # Star catalogue used by the sky field
└── textures/               # Planet, Moon, Sun, star, and ring textures
```

## Run locally

This is a static frontend and does not require `npm` or a build step.

### 1. Clone the repository

```bash
git clone https://github.com/Moksh44/Celestial-Tracker.git
cd Celestial-Tracker
```

### 2. Start a local static server

Use a local HTTP server rather than opening `index.html` directly. ES modules, import maps, textures, and JSON assets may not load correctly from `file://`.

```bash
python -m http.server 5500
```

Open <http://localhost:5500>.

The API enables CORS for both `http://localhost:5500` and `http://127.0.0.1:5500`. If you use another port or host, add it to the API's CORS allow-list before making requests.

## Backend connection

The API base URL is defined near the top of `main.js`:

```js
const API_URL = "https://celestial-tracker-api.onrender.com";
```

For local development, change it to:

```js
const API_URL = "http://localhost:5000";
```

Then run the companion API locally by following its [README](https://github.com/Moksh44/Celestial-Tracker-API#run-locally).

## Controls

| Control | Purpose |
| --- | --- |
| Mouse drag / touch drag | Rotate the camera |
| Scroll / pinch | Zoom |
| Settings button | Open visualisation controls |
| Overlays | Toggle pointers, apsis markers, poles, grid, orbits, and icons |
| Planet size | Switch between original and enlarged planet sizes |
| Lighting | Choose shadow, flood, or studio lighting |
| Fullscreen | Toggle fullscreen mode |
| Click a body | Enter inspect mode and open telemetry |
| Rotate | Toggle automatic camera rotation while inspecting |
| Apsis | Show periapsis and apoapsis information for the selected body |
| DS | Enter or leave Deep Space mode |

## Browser requirements

Use a modern browser with WebGL and ES module support enabled. A desktop-class GPU is recommended for the full-resolution star field, post-processing, and black-hole shader. The application automatically reduces rendering quality when performance drops.

## API contract

The frontend calls these backend routes:

| Route | Used for |
| --- | --- |
| `GET /api/orbit/<body>` | Orbit path and apsis data for a planet or the Moon |
| `GET /api/moon/orbit` | Moon orbit path |
| `GET /api/telemetry/<body>` | Current telemetry for one supported body |
| `GET /api/moon/telemetry` | Current Moon telemetry |
| `GET /api/telemetry/batch` | Unified current telemetry for all planets and the Moon |
| `GET /api/next_event/<body>` | Next lunar, seasonal, conjunction, elongation, quadrature, or opposition event |

Supported body names are `mercury`, `venus`, `earth`, `mars`, `jupiter`, `saturn`, `uranus`, `neptune`, and `moon`.

## Troubleshooting

- **Blank page or missing assets:** serve the project over HTTP instead of opening `index.html` directly.
- **API errors while the app loads:** confirm the API health response at <https://celestial-tracker-api.onrender.com/>. The hosted service may need a moment to wake from inactivity.
- **CORS errors locally:** use port `5500`, or update the allow-list in the API repository.
- **Low frame rate:** disable bloom-heavy effects where possible, use the original planet-size preset, or allow the adaptive quality system to reduce resolution.

## Related repository

The astronomy calculations and REST service are maintained separately:

**[Celestial Tracker API →](https://github.com/Moksh44/Celestial-Tracker-API)**

## License

No license file is currently included. Until a license is added, all rights are reserved by the repository owner.
