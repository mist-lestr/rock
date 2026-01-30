import { defineConfig } from 'vite';
import tailwindcss from "@tailwindcss/vite"

// 👉 1️⃣ indique à Vite que l’on veut un build de type « library »
export default defineConfig({
  define: {
    'process.env': {}
  },
  plugins: [tailwindcss()],
  build: {
    lib: {
      // fichier d’entrée de ta librairie (le composant)
      entry: 'src/pod.ts',
      name: 'Pod',               // nom global (utile pour le format IIFE/UMD)
      fileName: (format) => `pod.${format}.js`,
      // formats que tu souhaites générer
      //  - es  : module ES (idéal pour les imports modernes)
      //  - iife: script auto‑exécuté (prêt à être inséré via <script>)
      formats: ['es', 'iife'],
    },
    // 👉 2️⃣ désactive la génération de CSS séparé (il sera injecté dans le JS)
    cssCodeSplit: false,
    minify: 'terser',
    // 👉 3️⃣ garde le bundle le plus petit possible
    rollupOptions: {
      // Exclure les dépendances externes si tu veux qu’elles restent à charger séparément
      external: [],          // ← laisse vide pour tout empaqueter dans le même fichier
      output: {
        // Si tu utilises le format iife/umd, expose le composant sous le nom global ci‑dessus
        globals: {
          // 'lit': 'Lit'   // ← à remplir seulement si tu mets lit en externe
        },
      },
    },
  },
});