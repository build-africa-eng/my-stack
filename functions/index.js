export async function onRequest(context) {
  const url = new URL(context.request.url);
  const target = url.searchParams.get('url');
  if (!target) {
    return new Response('No URL provided', { status: 400 });
  }

  // Proxy to your backend service (e.g., Render)
  const backendUrl = `https://my-stack-vldi.onrender.com/diagnostics?url=${encodeURIComponent(target)}`;
  const resp = await fetch(backendUrl, {
    headers: { 'Content-Type': 'application/json' },
  });

  const body = await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: { 'Content-Type': resp.headers.get('Content-Type') },
  });
}