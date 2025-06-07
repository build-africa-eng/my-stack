const express = require('express');
const puppeteer = require('puppeteer');
const { executablePath } = "/opt/render/.cache/puppeteer/chrome/linux-137.0.7151.55/chrome-linux64/chrome";

const app = express();
const PORT = process.env.PORT || 3000;

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Render backend! Use /diagnostics?url=<url> for diagnostics.'
  });
});

// Diagnostics route
app.get('/diagnostics', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: executablePath(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    const screenshot = await page.screenshot({
      encoding: 'base64',
      fullPage: true
    });

    await browser.close();

    res.json({ url, screenshot });
  } catch (error) {
    console.error('Puppeteer error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});