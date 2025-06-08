export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowedOrigin = 'https://my-stack.pages.dev';

    // Handle preflight (CORS OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowedOrigin,
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Root route
    if (url.pathname === '/') {
      return new Response(
        JSON.stringify({ message: 'WorkerStack Deployer. Use ?url=<url> to scrape or /deploy to trigger deployment.' }),
        {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin,
          },
        }
      );
    }

    // Diagnostics endpoint
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
        },
      });
    }

    try {
      // Check KV cache (if configured)
      const cacheKey = `scrape:${targetUrl}`;
      const cached = env.SCRAPE_CACHE ? await env.SCRAPE_CACHE.get(cacheKey) : null;
      if (cached) {
        return new Response(cached, {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': allowedOrigin,
          },
        });
      }

      // Fetch from Render
      const backendRes = await fetch(
        `https://my-stack-vldi.onrender.com/diagnostics?url=${encodeURIComponent(targetUrl)}`
      );
      const contentType = backendRes.headers.get('Content-Type') || 'application/json';
      const body = await backendRes.text();

      // Cache response (if successful)
      if (backendRes.status === 200 && env.SCRAPE_CACHE) {
        ctx.waitUntil(env.SCRAPE_CACHE.put(cacheKey, body, { expirationTtl: 3600 }));
      }

      return new Response(body, {
        status: backendRes.status,
        headers: {
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': allowedOrigin,
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Backend fetch failed', details: err.message }), {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': allowedOrigin,
        },
      });
    }
  },
};