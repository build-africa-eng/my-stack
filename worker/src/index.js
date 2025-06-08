// worker.js or index.js

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    const allowedOrigin = "https://my-stack.pages.dev";

    // Handle preflight (CORS OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": allowedOrigin,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowedOrigin,
        },
      });
    }

    try {
      const backendRes = await fetch(
        `https://my-stack-vldi.onrender.com/diagnostics?url=${encodeURIComponent(targetUrl)}`
      );

      const contentType = backendRes.headers.get("Content-Type") || "application/json";
      const body = await backendRes.text();

      return new Response(body, {
        status: backendRes.status,
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": allowedOrigin,
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: "Backend fetch failed", details: err.message }), {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": allowedOrigin,
        },
      });
    }
  },
};