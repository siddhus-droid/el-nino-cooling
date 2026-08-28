import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    // The plotly.js chunk (EDA page only) is inherently large; it's
    // code-split via React.lazy() in App.tsx rather than manual chunking.
    chunkSizeWarningLimit: 1200,
  },
});
