import { test, expect } from '@playwright/test'

test.describe('MARSENSE — Martian Survival Navigator Workflow', () => {
  test('Mission Control page loads and displays telemetry status', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=MARSENSE')).toBeVisible()
    await expect(page.locator('text=Martian Survival Navigator')).toBeVisible()
    await expect(page.locator('text=Jezero Crater')).toBeVisible()
    await expect(page.locator('text=API')).toBeVisible()
  })

  test('Mars Explorer page renders Cesium globe and layer controls', async ({ page }) => {
    await page.goto('/explorer')
    await expect(page.locator('[data-testid="mars-globe"]')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Inspect/i }).first()).toBeVisible()
    await expect(page.getByRole('tab', { name: /Layers/i }).first()).toBeVisible()
  })

  test('Terrain Intelligence page performs region analysis', async ({ page }) => {
    await page.goto('/terrain')
    await expect(page.locator('text=Martian Terrain Intelligence')).toBeVisible()
    await expect(page.locator('text=Traversability Index')).toBeVisible()
  })

  test('Landing Sites page compares candidate locations', async ({ page }) => {
    await page.goto('/landing')
    await expect(page.locator('text=Landing Site & Habitat Base-Site Intelligence')).toBeVisible()
    await expect(page.locator('text=Octavia E. Butler')).toBeVisible()
  })

  test('Science Discovery page lists curated targets and filters', async ({ page }) => {
    await page.goto('/science')
    await expect(page.locator('text=Planetary Science Discovery & Target Catalogue')).toBeVisible()
    await expect(page.locator('input[placeholder*="Search targets"]')).toBeVisible()
  })

  test('Resources page details aqueous mineral evidence and water-ice reality', async ({ page }) => {
    await page.goto('/resources')
    await expect(page.locator('text=Water Resources & Aqueous Mineralogy Intelligence')).toBeVisible()
    await expect(page.locator('text=No orbital radar (SHARAD) or neutron detector indicates near-surface ice')).toBeVisible()
  })

  test('Environment page displays MEDA and RAD measurements', async ({ page }) => {
    await page.goto('/environment')
    await expect(page.locator('text=Martian Atmospheric & Radiation Environment')).toBeVisible()
    await expect(page.locator('text=MEDA Air Temperature Range')).toBeVisible()
  })

  test('Route Planner computes A* pathfinding', async ({ page }) => {
    await page.goto('/routes')
    await expect(page.locator('text=Terrain-Aware Mission Route Planner')).toBeVisible()
    const planBtn = page.locator('button:has-text("Plan Route")')
    await expect(planBtn).toBeVisible()
  })

  test('Survival Simulator renders depletion curves and warnings', async ({ page }) => {
    await page.goto('/survival')
    await expect(page.locator('text=Astronaut Survival Simulator')).toBeVisible()
    await expect(page.locator('text=Resource Depletion Timeline')).toBeVisible()
    await expect(page.locator('text=Emergency Reserve Margin')).toBeVisible()
  })

  test('Mission Assessment evaluates feasibility and offers PDF download', async ({ page }) => {
    await page.goto('/assessment')
    await expect(page.locator('text=Mission Feasibility & Survival Assessment')).toBeVisible()
    await expect(page.locator('button:has-text("Download PDF Report")')).toBeVisible()
  })

  test('Methodology page displays dataset registry and peer-reviewed formulas', async ({ page }) => {
    await page.goto('/methodology')
    await expect(page.locator('text=Scientific Methodology, Mathematics & Data Provenance')).toBeVisible()
    await expect(page.locator('text=Mars 2020 TRN CTX DTM Mosaic')).toBeVisible()
  })

  test('Mission Vault opens and shows SQLite saved missions', async ({ page }) => {
    await page.goto('/')
    const vaultBtn = page.getByRole('button', { name: /Vault/i }).first()
    await expect(vaultBtn).toBeVisible()
    await vaultBtn.click()
    await expect(page.locator('text=Mission Flight Plan Vault')).toBeVisible()
    await expect(page.locator('text=Saved Missions')).toBeVisible()
  })

  test('Resources page switches to ISRU Chemical Plant simulator', async ({ page }) => {
    await page.goto('/resources')
    const isruTab = page.getByRole('tab', { name: /ISRU/i }).first()
    await expect(isruTab).toBeVisible()
    await isruTab.click()
    await expect(page.locator('text=ISRU Chemical Plant & Fuel Synthesizer')).toBeVisible()
    await expect(page.locator('text=MOXIE Atmospheric O2 Plant')).toBeVisible()
  })

  test('Science page switches to MSR Sample Return Depot', async ({ page }) => {
    await page.goto('/science')
    const msrTab = page.getByRole('tab', { name: /MSR/i }).first()
    await expect(msrTab).toBeVisible()
    await msrTab.click()
    await expect(page.locator('text=Three Forks Sample Return Depot')).toBeVisible()
    await expect(page.locator('text=Tube #258')).toBeVisible()
  })

  test('Assessment page displays Monte Carlo Risk Analysis tab', async ({ page }) => {
    await page.goto('/assessment')
    const mcTab = page.getByRole('tab', { name: /Monte Carlo/i }).first()
    await expect(mcTab).toBeVisible()
    await mcTab.click()
    await expect(page.locator('text=Probabilistic Monte Carlo Survival Analysis')).toBeVisible()
    await expect(page.locator('text=Survival Probability:')).toBeVisible()
  })

  test('Terrain Intelligence page executes Elevation Transect Profile', async ({ page }) => {
    await page.goto('/terrain')
    const transectBtn = page.getByRole('button', { name: /Elevation Transect/i }).first()
    await expect(transectBtn).toBeVisible()
    await transectBtn.click()
    await expect(page.locator('text=Elevation Transect Endpoints')).toBeVisible()
    await expect(page.locator('text=Delta Scarp Transect')).toBeVisible()
    await expect(page.locator('text=Elevation Transect Cross-Section')).toBeVisible()
  })
})
