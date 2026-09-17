import { closeBrowser } from '../utils/browserFetch'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    await closeBrowser()
  })
})
