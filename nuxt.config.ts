// https://nuxt.com/docs/api/configuration/nuxt-config
// Nuxt 4 compatibility mode – targets the Nuxt 4 conventions
export default defineNuxtConfig({
  future: {
    compatibilityVersion: 4
  },

  // Keep source at root so the required file paths (pages/, components/, …) work as-is.
  srcDir: '.',

  compatibilityDate: '2025-01-01',

  modules: ['@nuxtjs/tailwindcss', '@nuxt/eslint'],

  // Disable path-prefix naming so components/layout/AppHeader.vue resolves as
  // <AppHeader>, not <LayoutAppHeader>. Without this, subdirectory-scoped
  // components silently fail to resolve (hydration mismatch + empty page).
  components: [
    { path: '~/components', pathPrefix: false }
  ],

  typescript: {
    strict: true,
    typeCheck: false // set true when you want full tsc checks in dev
  },

  tailwindcss: {
    configPath: 'tailwind.config.ts'
  },

  // Nielsen H1: always surface system status – use page transitions to confirm navigation
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      titleTemplate: '%s | KG Editor',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Low-barrier knowledge-graph editing for domain experts' }
      ]
    }
  },

  // Serve data files through the Nitro asset layer so server routes can read them
  nitro: {
    publicAssets: []
  }
})
