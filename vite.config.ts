import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import {defineConfig, Plugin} from 'vite';

function apiDatabasePlugin(): Plugin {
  const dataDir = path.resolve(__dirname, 'data');
  const dbFile = path.join(dataDir, 'dealer_database.json');

  return {
    name: 'dealer-api-database',
    configureServer(server) {
      server.middlewares.use('/api/db', (req, res) => {
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }

        if (req.method === 'GET') {
          if (fs.existsSync(dbFile)) {
            try {
              const data = fs.readFileSync(dbFile, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(data);
              return;
            } catch (err) {
              console.error('Error reading db file:', err);
            }
          }
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ empty: true }));
        } else if (req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              fs.writeFileSync(dbFile, body, 'utf-8');
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, savedAt: new Date().toISOString() }));
            } catch (err) {
              console.error('Error writing db file:', err);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to write data' }));
            }
          });
        } else {
          res.statusCode = 405;
          res.end('Method Not Allowed');
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), apiDatabasePlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
