import puppeteer from "@cloudflare/puppeteer";

export default {
  async fetch(request, env) {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const browser = await puppeteer.launch(env.MY_BROWSER);
    const page = await browser.newPage();

    try {
      await page.goto(url, { waitUntil: "domcontentloaded" });

      const metadata = {
        url,
        title: await page.title(),
        description: await page.$eval('meta[name="description"]', el => el.content).catch(() => ''),
        h1: await page.$eval('h1', el => el.textContent).catch(() => ''),
      };

      return Response.json(metadata);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    } finally {
      await browser.close();
    }
  }
};