addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response('No URL provided', { status: 400, headers: corsHeaders });
  }

  const backendUrl = `https://my-stack-vldi.onrender.com/diagnostics?url=${encodeURIComponent(target)}`;
  const resp = await fetch(backendUrl, {
    headers: { 'Content-Type': 'application/json' },
  });

  const body = await resp.text();

  return new Response(body, {
    status: resp.status,
    headers: {
      ...corsHeaders,
      'Content-Type': resp.headers.get('Content-Type'),
    },
  });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://my-stack.pages.dev',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle preflight OPTIONS requests for CORS
addEventListener('fetch', event => {
  if (event.request.method === 'OPTIONS') {
    event.respondWith(new Response(null, { status: 204, headers: corsHeaders }));
  }
});