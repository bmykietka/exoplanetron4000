import glsl from 'vite-plugin-glsl'
import { templateCompilerOptions } from '@tresjs/core'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  ssr: true,
  css: ['~/assets/css/main.css'],
  // Without this, Vue's template compiler tries to resolve <TresMesh>,
  // <TresPerspectiveCamera> etc. as regular components and fails ("Failed
  // to resolve component") — TresJS renders them itself via its custom
  // renderer and just needs the compiler to leave the tags alone.
  vue: {
    compilerOptions: templateCompilerOptions.template.compilerOptions
  },
  app: {
    head: {
      title: 'Exoplanetron 4000',
      meta: [
        {
          name: 'description',
          content: 'Explore exoplanet systems in 3D and 2D, sourced from the NASA Exoplanet Archive.'
        }
      ]
    }
  },
  vite: {
    plugins: [glsl()]
  },
  build: {
    transpile: ['three', '@tresjs/core', '@tresjs/cientos']
  },
  typescript: {
    strict: true
  },
  nitro: {
    routeRules: {
      '/api/**': { cors: false }
    }
  }
})
