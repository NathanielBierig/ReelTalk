import { expect, test, type FrameLocator } from '@playwright/test'
import { BASE, SHOTS, Spectator } from './helpers'
import { mkdirSync } from 'node:fs'

// Solo test mode: one laptop window plays the TV and every phone through `?seat=` frames.
test('solo mode: one window runs TV + 4 seats through a round', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, baseURL: BASE })
  const page = await ctx.newPage()
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))

  await page.goto('/')
  await page.getByRole('button', { name: /Solo test/ }).click()
  await page.getByRole('button', { name: /4 players/ }).click()
  await page.getByRole('button', { name: 'Start solo test' }).click()

  const tvFrame = page.frameLocator('iframe[title="TV"]')
  const codeText = await page.locator('header span.tracking-\\[0\\.2em\\]').first().innerText()
  const code = codeText.trim()
  expect(code).toMatch(/^[A-Z]{4}$/)
  const spec = await Spectator.connect(code)

  const seats: FrameLocator[] = [1, 2, 3, 4].map(n => page.frameLocator(`iframe[title="P${n}"]`))
  for (const [i, f] of seats.entries()) {
    // Name is prefilled per seat (P1, P2...), so joining is one tap.
    await expect(f.locator('#name')).toHaveValue(`P${i + 1}`)
    await f.getByRole('button', { name: 'Join game' }).click()
    await spec.until(s => s.players.length === i + 1, 10_000, `P${i + 1} joined`)
  }
  // Every seat is its own player, not one shared identity.
  expect(new Set(spec.state.players.map(p => p.id)).size).toBe(4)

  await tvFrame.getByRole('button', { name: '1', exact: true }).click()
  await spec.until(s => s.settings.reelsPerPlayer === 1, 5_000, 'settings change')
  for (const [i, f] of seats.entries()) {
    const box = f.getByPlaceholder('instagram.com/reel/…')
    if (!(await box.isVisible())) await f.getByRole('button', { name: 'or type the link' }).click()
    await box.fill(`https://www.instagram.com/reel/E2Etestsolo${i}x/`)
    await f.getByRole('button', { name: 'Add reel' }).click()
  }
  await spec.until(s => s.players.every(p => p.reelCount === 1), 10_000, 'all reels in')

  await tvFrame.getByRole('button', { name: 'Start the game' }).click()
  const s = await spec.until(st => st.phase === 'answer', 10_000, 'game start')
  const judgeName = s.players.find(p => p.id === s.round!.judgeId)!.name
  for (const [i, f] of seats.entries()) {
    if (`P${i + 1}` === judgeName) continue
    await f.getByLabel('Your answer').fill(`solo answer ${i + 1}`)
    await f.getByRole('button', { name: 'Send', exact: true }).click()
  }
  await spec.until(st => st.phase === 'judge', 10_000, 'judge phase')

  mkdirSync(`${SHOTS}/solo`, { recursive: true })
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${SHOTS}/solo/solo-judge.png` })
  expect(errors).toEqual([])
  spec.close()
  await ctx.close()
})
