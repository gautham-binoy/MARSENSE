/**
 * MARSENSE Live Automated Demonstration for Manual OBS Recording
 * Displays countdown for OBS start, dynamic live HUD subtitles, smooth glowing cursor,
 * and walks through every single feature of the platform.
 */

const { chromium } = require('playwright')
const {
  sleep,
  injectCursor,
  moveCursor,
  clickAt,
  clickSelector,
  hoverSelector,
} = require('./cursor_helper.cjs')

const BASE_URL = 'http://127.0.0.1:5173'

async function injectHud(page) {
  await page.evaluate(() => {
    if (document.getElementById('__marsense_hud')) return

    const hud = document.createElement('div')
    hud.id = '__marsense_hud'
    hud.style.position = 'fixed'
    hud.style.bottom = '20px'
    hud.style.left = '50%'
    hud.style.transform = 'translateX(-50%)'
    hud.style.zIndex = '9999990'
    hud.style.pointerEvents = 'none'
    hud.style.maxWidth = '880px'
    hud.style.width = '90%'
    hud.style.background = 'rgba(7, 10, 18, 0.88)'
    hud.style.backdropFilter = 'blur(16px)'
    hud.style.border = '1px solid rgba(56, 189, 248, 0.4)'
    hud.style.boxShadow = '0 10px 30px rgba(0,0,0,0.8), 0 0 15px rgba(6, 182, 212, 0.2)'
    hud.style.borderRadius = '14px'
    hud.style.padding = '10px 20px'
    hud.style.display = 'flex'
    hud.style.alignItems = 'center'
    hud.style.justifyContent = 'space-between'
    hud.style.gap = '16px'
    hud.style.fontFamily = 'system-ui, -apple-system, sans-serif'
    hud.style.transition = 'all 0.3s ease'

    hud.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
        <div style="width: 10px; height: 10px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 8px #06b6d4; flex-shrink: 0;" id="__hud_dot"></div>
        <div style="display: flex; flex-direction: column; min-width: 0;">
          <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #38bdf8;" id="__hud_title">MARSENSE MISSION BRIEFING</div>
          <div style="font-size: 13.5px; font-weight: 500; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" id="__hud_subtitle">Initializing orbital telemetry and life-support modules...</div>
        </div>
      </div>
      <div style="background: rgba(234, 88, 12, 0.2); border: 1px solid rgba(234, 88, 12, 0.5); color: #fb923c; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 8px; flex-shrink: 0;" id="__hud_badge">SOL 2038</div>
    `
    document.body.appendChild(hud)

    window.__updateHud = (title, subtitle, badge = 'DEMO') => {
      const t = document.getElementById('__hud_title')
      const s = document.getElementById('__hud_subtitle')
      const b = document.getElementById('__hud_badge')
      if (t) t.innerText = title
      if (s) s.innerText = subtitle
      if (b) b.innerText = badge
    }
  })
}

async function showCountdown(page, seconds = 12) {
  await page.evaluate(async (sec) => {
    const overlay = document.createElement('div')
    overlay.id = '__countdown_overlay'
    overlay.style.position = 'fixed'
    overlay.style.inset = '0'
    overlay.style.background = 'rgba(5, 7, 13, 0.88)'
    overlay.style.backdropFilter = 'blur(12px)'
    overlay.style.zIndex = '99999999'
    overlay.style.display = 'flex'
    overlay.style.flexDirection = 'column'
    overlay.style.alignItems = 'center'
    overlay.style.justifyContent = 'center'
    overlay.style.fontFamily = 'system-ui, sans-serif'
    overlay.style.color = '#ffffff'
    overlay.style.textAlign = 'center'
    overlay.style.pointerEvents = 'none'

    overlay.innerHTML = `
      <div style="border: 1px solid rgba(56, 189, 248, 0.4); background: rgba(15, 23, 42, 0.7); padding: 32px 50px; border-radius: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.9);">
        <div style="font-size: 14px; font-weight: 800; letter-spacing: 0.2em; color: #38bdf8; margin-bottom: 8px;">NASA SPACE APPS CHALLENGE 2026</div>
        <div style="font-size: 42px; font-weight: 900; letter-spacing: 0.1em; color: #ea580c; margin-bottom: 6px;">M A R S E N S E</div>
        <div style="font-size: 18px; color: #94a3b8; margin-bottom: 24px;">The Martian Survival Navigator · Full Live Demonstration</div>
        
        <div style="background: rgba(234, 88, 12, 0.15); border: 1px solid #ea580c; border-radius: 12px; padding: 14px 28px; margin-bottom: 24px;">
          <div style="font-size: 14px; font-weight: 700; color: #fb923c; text-transform: uppercase; letter-spacing: 0.08em;">▶ PLEASE START OBS RECORDING NOW ◀</div>
          <div style="font-size: 12.5px; color: #cbd5e1; margin-top: 4px;">Press Start Recording in OBS Studio to capture this session</div>
        </div>

        <div style="display: flex; align-items: baseline; justify-content: center; gap: 8px;">
          <span style="font-size: 16px; color: #94a3b8;">Demonstration begins in:</span>
          <span style="font-size: 48px; font-weight: 900; color: #38bdf8; font-family: monospace;" id="__countdown_val">${sec}</span>
          <span style="font-size: 16px; color: #94a3b8;">seconds</span>
        </div>
      </div>
    `
    document.body.appendChild(overlay)

    for (let c = sec; c >= 1; c--) {
      const el = document.getElementById('__countdown_val')
      if (el) el.innerText = String(c)
      await new Promise((r) => setTimeout(r, 1000))
    }

    overlay.style.transition = 'opacity 0.6s ease'
    overlay.style.opacity = '0'
    setTimeout(() => overlay.remove(), 700)
  }, seconds)

  await sleep(seconds * 1000 + 800)
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

async function runLiveDemo() {
  console.log('=== Opening Visible Browser Window on Desktop for OBS Recording ===')

  const browser = await chromium.launch({
    headless: false,
    executablePath: '/usr/bin/chromium',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--start-maximized',
      '--window-size=1920,1080',
      '--disable-infobars',
      '--no-first-run',
      '--enable-gpu-rasterization',
      '--ignore-gpu-blocklist',
    ],
  })

  const context = await browser.newContext({
    viewport: null, // use full maximized window dimensions
  })

  const page = await context.newPage()
  page.setDefaultTimeout(20000)

  page.on('domcontentloaded', async () => {
    try {
      await injectCursor(page)
      await injectHud(page)
    } catch (e) {}
  })

  // Load home page
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await injectCursor(page)
  await injectHud(page)

  // 12-second countdown for the user to hit Start Recording in OBS Studio
  console.log('Showing OBS Start Recording countdown on screen (12 seconds)...')
  await showCountdown(page, 12)

  // ==========================================
  // SCENE 01: Mission Control & Chronometry
  // ==========================================
  console.log('--- SCENE 01: Mission Control & Chronometry ---')
  await setHud(
    page,
    'FEATURE 01/10: MISSION CONTROL & CHRONOMETRY',
    'Allison & McEwen Mars Chronometry · Live Sol, LTST and Perihelion Dust Storm Alert',
    'SCENE 01'
  )
  await sleep(1500)

  // Hover over Mars Chronometry pill in top bar
  await moveCursor(page, 720, 24, 700)
  await sleep(2500)

  // Hover over Jezero Crater HUD
  await moveCursor(page, 200, 150, 700)
  await sleep(2000)

  // Click Fly to Jezero button
  await clickSelector(page, '[data-testid="mc-fly-jezero"]', 600)
  await sleep(4500) // Watch camera swoop into high-res Jezero Crater

  // Hover over Perseverance & Curiosity telemetry cards
  await moveCursor(page, 200, 900, 700)
  await sleep(2000)
  await moveCursor(page, 200, 950, 500)
  await sleep(2000)

  // Hover over Mission Status score ring and warning feed
  await moveCursor(page, 1600, 180, 800)
  await sleep(2000)
  await moveCursor(page, 1600, 400, 600)
  await sleep(2500)

  // ==========================================
  // SCENE 02: Mars Explorer & GIS Layers
  // ==========================================
  console.log('--- SCENE 02: Mars Explorer & GIS Layers ---')
  await setHud(
    page,
    'FEATURE 02/10: MARS EXPLORER & GIS LAYERS',
    '20m CTX DTM Elevation · CRISM Mineral Spectroscopy · Horn Slope & Riley TRI Inspection',
    'SCENE 02'
  )
  await clickSelector(page, 'aside a[href="/explorer"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Switch to Layers tab on right panel
  await clickAt(page, 1720, 70, 500)
  await sleep(2000)

  // Toggle 20m CTX DTM elevation layer
  await clickAt(page, 1860, 240, 500)
  await sleep(2500)

  // Click on the crater terrain to inspect Horn slope and Riley TRI
  await clickAt(page, 1000, 550, 800)
  await sleep(3500)

  // Switch to Bookmarks tab
  await clickAt(page, 1820, 70, 500)
  await sleep(2000)
  // Click Delta Scarp bookmark
  await clickAt(page, 1750, 160, 600)
  await sleep(4000)

  // ==========================================
  // SCENE 03: Terrain Intelligence & Transects
  // ==========================================
  console.log('--- SCENE 03: Terrain Intelligence & Transects ---')
  await setHud(
    page,
    'FEATURE 03/10: TERRAIN INTELLIGENCE & TRANSECTS',
    'Traversability Index 0.74 · Delta Scarp Transect Cross-Section · 15° Rover Rollover Threshold',
    'SCENE 03'
  )
  await clickSelector(page, 'aside a[href="/terrain"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Click Delta Scarp preset button
  await clickAt(page, 200, 160, 600)
  await sleep(3000)

  // Hover over slope histogram & traversability gauge
  await moveCursor(page, 600, 450, 700)
  await sleep(2500)

  // Switch to Elevation Transect tab
  await clickAt(page, 260, 115, 600)
  await sleep(2000)

  // Click two endpoints across the delta front
  await clickAt(page, 800, 500, 700)
  await sleep(1200)
  await clickAt(page, 1100, 600, 700)
  await sleep(3500)

  // Hover over 15 degree slope hazard threshold line
  await moveCursor(page, 700, 850, 700)
  await sleep(2500)

  // ==========================================
  // SCENE 04: Landing Site & Base Selection
  // ==========================================
  console.log('--- SCENE 04: Landing Site & Base Selection ---')
  await setHud(
    page,
    'FEATURE 04/10: LANDING SITE & BASE SELECTION',
    'Multi-Criteria Decision Analysis · Octavia E. Butler vs Delta Front vs Belva Crater',
    'SCENE 04'
  )
  await clickSelector(page, 'aside a[href="/landing"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Inspect landing candidate sites
  await moveCursor(page, 450, 300, 700)
  await sleep(2000)

  // Adjust weighting factor sliders
  await moveCursor(page, 1650, 350, 600)
  await sleep(2000)

  // Click Select as Mission Base on Octavia E. Butler Landing
  await clickAt(page, 1050, 350, 700)
  await sleep(3000)

  // ==========================================
  // SCENE 05: Planetary Science Discovery & Sample Depot
  // ==========================================
  console.log('--- SCENE 05: Planetary Science Discovery & Sample Depot ---')
  await setHud(
    page,
    'FEATURE 05/10: SCIENCE DISCOVERY & SAMPLE DEPOT',
    'Curated Mars 2020 Geological Targets · Three Forks MSR Depot (10 Authentic Sample Tubes)',
    'SCENE 05'
  )
  await clickSelector(page, 'aside a[href="/science"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Filter 4-star+ targets
  await clickAt(page, 320, 120, 600)
  await sleep(2500)

  // Switch to Three Forks Sample Depot tab
  await clickAt(page, 280, 70, 600)
  await sleep(2500)

  // Inspect sample tubes and select 3 into mission payload
  await clickAt(page, 300, 260, 500)
  await sleep(1000)
  await clickAt(page, 300, 360, 500)
  await sleep(1000)
  await clickAt(page, 300, 460, 500)
  await sleep(3000)

  // ==========================================
  // SCENE 06: Water Resources & ISRU Chemical Plant
  // ==========================================
  console.log('--- SCENE 06: Water Resources & ISRU Chemical Plant ---')
  await setHud(
    page,
    'FEATURE 06/10: WATER & ISRU CHEMICAL PLANT',
    'Planetary Ice Honesty Disclosure · Smectite Clay Pyrolysis · MOXIE O2 & Sabatier Propellant',
    'SCENE 06'
  )
  await clickSelector(page, 'aside a[href="/resources"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Hover over reality check banner
  await moveCursor(page, 500, 150, 800)
  await sleep(2500)

  // Switch to ISRU Chemical Plant tab
  await clickAt(page, 240, 70, 600)
  await sleep(2500)

  // Hover over MOXIE O2 and Sabatier synthesizer
  await moveCursor(page, 400, 350, 700)
  await sleep(2000)
  await moveCursor(page, 950, 350, 700)
  await sleep(3000)

  // ==========================================
  // SCENE 07: Atmospheric & Radiation Dosimetry
  // ==========================================
  console.log('--- SCENE 07: Atmospheric & Radiation Dosimetry ---')
  await setHud(
    page,
    'FEATURE 07/10: ENVIRONMENT & RADIATION DOSIMETRY',
    'Perseverance MEDA Diurnal Weather · Curiosity RAD Surface GCR Dosimetry (0.64 mGy/sol)',
    'SCENE 07'
  )
  await clickSelector(page, 'aside a[href="/environment"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Hover over Perseverance MEDA diurnal curves
  await moveCursor(page, 550, 380, 800)
  await sleep(3000)

  // Hover over Curiosity RAD radiation dosimetry & GCR cumulative dose
  await moveCursor(page, 1400, 380, 800)
  await sleep(3500)

  // ==========================================
  // SCENE 08: Terrain-Aware Route Planner
  // ==========================================
  console.log('--- SCENE 08: Terrain-Aware Route Planner ---')
  await setHud(
    page,
    'FEATURE 08/10: TERRAIN-AWARE ROUTE PLANNER',
    '8-Connected A* Pathfinding · Strategy Comparison: Safest vs Balanced vs Direct · GPX/GeoJSON',
    'SCENE 08'
  )
  await clickSelector(page, 'aside a[href="/routes"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Click Solve Route (A*)
  await clickAt(page, 200, 420, 700)
  await sleep(4000)

  // Compare strategies: Safest, Balanced, Direct
  await clickAt(page, 100, 480, 600)
  await sleep(2000)
  await clickAt(page, 200, 480, 600)
  await sleep(2000)
  await clickAt(page, 300, 480, 600)
  await sleep(2500)

  // Hover over elevation cross-section and hazard segments
  await moveCursor(page, 1100, 850, 800)
  await sleep(3000)

  // ==========================================
  // SCENE 09: Astronaut Survival Simulator
  // ==========================================
  console.log('--- SCENE 09: Astronaut Survival Simulator ---')
  await setHud(
    page,
    'FEATURE 09/10: ASTRONAUT SURVIVAL SIMULATOR',
    'NASA BVAD 2022 5-Consumable Integration · Contingency Scenarios · 20% Emergency Reserve Margin',
    'SCENE 09'
  )
  await clickSelector(page, 'aside a[href="/survival"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Inspect 5-consumable curves
  await moveCursor(page, 800, 350, 800)
  await sleep(3000)

  // Select contingency scenario
  await clickAt(page, 180, 350, 600)
  await sleep(3000)

  // Hover over emergency reserve alerts
  await moveCursor(page, 1550, 400, 800)
  await sleep(3000)

  // ==========================================
  // SCENE 10: Mission Assessment, Monte Carlo & Vault
  // ==========================================
  console.log('--- SCENE 10: Mission Assessment, Monte Carlo & Vault ---')
  await setHud(
    page,
    'FEATURE 10/10: MISSION ASSESSMENT, MONTE CARLO & VAULT',
    '7-Dimension Scorecard & Hard Safety Caps · 500-Run Monte Carlo Risk Distribution · SQLite Vault',
    'SCENE 10'
  )
  await clickSelector(page, 'aside a[href="/assessment"]', 700)
  await sleep(2500)
  await injectCursor(page)
  await injectHud(page)

  // Hover over 7-dimension scorecard and safety capping rules
  await moveCursor(page, 350, 350, 800)
  await sleep(3000)

  // Run 500-iteration Monte Carlo simulation
  await clickAt(page, 200, 750, 700)
  await sleep(4000)

  // Open SQLite Mission Vault modal
  await clickAt(page, 1720, 24, 700)
  await sleep(3000)

  // Close Vault modal
  await clickAt(page, 1350, 220, 600)
  await sleep(1500)

  // Hover over 1-click PDF mission report button
  await moveCursor(page, 1600, 220, 700)
  await sleep(3000)

  // ==========================================
  // COMPLETION
  // ==========================================
  console.log('=== Demonstration Complete ===')
  await setHud(
    page,
    'DEMONSTRATION COMPLETE',
    'Mission Feasibility Verified · You may now Stop Recording in OBS Studio',
    'DONE'
  )
  await sleep(15000) // Keep open for 15 seconds so OBS recording doesn't cut off abruptly

  await page.close()
  await context.close()
  await browser.close()
}

runLiveDemo().catch((err) => {
  console.error('Demo error:', err)
  process.exit(1)
})
