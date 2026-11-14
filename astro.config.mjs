// Configuración de Astro + React + Tailwind 4 (plugin de Vite).
// Ver GUIA-DE-INICIO.md, Paso 1.

import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()]
  }
});
