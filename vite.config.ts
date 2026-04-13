import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    base: '/admin',
    plugins: [
      react(),
      {
        name: 'postbuild-deploy',
        closeBundle: async () => {
          console.log('Build finished. Deploying to /var/www/admin...');
          const { exec } = await import('child_process');
          exec('rm -rf /var/www/admin/* && cp -r dist/* /var/www/admin/', (error, stdout, stderr) => {
            if (error) {
              console.error(`Deploy error: ${error}`);
              return;
            }
            console.log('Deployed successfully to /var/www/admin!');
          });
        }
      }
    ],
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'https://api.nartgo.net',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => {
            // Local backend doesn't have /api/v1 prefix — strip it
            if (env.VITE_API_STRIP_PREFIX === 'true') {
              return path.replace(/^\/api\/v1/, '');
            }
            const version = env.VITE_API_VERSION || 'v1';
            if (path.includes(`/${version}/`)) {
              return path;
            }
            return path.replace(/^\/api/, `/api/${version}`);
          },
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // Strip browser Origin header — backend CORS rejects localhost
              proxyReq.removeHeader('origin');
              console.log('Sending Request to Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, res) => {
              console.log('Received Response from Target:', proxyRes.statusCode, req.url);
            });
            proxy.on('error', (err, req, res) => {
              console.log('proxy error', err);
            });
          },
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-CSRF-TOKEN',
          },
        }
      }
    }
  }
})
