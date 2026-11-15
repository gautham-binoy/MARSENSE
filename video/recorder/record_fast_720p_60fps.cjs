/**
 * Fast 720p 60FPS Demonstration Recording of MARSENSE Platform
 * Snappy pacing (~10s per feature), visible cursor, HUD badges, covers all 10 features.
 */

const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')
const {
  sleep,
  injectCursor,
  moveCursor,
  clickAt,
  clickSelector,
} = require('./cursor_helper.cjs')

const BASE_URL = 'http://127.0.0.1:5173'
const CLIPS_DIR = path.join(__dirname, '..', 'fast_720p_clips')

fs.mkdirSync(CLIPS_DIR, { recursive: true })

async function injectHud(page) {
  await page.evaluate(() => {
    if (document.getElementById('__marsense_hud')) return

    const hud = document.createElement('div')
    hud.id = '__marsense_hud'
    hud.style.position = 'fixed'
    hud.style.bottom = '16px'
    hud.style.left = '50%'
    hud.style.transform = 'translateX(-50%)'
    hud.style.zIndex = '9999990'
    hud.style.pointerEvents = 'none'
    hud.style.maxWidth = '760px'
    hud.style.width = '88%'
    hud.style.background = 'rgba(7, 10, 18, 0.90)'
    hud.style.backdropFilter = 'blur(14px)'
    hud.style.border = '1px solid rgba(56, 189, 248, 0.4)'
    hud.style.boxShadow = '0 8px 24px rgba(0,0,0,0.8), 0 0 12px rgba(6, 182, 212, 0.2)'
    hud.style.borderRadius = '12px'
    hud.style.padding = '8px 16px'
    hud.style.display = 'flex'
    hud.style.alignItems = 'center'
    hud.style.justifyContent = 'space-between'
    hud.style.gap = '12px'
    hud.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    hud.style.transition = 'all 0.25s ease'

    hud.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
        <div style="width: 8px; height: 8px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 8px #06b6d4; flex-shrink: 0;"></div>
        <div style="display: flex; flex-direction: column; min-width: 0;">
          <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8;" id="__hud_title">MARSENSE FAST DEMO · 720P 60FPS</div>
          <div style="font-size: 12px; font-weight: 500; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="__hud_subtitle">Initializing orbital telemetry and life-support modules...</div>
        </div>
      </div>
      <div style="background: rgba(234, 88, 12, 0.25); border: 1px solid rgba(234, 88, 12, 0.6); color: #fb923c; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; flex-shrink: 0;" id="__hud_badge">60 FPS</div>
    `
    document.body.appendChild(hud)

    window.__updateHud = (title, subtitle, badge = '60 FPS') => {
      const t = document.getElementById('__hud_title')
      const s = document.getElementById('__hud_subtitle')
      const b = document.getElementById('__hud_badge')
      if (t) t.innerText = title
      if (s) s.innerText = subtitle
      if (b) b.innerText = badge
    }
  })
}

async function setHud(page, title, subtitle, badge) {
  try {
    await injectHud(page)
    await page.evaluate(
      ({ t, s, b }) => window.__updateHud && window.__updateHud(t, s, b),
      { t: title, s: subtitle, b: badge }
    )
  } catch (e) {}
}

async function runFastDemo() {
  console.log('=== Launching Chromium for Fast 720p 60FPS Recording ===')

  const browser = await chromium.launch({
    headless: true,
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-gpu-blocklist',
      '--enable-gpu-rasterization',
    ],
  })

  const context = await browser.newContext({
    recordVideo: {
      dir: CLIPS_DIR,
      size: { width: 1280, height: 720 },
    },
    viewport: { width: 1280, height: 720 },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  page.on('domcontentloaded', async () => {
    try {
      await injectCursor(page)
      await injectHud(page)
    } catch (e) {}
  })

  // ----------------------------------------------------
  // SCENE 01: Mission Control & Chronometry (~10s)
  // ----------------------------------------------------
  console.log('\n--- 01: Mission Control & Chronometry ---')
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await injectCursor(page)
  await injectHud(page)
  await setHud(
    page,
    '01/10: MISSION CONTROL & CHRONOMETRY',
    'Allison & McEwen Mars Chronometry · Live Sol, LTST and Perihelion Dust Alert',
    'ORBIT'
  )
  await moveCursor(page, 520, 24, 350) // Mars Chronometry in header
  await sleep(1000)
  await moveCursor(page, 200, 150, 300) // Primary target card
  await sleep(800)
  await clickSelector(page, '[data-testid="mc-fly-jezero"]', 350)
  await sleep(2500) // Fly to Jezero
  await moveCursor(page, 200, 850, 300) // Rover telemetry
  await sleep(800)
  await moveCursor(page, 1100, 150, 300) // Mission Status score ring
  await sleep(1200)

  // ----------------------------------------------------
  // SCENE 02: Mars Explorer & GIS Layers (~10s)
  // ----------------------------------------------------
  console.log('\n--- 02: Mars Explorer & GIS Layers ---')
  await setHud(
    page,
    '02/10: MARS EXPLORER & GIS LAYERS',
    '20m CTX DTM Elevation · CRISM Mineralogy · Point Inspection Horn Slope & Riley TRI',
    'GIS LAYERS'
  )
  await clickSelector(page, 'aside a[href="/explorer"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Layers tab button
  await clickAt(page, 1150, 70, 300)
  await sleep(800)
  // Toggle CTX DTM elevation
  await clickAt(page, 1250, 240, 300)
  await sleep(1200)
  // Click terrain for Horn slope & Riley TRI inspection
  await clickAt(page, 650, 420, 350)
  await sleep(1500)
  // Bookmarks tab & click Delta Scarp
  await clickAt(page, 1220, 70, 300)
  await sleep(600)
  await clickAt(page, 1180, 160, 300)
  await sleep(2000)

  // ----------------------------------------------------
  // SCENE 03: Terrain Intelligence & Transects (~10s)
  // ----------------------------------------------------
  console.log('\n--- 03: Terrain Intelligence & Transects ---')
  await setHud(
    page,
    '03/10: TERRAIN INTELLIGENCE & TRANSECTS',
    'Traversability Index 0.74 · Delta Scarp Transect Profile · 15° Slope Hazard Threshold',
    'TERRAIN'
  )
  await clickSelector(page, 'aside a[href="/terrain"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Delta Scarp preset
  await clickAt(page, 200, 160, 300)
  await sleep(1500)
  // Hover over slope histogram
  await moveCursor(page, 480, 420, 300)
  await sleep(1000)
  // Elevation Transect tool tab
  await clickAt(page, 260, 115, 300)
  await sleep(800)
  // Click two points across scarp
  await clickAt(page, 550, 450, 350)
  await sleep(500)
  await clickAt(page, 800, 520, 350)
  await sleep(1500)
  // Highlight 15 degree slope threshold
  await moveCursor(page, 500, 640, 300)
  await sleep(1000)

  // ----------------------------------------------------
  // SCENE 04: Landing Site & Base Selection (~10s)
  // ----------------------------------------------------
  console.log('\n--- 04: Landing Site & Base Selection ---')
  await setHud(
    page,
    '04/10: LANDING SITE & BASE SELECTION',
    'Multi-Criteria Decision Analysis · Octavia E. Butler vs Delta Front vs Belva Crater',
    'BASE LOCK'
  )
  await clickSelector(page, 'aside a[href="/landing"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Hover candidate sites
  await moveCursor(page, 400, 250, 350)
  await sleep(1000)
  // Adjust Factor Weight slider
  await moveCursor(page, 1150, 280, 300)
  await sleep(1000)
  // Select as Mission Base
  await clickAt(page, 800, 280, 350)
  await sleep(1500)

  // ----------------------------------------------------
  // SCENE 05: Science Discovery & Sample Depot (~10s)
  // ----------------------------------------------------
  console.log('\n--- 05: Science Discovery & Sample Depot ---')
  await setHud(
    page,
    '05/10: SCIENCE DISCOVERY & SAMPLE DEPOT',
    'Curated Mars 2020 Geological Targets · Three Forks MSR Depot (10 Sealed Sample Tubes)',
    'SCIENCE'
  )
  await clickSelector(page, 'aside a[href="/science"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Filter 4-star+ targets
  await clickAt(page, 320, 120, 350)
  await sleep(1200)
  // Three Forks Sample Depot tab
  await clickAt(page, 280, 70, 350)
  await sleep(1000)
  // Select sample tubes
  await clickAt(page, 300, 260, 300)
  await sleep(400)
  await clickAt(page, 300, 360, 300)
  await sleep(400)
  await clickAt(page, 300, 460, 300)
  await sleep(1500)

  // ----------------------------------------------------
  // SCENE 06: Water Resources & ISRU Chemical Plant (~10s)
  // ----------------------------------------------------
  console.log('\n--- 06: Water Resources & ISRU Chemical Plant ---')
  await setHud(
    page,
    '06/10: WATER & ISRU CHEMICAL PLANT',
    'Planetary Ice Reality Check · Smectite Clay Pyrolysis · MOXIE O2 & Sabatier Fuel Synthesis',
    'ISRU PLANT'
  )
  await clickSelector(page, 'aside a[href="/resources"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Hover reality check banner
  await moveCursor(page, 450, 150, 350)
  await sleep(1000)
  // ISRU Chemical Plant tab
  await clickAt(page, 240, 70, 350)
  await sleep(1200)
  // Hover MOXIE and Sabatier synthesizer
  await moveCursor(page, 350, 320, 300)
  await sleep(800)
  await moveCursor(page, 750, 320, 300)
  await sleep(1500)

  // ----------------------------------------------------
  // SCENE 07: Atmospheric & Radiation Dosimetry (~10s)
  // ----------------------------------------------------
  console.log('\n--- 07: Atmospheric & Radiation Dosimetry ---')
  await setHud(
    page,
    '07/10: ENVIRONMENT & RADIATION DOSIMETRY',
    'Perseverance MEDA Diurnal Weather · Curiosity RAD Surface GCR Dosimetry (0.64 mGy/sol)',
    'DOSIMETRY'
  )
  await clickSelector(page, 'aside a[href="/environment"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Hover Perseverance MEDA diurnal curves
  await moveCursor(page, 450, 320, 350)
  await sleep(1200)
  // Hover Curiosity RAD radiation dosimetry & GCR cumulative dose
  await moveCursor(page, 1000, 320, 350)
  await sleep(1500)

  // ----------------------------------------------------
  // SCENE 08: Terrain-Aware Route Planner (~10s)
  // ----------------------------------------------------
  console.log('\n--- 08: Terrain-Aware Route Planner ---')
  await setHud(
    page,
    '08/10: TERRAIN-AWARE ROUTE PLANNER',
    '8-Connected A* Pathfinding · Compare Safest vs Balanced vs Direct · GPX/GeoJSON Export',
    'A* SOLVER'
  )
  await clickSelector(page, 'aside a[href="/routes"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Click Solve Route (A*)
  await clickAt(page, 200, 380, 350)
  await sleep(2200)
  // Compare strategies
  await clickAt(page, 100, 440, 300) // Safest
  await sleep(800)
  await clickAt(page, 200, 440, 300) // Balanced
  await sleep(800)
  await clickAt(page, 300, 440, 300) // Direct
  await sleep(1000)
  // Hover elevation cross-section
  await moveCursor(page, 800, 600, 350)
  await sleep(1500)

  // ----------------------------------------------------
  // SCENE 09: Astronaut Survival Simulator (~10s)
  // ----------------------------------------------------
  console.log('\n--- 09: Astronaut Survival Simulator ---')
  await setHud(
    page,
    '09/10: ASTRONAUT SURVIVAL SIMULATOR',
    'NASA BVAD 2022 5-Consumable Integration · Contingency Tests · 20% Emergency Safety Margin',
    'LIFE SUPPORT'
  )
  await clickSelector(page, 'aside a[href="/survival"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Inspect 5-consumable curves
  await moveCursor(page, 600, 300, 350)
  await sleep(1200)
  // Select contingency scenario
  await clickAt(page, 180, 320, 300)
  await sleep(1500)
  // Hover reserve alerts
  await moveCursor(page, 1100, 350, 350)
  await sleep(1500)

  // ----------------------------------------------------
  // SCENE 10: Mission Assessment, Monte Carlo & Vault (~10s)
  // ----------------------------------------------------
  console.log('\n--- 10: Mission Assessment, Monte Carlo & Vault ---')
  await setHud(
    page,
    '10/10: MISSION ASSESSMENT, MONTE CARLO & VAULT',
    '7-Dimension Scorecard & Hard Safety Caps · 500-Run Monte Carlo Risk Distribution · SQLite Vault',
    'ASSESSMENT'
  )
  await clickSelector(page, 'aside a[href="/assessment"]', 350)
  await sleep(1200)
  await injectCursor(page)
  await injectHud(page)

  // Hover scorecard
  await moveCursor(page, 300, 300, 350)
  await sleep(1200)
  // Run 500-run Monte Carlo
  await clickAt(page, 200, 620, 350)
  await sleep(2200)
  // Open SQLite Mission Vault
  await clickAt(page, 1100, 24, 350)
  await sleep(1500)
  // Close Vault
  await clickAt(page, 950, 180, 300)
  await sleep(800)
  // Hover 1-click PDF mission report button
  await moveCursor(page, 1150, 180, 350)
  await sleep(1500)

  // ----------------------------------------------------
  // Outro (~3s)
  // ----------------------------------------------------
  console.log('\n=== Fast Demo Finished ===')
  await setHud(
    page,
    'MISSION FEASIBILITY VERIFIED',
    'MARSENSE · The Martian Survival Navigator · NASA Space Apps Challenge 2026',
    'COMPLETE'
  )
  await sleep(3000)

  await page.close()
  await context.close()
  await browser.close()
}

runFastDemo().catch((err) => {
  console.error('Fast demo error:', err)
  process.exit(1)
})
