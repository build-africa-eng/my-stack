export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("No URL provided", { status: 400 });
    }

    const backendUrl = `https://my-stack-vldi.onrender.com/diagnostics?url=${encodeURIComponent(target)}`;

    const resp = await fetch(backendUrl, {
      headers: { 'Content-Type': 'application/json' },
    });

    return new Response(resp.body, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json' },
    });
  }
};