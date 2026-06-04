import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  site: 'https://gwaltneypressurewashing.com',   // enables Astro.url.pathname for canonical
  compressHTML: true,
});
