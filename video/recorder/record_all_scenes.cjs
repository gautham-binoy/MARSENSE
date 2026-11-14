const { chromium } = require('playwright')
const fs = require('fs')
const path = require('path')

const manifest = JSON.parse(fs.readFileSync('video/manifest.json', 'utf8'))
const BASE_URL = 'http://127.0.0.1:5173'

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function recordScene(browser, sceneInfo) {
  const sceneId = sceneInfo.id
  const targetDurationMs = Math.ceil(sceneInfo.duration * 1000) + 1200 // slight buffer
  const clipDir = path.join(__dirname, '..', 'clips', sceneId)
  fs.mkdirSync(clipDir, { recursive: true })

  console.log(`\n==================================================`)
  console.log(`Recording ${sceneId} (${sceneInfo.title})`)
  console.log(`Target duration: ${(targetDurationMs / 1000).toFixed(1)}s`)
  console.log(`==================================================`)

  const context = await browser.newContext({
    recordVideo: {
      dir: clipDir,
      size: { width: 1920, height: 1080 },
    },
    viewport: { width: 1920, height: 1080 },
  })

  const page = await context.newPage()
  const startTime = Date.now()

  try {
    if (sceneId === 'scene01_mission_control') {
      await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' })
      await sleep(2500)
      // Highlight Mars Chronometry
      await page.mouse.move(700, 24, { steps: 25 })
      await sleep(3500)
      // Hover over Regional card
      await page.mouse.move(180, 150, { steps: 25 })
      await sleep(3000)
      // Click Fly to Jezero
      const flyBtn = page.locator('[data-testid="mc-fly-jezero"]')
      if (await flyBtn.count()) {
        await flyBtn.click()
      }
      await sleep(6000)
      // Hover over Perseverance rover card
      await page.mouse.move(200, 1020, { steps: 30 })
      await sleep(4000)
      // Hover over mission readiness score
      await page.mouse.move(1600, 120, { steps: 30 })
      await sleep(4000)
      // Scroll right panel smoothly
      await page.mouse.move(1700, 500)
      await page.mouse.wheel(0, 400)
      await sleep(4000)
      await page.mouse.wheel(0, 400)
      await sleep(4000)
      await page.mouse.wheel(0, -800)
      await sleep(3000)
    } else if (sceneId === 'scene02_mars_explorer') {
      await page.goto(`${BASE_URL}/explorer`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Hover over click modes
      await page.mouse.move(150, 40, { steps: 20 })
      await sleep(2500)
      // Click on Mars terrain near center
      await page.mouse.click(800, 500)
      await sleep(4000)
      // Switch to Layers tab
      const layersTab = page.getByRole('tab', { name: /Layers/i }).first()
      if (await layersTab.count()) {
        await layersTab.click()
        await sleep(2000)
      }
      // Scroll layer panel
      await page.mouse.move(1750, 300)
      await page.mouse.wheel(0, 300)
      await sleep(3000)
      await page.mouse.wheel(0, -300)
      await sleep(2000)
      // Switch to Bookmarks tab
      const bmTab = page.getByRole('tab', { name: /Marks/i }).first()
      if (await bmTab.count()) {
        await bmTab.click()
        await sleep(3000)
      }
    } else if (sceneId === 'scene03_terrain_intelligence') {
      await page.goto(`${BASE_URL}/terrain`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Click on preset
      const presetBtn = page.getByRole('button', { name: /Butler Landing/i }).first()
      if (await presetBtn.count()) {
        await presetBtn.click()
        await sleep(3500)
      }
      // Switch profile to Astronaut EVA
      const evaBtn = page.getByRole('button', { name: /Astronaut EVA/i }).first()
      if (await evaBtn.count()) {
        await evaBtn.click()
        await sleep(2500)
      }
      // Switch to Elevation Transect mode
      const transectModeBtn = page.getByRole('button', { name: /Elevation Transect/i }).first()
      if (await transectModeBtn.count()) {
        await transectModeBtn.click()
        await sleep(3000)
      }
      // Click calculate profile
      const calcBtn = page.getByRole('button', { name: /Calculate Profile/i }).first()
      if (await calcBtn.count()) {
        await calcBtn.click()
        await sleep(4500)
      }
      // Scroll right panel to inspect chart
      await page.mouse.move(1700, 500)
      await page.mouse.wheel(0, 300)
      await sleep(4000)
    } else if (sceneId === 'scene04_landing_sites') {
      await page.goto(`${BASE_URL}/landing`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Click Compare Candidate Sites
      const compareBtn = page.getByRole('button', { name: /Compare Candidate/i }).first()
      if (await compareBtn.count()) {
        await compareBtn.click()
        await sleep(4000)
      }
      // Click Western Delta candidate
      const siteItem = page.locator('text=Western Delta Front Scarp').first()
      if (await siteItem.count()) {
        await siteItem.click()
        await sleep(3500)
      }
      // Switch to Factor Weights tab
      const weightsTab = page.getByRole('tab', { name: /Factor Weights/i }).first()
      if (await weightsTab.count()) {
        await weightsTab.click()
        await sleep(3500)
      }
      // Switch back to Ranked Sites
      const rankedTab = page.getByRole('tab', { name: /Ranked Sites/i }).first()
      if (await rankedTab.count()) {
        await rankedTab.click()
        await sleep(3000)
      }
    } else if (sceneId === 'scene05_science_discovery') {
      await page.goto(`${BASE_URL}/science`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Filter targets
      const filterBtn = page.getByRole('button', { name: /delta remnant/i }).first()
      if (await filterBtn.count()) {
        await filterBtn.click()
        await sleep(2500)
      }
      // Click all
      const allBtn = page.getByRole('button', { name: /^all$/i }).first()
      if (await allBtn.count()) {
        await allBtn.click()
        await sleep(2000)
      }
      // Click Select 4★+
      const selectHighBtn = page.getByRole('button', { name: /Select 4★\+/i }).first()
      if (await selectHighBtn.count()) {
        await selectHighBtn.click()
        await sleep(2500)
      }
      // Switch to MSR Sample Depot tab
      const msrTab = page.getByRole('tab', { name: /MSR/i }).first()
      if (await msrTab.count()) {
        await msrTab.click()
        await sleep(3000)
        // Scroll through sample tubes
        await page.mouse.move(1700, 400)
        await page.mouse.wheel(0, 350)
        await sleep(3000)
        await page.mouse.wheel(0, -350)
        await sleep(2500)
      }
    } else if (sceneId === 'scene06_water_resources') {
      await page.goto(`${BASE_URL}/resources`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Hover over water-ice integrity alert
      await page.mouse.move(400, 100, { steps: 25 })
      await sleep(4000)
      // Click an aqueous evidence entry
      const evItem = page.locator('text=Neretva Vallis Mg-Carbonate').first()
      if (await evItem.count()) {
        await evItem.click()
        await sleep(3500)
      }
      // Switch to ISRU Simulator tab
      const isruTab = page.getByRole('tab', { name: /ISRU/i }).first()
      if (await isruTab.count()) {
        await isruTab.click()
        await sleep(4000)
        // Scroll ISRU details
        await page.mouse.move(1700, 400)
        await page.mouse.wheel(0, 300)
        await sleep(3500)
      }
    } else if (sceneId === 'scene07_environment_radiation') {
      await page.goto(`${BASE_URL}/environment`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Hover over summary stat tiles
      await page.mouse.move(300, 200, { steps: 20 })
      await sleep(3000)
      // Switch chart tab to Pressure
      const pressBtn = page.getByRole('button', { name: /Pressure/i }).first()
      if (await pressBtn.count()) {
        await pressBtn.click()
        await sleep(3500)
      }
      // Switch chart tab to Radiation
      const radBtn = page.getByRole('button', { name: /Radiation/i }).first()
      if (await radBtn.count()) {
        await radBtn.click()
        await sleep(4000)
      }
      // Switch back to Temperature
      const tempBtn = page.getByRole('button', { name: /Temperature/i }).first()
      if (await tempBtn.count()) {
        await tempBtn.click()
        await sleep(3000)
      }
    } else if (sceneId === 'scene08_route_planner') {
      await page.goto(`${BASE_URL}/routes`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Click Plan Route
      const planBtn = page.getByRole('button', { name: /^Plan Route$/i }).first()
      if (await planBtn.count()) {
        await planBtn.click()
        await sleep(4000)
      }
      // Click Compare 3 Strategies
      const compStratBtn = page.getByRole('button', { name: /Compare 3 Strategies/i }).first()
      if (await compStratBtn.count()) {
        await compStratBtn.click()
        await sleep(4500)
      }
      // Hover over route summary pill
      await page.mouse.move(400, 1020, { steps: 25 })
      await sleep(3500)
      // Scroll right panel to inspect elevation cross-section
      await page.mouse.move(1700, 500)
      await page.mouse.wheel(0, 300)
      await sleep(3500)
    } else if (sceneId === 'scene09_survival_simulator') {
      await page.goto(`${BASE_URL}/survival`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Click Run Simulator
      const simBtn = page.getByRole('button', { name: /Run Simulator/i }).first()
      if (await simBtn.count()) {
        await simBtn.click()
        await sleep(4000)
      }
      // Toggle Dust Storm Delay
      const delayScenarioBtn = page.getByRole('button', { name: /Delay/i }).first()
      if (await delayScenarioBtn.count()) {
        await delayScenarioBtn.click()
        await sleep(4000)
      }
      // Toggle Scrubber Degradation
      const scrubberBtn = page.getByRole('button', { name: /Scrubber/i }).first()
      if (await scrubberBtn.count()) {
        await scrubberBtn.click()
        await sleep(4000)
      }
      // Scroll left panel to view Detailed Consumables Balance
      await page.mouse.move(700, 600)
      await page.mouse.wheel(0, 400)
      await sleep(4000)
    } else if (sceneId === 'scene10_assessment_and_vault') {
      await page.goto(`${BASE_URL}/assessment`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Click Recompute Assessment
      const assessBtn = page.getByRole('button', { name: /Recompute/i }).first()
      if (await assessBtn.count()) {
        await assessBtn.click()
        await sleep(4000)
      }
      // Switch to Monte Carlo tab
      const mcTab = page.getByRole('tab', { name: /Monte Carlo/i }).first()
      if (await mcTab.count()) {
        await mcTab.click()
        await sleep(4500)
      }
      // Open Mission Vault modal
      const vaultBtn = page.getByRole('button', { name: /Vault/i }).first()
      if (await vaultBtn.count()) {
        await vaultBtn.click()
        await sleep(4500)
        // Close modal
        await page.keyboard.press('Escape')
        await sleep(2000)
      }
      // Navigate to Methodology
      await page.goto(`${BASE_URL}/methodology`, { waitUntil: 'networkidle' })
      await sleep(3000)
      // Hover over Operations Manual button
      await page.mouse.move(1500, 70, { steps: 25 })
      await sleep(3000)
    }

    // Ensure we reach the exact target duration for perfect voice synchronization
    const elapsedMs = Date.now() - startTime
    const remainingMs = targetDurationMs - elapsedMs
    if (remainingMs > 0) {
      console.log(`Holding scene for remaining ${(remainingMs / 1000).toFixed(1)}s to match audio...`)
      await sleep(remainingMs)
    }
  } catch (err) {
    console.error(`Error in scene ${sceneId}:`, err)
  } finally {
    await context.close()
  }

  // Find the recorded webm file in clipDir
  const files = fs.readdirSync(clipDir).filter((f) => f.endsWith('.webm'))
  if (files.length > 0) {
    const rawWebm = path.join(clipDir, files[0])
    const destWebm = path.join(clipDir, 'raw.webm')
    fs.renameSync(rawWebm, destWebm)
    console.log(`Saved raw video to ${destWebm}`)
  } else {
    console.warn(`No webm file found in ${clipDir}`)
  }
}

async function run() {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/chromium',
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
    ],
  })

  try {
    for (const scene of manifest) {
      await recordScene(browser, scene)
    }
    console.log('\nAll 10 scenes recorded successfully!')
  } finally {
    await browser.close()
  }
}

run().catch((err) => {
  console.error('Fatal error during recording:', err)
  process.exit(1)
})
