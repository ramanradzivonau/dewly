import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

// Icons are generated from public/dewly-mark.svg (a copy of docs/assets/dewly-mark.svg).
// Run `npm run generate-pwa-assets` after changing the mark.
const brandGreen = '#0E3A25'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: {
    ...minimal2023Preset,
    // Full-bleed green so the rounded corners of the mark don't show on Android masks or iOS.
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: brandGreen } },
    apple: { ...minimal2023Preset.apple, padding: 0, resizeOptions: { background: brandGreen } },
  },
  images: ['public/dewly-mark.svg'],
})
