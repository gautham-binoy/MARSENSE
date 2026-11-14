/**
 * Smooth Cursor Simulation and Visual Feedback for Video Demonstration
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function injectCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById('__marsense_cursor')) return
    const el = document.createElement('div')
    el.id = '__marsense_cursor'
    el.style.position = 'fixed'
    el.style.top = '0'
    el.style.left = '0'
    el.style.width = '28px'
    el.style.height = '28px'
    el.style.pointerEvents = 'none'
    el.style.zIndex = '9999999'
    el.style.transform = 'translate(-100px, -100px)'
    el.style.willChange = 'transform'
    el.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 6px rgba(0,0,0,0.9));">
        <path d="M3 3L10.5 21L13.5 13.5L21 10.5L3 3Z" fill="#38bdf8" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
      <div id="__cursor_ripple" style="position: absolute; top: -14px; left: -14px; width: 48px; height: 48px; border-radius: 50%; border: 3px solid #ea580c; opacity: 0; transform: scale(0.2); pointer-events: none;"></div>
    `
    document.body.appendChild(el)

    window.__cursorX = -100
    window.__cursorY = -100

    window.__setCursorPos = (x, y) => {
      window.__cursorX = x
      window.__cursorY = y
      el.style.transform = `translate(${x}px, ${y}px)`
    }

    window.__pulseCursor = () => {
      const r = document.getElementById('__cursor_ripple')
      if (!r) return
      r.style.transition = 'none'
      r.style.opacity = '1'
      r.style.transform = 'scale(0.3)'
      requestAnimationFrame(() => {
        r.style.transition = 'all 0.45s ease-out'
        r.style.opacity = '0'
        r.style.transform = 'scale(2.0)'
      })
    }
  })
}

async function moveCursor(page, targetX, targetY, durationMs = 600) {
  const startPos = await page.evaluate(() => ({
    x: window.__cursorX || 960,
    y: window.__cursorY || 540,
  }))

  const startX = startPos.x < 0 ? targetX : startPos.x
  const startY = startPos.y < 0 ? targetY : startPos.y

  const steps = Math.max(15, Math.floor(durationMs / 16))
  for (let i = 1; i <= steps; i++) {
    const t = i / steps
    // Ease-in-out quadratic curve
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
    const curX = startX + (targetX - startX) * ease
    const curY = startY + (targetY - startY) * ease

    await page.evaluate(({ x, y }) => window.__setCursorPos(x, y), { x: Math.round(curX), y: Math.round(curY) })
    await sleep(Math.floor(durationMs / steps))
  }

  await page.mouse.move(targetX, targetY)
}

async function clickAt(page, targetX, targetY, durationMs = 500) {
  await moveCursor(page, targetX, targetY, durationMs)
  await sleep(100)
  await page.evaluate(() => window.__pulseCursor())
  await page.mouse.click(targetX, targetY)
  await sleep(250)
}

async function clickSelector(page, selector, durationMs = 600) {
  const loc = page.locator(selector).first()
  if (await loc.count()) {
    const box = await loc.boundingBox()
    if (box) {
      const centerX = Math.round(box.x + box.width / 2)
      const centerY = Math.round(box.y + box.height / 2)
      await clickAt(page, centerX, centerY, durationMs)
      return true
    }
  }
  return false
}

async function hoverSelector(page, selector, durationMs = 500) {
  const loc = page.locator(selector).first()
  if (await loc.count()) {
    const box = await loc.boundingBox()
    if (box) {
      const centerX = Math.round(box.x + box.width / 2)
      const centerY = Math.round(box.y + box.height / 2)
      await moveCursor(page, centerX, centerY, durationMs)
      return true
    }
  }
  return false
}

module.exports = {
  sleep,
  injectCursor,
  moveCursor,
  clickAt,
  clickSelector,
  hoverSelector,
}
