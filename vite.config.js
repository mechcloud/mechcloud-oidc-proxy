import { defineConfig } from 'vite'

export default defineConfig(({ command, mode }) => {

   console.log(`Comamnd : ${command}, Mode: ${mode}`)

   const configs = {
      build: {
         emptyOutDir: true
      }
   }

   return configs
})

