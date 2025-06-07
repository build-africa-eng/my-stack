const express = require("express");
const puppeteer = require("puppeteer");

const app = express();
const port = process.env.PORT || 3000;

// Explicit path to Chrome installed during postinstall
const executablePath = "/opt/render/.cache/puppeteer/chrome/linux-137.0.7151.55/chrome-linux64/chrome";

app.get("/diagnostics", async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).json({ error: "Missing URL" });
  }

  try {
    const browser = await puppeteer.launch({
      executablePath,
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 20000 });

    const title = await page.title();
    const html = await page.content();

    await browser.close();

    res.json({
      title,
      length: html.length,
      url,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});