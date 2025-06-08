export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowedOrigin = 'https://my-stack.pages.dev';

    // CORS preflight
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
        JSON.stringify({ message: 'WorkerStack Deployer. Use /auth, /repos, /deploy, or ?url=<url>.' }),
        { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin } }
      );
    }

    // GitHub OAuth: Initiate login
    if (url.pathname === '/auth') {
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent('https://my-worker.afrcanfuture.workers.dev/auth/callback')}&scope=repo`;
      return new Response(null, {
        status: 302,
        headers: { Location: githubAuthUrl, 'Access-Control-Allow-Origin': allowedOrigin },
      });
    }

    // GitHub OAuth: Callback
    if (url.pathname === '/auth/callback') {
      const code = url.searchParams.get('code');
      if (!code) {
        return new Response(JSON.stringify({ error: 'Missing OAuth code' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      }

      try {
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });
        const tokenData = await tokenRes.json();
        if (tokenData.error) throw new Error(tokenData.error_description);

        const userId = `user:${crypto.randomUUID()}`; // Unique ID
        await env.SCRAPE_CACHE.put(`token:${userId}`, tokenData.access_token, { expirationTtl: 3600 });

        return new Response(null, {
          status: 302,
          headers: {
            Location: `https://my-stack.pages.dev?userId=${encodeURIComponent(userId)}`,
            'Access-Control-Allow-Origin': allowedOrigin,
          },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'OAuth failed', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      }
    }

    // List user repos
    if (url.pathname === '/repos') {
      const userId = url.searchParams.get('userId');
      const token = await env.SCRAPE_CACHE.get(`token:${userId}`);
      if (!token) {
        return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      }

      try {
        const reposRes = await fetch('https://api.github.com/user/repos', {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
        });
        if (!reposRes.ok) throw new Error(`GitHub API error: ${reposRes.status}`);
        const repos = await reposRes.json();
        return new Response(JSON.stringify(repos), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Failed to fetch repos', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      }
    }

    // Deploy Worker or static site
    if (url.pathname === '/deploy') {
      if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      }

      try {
        const { userId, repoUrl, type, cloudflareToken, accountId, projectName } = await request.json();
        if (!userId || !repoUrl || !type || !cloudflareToken || !accountId || !projectName) {
          return new Response(JSON.stringify({ error: 'Missing required fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
          });
        }

        const githubToken = await env.SCRAPE_CACHE.get(`token:${userId}`);
        if (!githubToken) {
          return new Response(JSON.stringify({ error: 'Invalid or expired session' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
          });
        }

        let deployRes, deployData;
        if (type === 'worker') {
          const script = await fetchWorkerScript(repoUrl, githubToken);
          deployRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(projectName)}`,
            {
              method: 'PUT',
              headers: { Authorization: `Bearer ${cloudflareToken}`, 'Content-Type': 'application/javascript' },
              body: script,
            }
          );
          deployData = await deployRes.json();
        } else if (type === 'static') {
          deployRes = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`,
            {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                production_branch: 'main',
                deployment_configs: {
                  production: {
                    source: { type: 'github', config: { owner: repoUrl.split('/')[3], repo_name: repoUrl.split('/')[4], production_branch: 'main' } },
                  },
                },
              }),
            }
          );
          deployData = await deployRes.json();
          if (deployRes.ok) {
            // Trigger deployment
            const deployTrigger = await fetch(
              `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/deployments`,
              {
                method: 'POST',
                headers: { Authorization: `Bearer ${cloudflareToken}`, 'Content-Type': 'application/json' },
              }
            );
            if (!deployTrigger.ok) throw new Error(`Deployment trigger failed: ${await deployTrigger.text()}`);
          }
        } else {
          return new Response(JSON.stringify({ error: 'Invalid deployment type' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
          });
        }

        if (!deployRes.ok) throw new Error(JSON.stringify(deployData));

        const deploymentId = `deploy-${Date.now()}`;
        await env.SCRAPE_CACHE.put(`deploy:${deploymentId}`, JSON.stringify({ repoUrl, type, deployData }), {
          expirationTtl: 86400,
        });

        return new Response(
          JSON.stringify({ message: `Deployment ${type} succeeded`, deploymentId, data: deployData }),
          {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
          }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Deployment failed', details: err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      }
    }

    // Diagnostics endpoint
    const targetUrl = url.searchParams.get('url');
    if (targetUrl) {
      try {
        const cacheKey = `scrape:${targetUrl}`;
        const cached = await env.SCRAPE_CACHE.get(cacheKey);
        if (cached) {
          return new Response(cached, {
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
          });
        }

        const backendRes = await fetch(
          `https://my-stack-vldi.onrender.com/diagnostics?url=${encodeURIComponent(targetUrl)}`
        );
        const contentType = backendRes.headers.get('Content-Type') || 'application/json';
        const body = await backendRes.text();

        if (backendRes.status === 200) {
          ctx.waitUntil(env.SCRAPE_CACHE.put(cacheKey, body, { expirationTtl: 3600 }));
        }

        return new Response(body, {
          status: backendRes.status,
          headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': allowedOrigin },
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Backend fetch failed', details: err.message }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': allowedOrigin },
        });
      }
    }

    return new Response('Not found', { status: 404 });
  },
};

// Fetch Worker script from repo
async function fetchWorkerScript(repoUrl, githubToken) {
  const repoPath = repoUrl.replace('https://github.com/', '');
  const scriptRes = await fetch(`https://api.github.com/repos/${repoPath}/contents/src/index.js`, {
    headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3.raw' },
  });
  if (!scriptRes.ok) throw new Error(`Failed to fetch Worker script: ${scriptRes.status}`);
  return await scriptRes.text();
}