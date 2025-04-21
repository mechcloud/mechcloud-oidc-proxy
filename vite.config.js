import { defineConfig } from 'vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

export default defineConfig(({ command, mode }) => {
   console.log(`Command: ${command}, Mode: ${mode}`)

   const configs = {
      plugins: [
         // Enable HTTPS with self-signed certificate
         basicSsl()
      ],
      build: {
         emptyOutDir: true
      },
      server: {
         // Enable HTTPS (handled by basicSsl plugin)
         https: true,
         // Enable CORS for portal.mechcloud.io
         cors: {
            origin: 'https://portal-dev.mechcloud.io',
            credentials: true,
            allowedHeaders: ['Content-Type', 'Authorization'],
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
         },
         // Configure proxy for /minikube subpath
         proxy: {
            '/minikube': {
               target: 'http://localhost:8001',
               changeOrigin: true,
               secure: false,
               // Rewrite /minikube to /
               rewrite: (path) => path.replace(/^\/minikube/, '')
            },
            '/wrangler': {
               target: 'http://localhost:8890',
               changeOrigin: true,
               secure: false,
               // Rewrite /minikube to /
               rewrite: (path) => path.replace(/^\/wrangler/, '')
            }
         }
      }
   }

   return configs
})