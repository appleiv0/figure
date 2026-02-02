import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ["react-hook-form"],
    },
    define: {
      "process.env.VITE_ENV_API_BACKEND_DOMAIN": JSON.stringify(
        env.VITE_ENV_API_BACKEND_DOMAIN
      ),
    },
    server: {
      host: true,
      strictPort: true,
      port: 3001,
    },
    build: {
      target: "es2015",
    },
  };
});
