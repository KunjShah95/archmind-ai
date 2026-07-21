import { chromium } from "playwright";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.resolve(__dirname, "..", "public", "og-image.svg");
const pngPath = path.resolve(__dirname, "..", "public", "og-image.png");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });

// Navigate to the SVG file
await page.goto(`file://${svgPath}`);

// Wait for any animations to start
await page.waitForTimeout(500);

// Take screenshot at exactly 1200x630
await page.screenshot({ path: pngPath, fullPage: true });

await browser.close();

console.log(`✅ OG image rendered to ${pngPath}`);
