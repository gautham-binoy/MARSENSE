// Usage: node scripts/screenshot.mjs <path> <outfile> [waitMs] [width] [height]
import { chromium } from '@playwright/test'
const [, , route = '/', out = '/tmp/shot.png', waitMs = '6000', w = '1440', h = '900'] = process.argv
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: +w, height: +h } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text().slice(0, 300)}`) })
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
await page.goto(`http://127.0.0.1:5173${route}`, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => errors.push('goto: ' + e.message))
await page.waitForTimeout(+waitMs)
await page.screenshot({ path: out })
console.log(JSON.stringify({ out, errors: errors.slice(0, 15) }, null, 1))
await browser.close()
