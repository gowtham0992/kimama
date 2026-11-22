import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {devvit} from '@devvit/start/vite';
export default defineConfig(({command})=>command==='build'
  ?{plugins:[react(),devvit({client:{build:{sourcemap:false}}})]}
  :{root:'src/client',plugins:[react()],build:{outDir:'../../dist/client',emptyOutDir:true}});
