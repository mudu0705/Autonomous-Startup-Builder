import fs from 'node:fs';
import path from 'node:path';
import middie from '@fastify/middie';
import fastifyStatic from '@fastify/static';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import { buildApp } from './backend/src/app.ts';
import { env } from './backend/src/config/env.ts';
import { logger } from './backend/src/config/logger.ts';
import { databaseService } from './backend/src/services/database.ts';

async function startServer() {
  const isProd = env.NODE_ENV === 'production';
  const root = process.cwd();

  // 1. Initialize Database connection (graceful fallback if unconfigured)
  await databaseService.connect();

  // 2. Build Fastify application
  const app = await buildApp();

  let vite: ViteDevServer | null = null;

  if (!isProd) {
    // Development mode: Register middie and mount Vite dev server middlewares
    await app.register(middie);

    const isHmrDisabled = process.env.DISABLE_HMR === 'true';

    vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: isHmrDisabled ? false : { server: app.server },
        hmr: isHmrDisabled ? false : { server: app.server },
        watch: isHmrDisabled ? null : {},
      },
      appType: 'custom',
    });

    logger.info('Vite server initialized', {
      wsServerSpecified: !!(vite.config.server.ws && typeof vite.config.server.ws === 'object' && vite.config.server.ws.server),
      wsConfig: typeof vite.config.server.ws,
      hmrConfig: typeof vite.config.server.hmr,
    });

    app.use(vite.middlewares);
    logger.info('Mounted Vite dev server middleware in Fastify');
  } else {
    // Production mode: Serve built client assets
    const distPath = path.resolve(root, 'dist');
    if (fs.existsSync(distPath)) {
      await app.register(fastifyStatic, {
        root: distPath,
        prefix: '/',
        wildcard: false,
      });
      logger.info('Configured static file serving for production dist/');
    }
  }

  // 3. Fallback / SPA routing handler
  app.setNotFoundHandler(async (request, reply) => {
    // If request is an API call, return standard 404 API error response
    if (request.url.startsWith('/api')) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `API route ${request.method} ${request.url} not found`,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Do not serve HTML fallback to WebSocket upgrade requests
    if (request.headers.upgrade === 'websocket') {
      return reply.status(404).send();
    }

    // Otherwise serve SPA index.html
    try {
      if (vite) {
        const template = await fs.promises.readFile(path.resolve(root, 'index.html'), 'utf-8');
        const transformedHtml = await vite.transformIndexHtml(request.url, template);

        // Prepend early unhandledrejection listener immediately before @vite/client
        const clientScriptTag = '<script type="module" src="/@vite/client"></script>';
        const earlyHandlerScript = `<script>
      // Gracefully handle preview environment WebSocket connection rejections
      if (typeof window !== 'undefined') {
        window.addEventListener('unhandledrejection', function (event) {
          var reason = event.reason;
          var msg = typeof reason === 'string' ? reason : (reason && reason.message) || String(reason || '');
          if (
            msg.indexOf('WebSocket closed without opened') !== -1 ||
            msg.indexOf('failed to connect to websocket') !== -1
          ) {
            event.preventDefault();
            console.info('[AI Studio Preview] HMR WebSocket is disabled/closed by preview environment. Application is running normally.');
          }
        });
      }
    </script>`;

        const html = transformedHtml.includes(clientScriptTag)
          ? transformedHtml.replace(clientScriptTag, `${earlyHandlerScript}\n    ${clientScriptTag}`)
          : transformedHtml;

        return reply.type('text/html').send(html);
      } else {
        const indexPath = path.resolve(root, 'dist', 'index.html');
        if (fs.existsSync(indexPath)) {
          const html = await fs.promises.readFile(indexPath, 'utf-8');
          return reply.type('text/html').send(html);
        }
        return reply.status(404).send('Autonomous Startup Builder: Application build not found.');
      }
    } catch (err: unknown) {
      if (vite && err instanceof Error) {
        vite.ssrFixStacktrace(err);
      }
      logger.error('Failed to render SPA entry point', {
        error: err instanceof Error ? err.message : 'Unknown render error',
      });
      return reply.status(500).send('Internal Server Error rendering application');
    }
  });

  // 4. Start listening on configured port
  const host = '0.0.0.0';
  const port = env.PORT;

  try {
    await app.listen({ port, host });
    logger.info(`Autonomous Startup Builder server listening on http://${host}:${port}`, {
      environment: env.NODE_ENV,
      port,
      healthEndpoint: `http://localhost:${port}/api/health`,
    });
  } catch (err: unknown) {
    logger.error('Failed to start Fastify server', {
      error: err instanceof Error ? err.message : 'Unknown startup error',
    });
    process.exit(1);
  }

  // 5. Graceful shutdown handler
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Initiating graceful shutdown...`);
    try {
      await app.close();
      await databaseService.disconnect();
      if (vite) {
        await vite.close();
      }
      logger.info('Graceful shutdown completed successfully.');
      process.exit(0);
    } catch (err: unknown) {
      logger.error('Error occurred during graceful shutdown', {
        error: err instanceof Error ? err.message : 'Unknown shutdown error',
      });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startServer();
