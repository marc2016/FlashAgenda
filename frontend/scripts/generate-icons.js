import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generatePngIcons() {
  const svgPath = resolve(__dirname, '../public/favicon.svg');
  const svgContent = readFileSync(svgPath, 'utf-8');

  const browser = await chromium.launch();
  
  const sizes = [
    { name: 'apple-touch-icon.png', width: 180, height: 180 },
    { name: 'pwa-192x192.png', width: 192, height: 192 },
    { name: 'pwa-512x512.png', width: 512, height: 512 },
    { name: 'maskable-icon.png', width: 512, height: 512 },
  ];

  for (const icon of sizes) {
    const page = await browser.newPage({
      viewport: { width: icon.width, height: icon.height },
      deviceScaleFactor: 1,
    });

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              width: ${icon.width}px;
              height: ${icon.height}px;
              background: transparent;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg {
              width: 100%;
              height: 100%;
            }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;

    await page.setContent(html);
    const outputPath = resolve(__dirname, `../public/${icon.name}`);
    await page.screenshot({ path: outputPath, omitBackground: true });
    console.log(`Generated ${icon.name} (${icon.width}x${icon.height})`);
  }

  await browser.close();
}

generatePngIcons().catch(console.error);
