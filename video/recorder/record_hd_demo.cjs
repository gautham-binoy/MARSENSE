/**
 * High-Definition Screen Recording of MARSENSE Platform
 * Records all 10 features with realistic human cursor simulation and visual feedback.
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
  hoverSelector,
} = require('./cursor_helper.cjs')

const BASE_URL = 'http://127.0.0.1:5173'
const CLIPS_DIR = path.join(__dirname, '..', 'hd_clips')

fs.mkdirSync(CLIPS_DIR, { recursive: true })

async function runDemo() {
  console.log('=== Launching Chromium for HD MARSENSE Recording ===')

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
      size: { width: 1920, height: 1080 },
    },
    viewport: { width: 1920, height: 1080 },
  })

  const page = await context.newPage()
  page.setDefaultTimeout(15000)

  // Auto re-inject cursor on navigation
  page.on('domcontentloaded', async () => {
    try {
      await injectCursor(page)
    } catch (e) {}
  })

  console.log('\n--- SCENE 01: Mission Control & Chronometry ---')
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
  await injectCursor(page)
  await sleep(1500)

  // Hover over Mars Chronometry pill in top bar
  await moveCursor(page, 720, 24, 700)
  await sleep(2000)

  // Hover over Jezero Crater card
  await moveCursor(page, 200, 150, 600)
  await sleep(1500)

  // Click Fly to Jezero
  await clickSelector(page, '[data-testid="mc-fly-jezero"]', 500)
  await sleep(4000) // Watch camera swoop down into Jezero Crater with CTX mosaic!

  // Hover over Rover telemetry cards
  await moveCursor(page, 200, 900, 700)
  await sleep(1500)
  await moveCursor(page, 200, 950, 500)
  await sleep(1500)

  // Hover over Mission Status card & ScoreRing on right
  await moveCursor(page, 1600, 180, 800)
  await sleep(2000)

  console.log('\n--- SCENE 02: Mars Explorer & GIS Layers ---')
  await clickSelector(page, 'aside a[href="/explorer"]', 600)
  await sleep(2500)
  await injectCursor(page)

  // Switch to Layers tab on right panel
  await clickAt(page, 1720, 70, 500) // Layers tab button
  await sleep(1500)

  // Toggle CTX DTM elevation layer
  await clickAt(page, 1860, 240, 500)
  await sleep(2000)

  // Click on the Mars terrain to inspect Horn slope and Riley TRI
  await clickAt(page, 1000, 550, 700)
  await sleep(3000)

  // Switch to Bookmarks tab
  await clickAt(page, 1820, 70, 500)
  await sleep(1500)
  // Click Delta Scarp bookmark
  await clickAt(page, 1750, 160, 500)
  await sleep(3500)

  console.log('\n--- SCENE 03: Terrain Intelligence & Transects ---')
  await clickSelector(page, 'aside a[href="/terrain"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Click Delta Scarp preset button
  await clickAt(page, 200, 160, 500)
  await sleep(2500)

  // Hover over slope histogram
  await moveCursor(page, 600, 450, 700)
  await sleep(2000)

  // Switch to Elevation Transect tab
  await clickAt(page, 260, 115, 500)
  await sleep(1500)

  // Click on map to place transect start and end points
  await clickAt(page, 800, 500, 600)
  await sleep(1000)
  await clickAt(page, 1100, 600, 600)
  await sleep(3000)

  // Hover over 15 degree slope hazard threshold on chart
  await moveCursor(page, 700, 850, 600)
  await sleep(2000)

  console.log('\n--- SCENE 04: Landing Site & Base Selection ---')
  await clickSelector(page, 'aside a[href="/landing"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Inspect landing sites table
  await moveCursor(page, 450, 300, 700)
  await sleep(1500)

  // Adjust Safety weight slider
  await moveCursor(page, 1650, 350, 600)
  await sleep(1500)

  // Click Select as Mission Base on Octavia E. Butler Landing
  await clickAt(page, 1050, 350, 600)
  await sleep(2500)

  console.log('\n--- SCENE 05: Planetary Science Discovery & Sample Depot ---')
  await clickSelector(page, 'aside a[href="/science"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Filter 4-star+ targets
  await clickAt(page, 320, 120, 600) // Select 4-star targets
  await sleep(2000)

  // Switch to Three Forks Sample Depot tab
  await clickAt(page, 280, 70, 500)
  await sleep(2000)

  // Inspect sample tubes and select 3 tubes
  await clickAt(page, 300, 260, 500)
  await sleep(800)
  await clickAt(page, 300, 360, 500)
  await sleep(800)
  await clickAt(page, 300, 460, 500)
  await sleep(2500)

  console.log('\n--- SCENE 06: Water Resources & ISRU Chemical Plant ---')
  await clickSelector(page, 'aside a[href="/resources"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Hover over reality check banner
  await moveCursor(page, 500, 150, 700)
  await sleep(2000)

  // Switch to ISRU Chemical Plant tab
  await clickAt(page, 240, 70, 500)
  await sleep(2000)

  // Hover over MOXIE O2 and Sabatier synthesizer
  await moveCursor(page, 400, 350, 600)
  await sleep(1500)
  await moveCursor(page, 950, 350, 600)
  await sleep(2500)

  console.log('\n--- SCENE 07: Atmospheric & Radiation Dosimetry ---')
  await clickSelector(page, 'aside a[href="/environment"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Hover over Perseverance MEDA diurnal temperature curve
  await moveCursor(page, 550, 380, 700)
  await sleep(2500)

  // Hover over Curiosity RAD radiation dosimetry & GCR cumulative dose
  await moveCursor(page, 1400, 380, 700)
  await sleep(3000)

  console.log('\n--- SCENE 08: Terrain-Aware Route Planner ---')
  await clickSelector(page, 'aside a[href="/routes"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Click Solve Route (A*)
  await clickAt(page, 200, 420, 600)
  await sleep(3500)

  // Compare strategies: click Safest, Balanced, Direct
  await clickAt(page, 100, 480, 500) // Safest
  await sleep(1500)
  await clickAt(page, 200, 480, 500) // Balanced
  await sleep(1500)
  await clickAt(page, 300, 480, 500) // Direct
  await sleep(2000)

  // Hover over elevation cross-section and hazard segments
  await moveCursor(page, 1100, 850, 700)
  await sleep(2500)

  console.log('\n--- SCENE 09: Astronaut Survival Simulator ---')
  await clickSelector(page, 'aside a[href="/survival"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Inspect 5-consumable hourly integration curves
  await moveCursor(page, 800, 350, 700)
  await sleep(2500)

  // Select contingency scenario
  await clickAt(page, 180, 350, 600)
  await sleep(2500)

  // Hover over emergency reserve alerts
  await moveCursor(page, 1550, 400, 700)
  await sleep(2500)

  console.log('\n--- SCENE 10: Mission Assessment, Monte Carlo & Vault ---')
  await clickSelector(page, 'aside a[href="/assessment"]', 600)
  await sleep(2000)
  await injectCursor(page)

  // Hover over 7-dimension scorecard and safety capping rules
  await moveCursor(page, 350, 350, 700)
  await sleep(2500)

  // Run 500-iteration Monte Carlo simulation
  await clickAt(page, 200, 750, 600)
  await sleep(3500)

  // Open SQLite Mission Vault modal
  await clickAt(page, 1720, 24, 600) // Top bar Vault button
  await sleep(2500)

  // Close Vault modal
  await clickAt(page, 1350, 220, 500)
  await sleep(1000)

  // Hover over 1-click PDF mission report button
  await moveCursor(page, 1600, 220, 600)
  await sleep(2500)

  console.log('\n=== Recording Completed Successfully ===')
  await sleep(2000)
  await page.close()
  await context.close()
  await browser.close()
}

runDemo().catch((err) => {
  console.error('Recording error:', err)
  process.exit(1)
})
