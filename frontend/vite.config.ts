import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), basicSsl()],
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
      port: parseInt(env.PORT) || 3001,
      proxy: {
        "/api": {
          target: "http://192.168.0.188:3302",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ""),
        },
      },
    },
    build: {
      target: "es2015",
    },
  };
});
