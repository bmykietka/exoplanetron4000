import { chromium, type Browser, type BrowserContext, type Page } from 'playwright'

const ORIGIN = 'https://exoplanetarchive.ipac.caltech.edu'
const CHALLENGE_TIMEOUT_MS = 25000
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

/**
 * The archive's edge issues a Cloudflare JS challenge to plain HTTP clients
 * (confirmed: even a full realistic browser header set on a bare fetch still
 * gets served the "Just a moment..." page). A real, automated browser is the
 * only thing that can execute that challenge, so we keep one warm, persistent
 * Chromium page around, solve the challenge on it once, and then run actual
 * TAP requests as same-origin `fetch()` calls from inside that page — they
 * ride on the browser's own cookie jar, so no manual cookie plumbing is
 * needed. The page/browser stay alive for the life of the server process,
 * matching the process-lifetime query cache in `tap.ts`.
 */

let browser: Browser | null = null
let context: BrowserContext | null = null
let page: Page | null = null
let launchPromise: Promise<Page> | null = null
let challengePromise: Promise<void> | null = null

async function launchBrowser(): Promise<Page> {
  // Build everything on local variables first and only commit to the
  // module-level browser/context/page once the challenge is actually
  // solved. Otherwise a failed attempt (e.g. a network hiccup) would
  // overwrite `browser`/`context` without closing the old ones while
  // leaving `page` unset, so every subsequent call would launch (and leak)
  // another full Chromium process.
  let newBrowser: Browser | null = null
  let newContext: BrowserContext | null = null
  try {
    newBrowser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ['--disable-blink-features=AutomationControlled']
    })
    newContext = await newBrowser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 800 },
      locale: 'en-US'
    })
    await newContext.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    })
    const newPage = await newContext.newPage()
    await solveChallengeOn(newPage)
    browser = newBrowser
    context = newContext
    page = newPage
    return newPage
  } catch (err) {
    await newContext?.close().catch(() => {})
    await newBrowser?.close().catch(() => {})
    throw err
  }
}

async function ensurePage(): Promise<Page> {
  if (page && !page.isClosed()) return page
  if (!launchPromise) {
    launchPromise = launchBrowser().finally(() => {
      launchPromise = null
    })
  }
  page = await launchPromise
  return page
}

async function isChallengeTitle(p: Page): Promise<boolean> {
  const title = await p.title().catch(() => '')
  return title.includes('Just a moment')
}

async function solveChallengeOn(p: Page): Promise<void> {
  if (challengePromise) return challengePromise
  challengePromise = (async () => {
    await p.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
    const deadline = Date.now() + CHALLENGE_TIMEOUT_MS
    while ((await isChallengeTitle(p)) && Date.now() < deadline) {
      await p.waitForTimeout(1000)
    }
    if (await isChallengeTitle(p)) {
      throw new Error('Timed out waiting for the Cloudflare challenge to clear')
    }
  })()
  try {
    await challengePromise
  } finally {
    challengePromise = null
  }
}

function looksLikeChallenge(status: number, body: string): boolean {
  return status === 403 || body.includes('Just a moment') || body.includes('challenges.cloudflare.com')
}

async function fetchInPage(p: Page, url: string): Promise<{ status: number; body: string }> {
  return p.evaluate(async (targetUrl) => {
    const res = await fetch(targetUrl, { headers: { Accept: 'application/json, text/plain, */*' } })
    return { status: res.status, body: await res.text() }
  }, url)
}

/**
 * Fetches a URL through the persistent, challenge-cleared browser page.
 * Re-solves the challenge once and retries if the session appears to have
 * expired mid-flight.
 */
export async function browserFetchText(url: string): Promise<string> {
  const p = await ensurePage()
  let result = await fetchInPage(p, url)

  if (looksLikeChallenge(result.status, result.body)) {
    await solveChallengeOn(p)
    result = await fetchInPage(p, url)
  }

  if (result.status >= 400) {
    throw new Error(`Upstream responded with HTTP ${result.status}: ${result.body.slice(0, 500)}`)
  }
  return result.body
}

export async function closeBrowser(): Promise<void> {
  await page?.close().catch(() => {})
  await context?.close().catch(() => {})
  await browser?.close().catch(() => {})
  page = null
  context = null
  browser = null
}
