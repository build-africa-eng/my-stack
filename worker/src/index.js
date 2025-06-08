export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response('Missing ?url param', { status: 400 });
    }

    const renderApi = `https://my-stack-vldi.onrender.com/diagnostics?url=${encodeURIComponent(target)}`;

    try {
      const resp = await fetch(renderApi, {
        headers: { 'Content-Type': 'application/json' },
      });

      const contentType = resp.headers.get('Content-Type') || 'application/json';
      return new Response(resp.body, {
        status: resp.status,
        headers: { 'Content-Type': contentType },
      });
    } catch (err) {
      return new Response(`Error contacting backend: ${err.message}`, { status: 502 });
    }
  },
};