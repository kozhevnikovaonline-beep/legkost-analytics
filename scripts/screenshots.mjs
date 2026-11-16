/**
 * Скриншоты для портфолио: 1440×900, светлая тема + 2 кадра в тёмной.
 * Нужен запущенный dev-сервер (npm run dev) и установленный Edge или Chrome.
 *   BASE=http://localhost:5173 node scripts/screenshots.mjs
 */
import { existsSync, mkdirSync } from "node:fs";
import puppeteer from "puppeteer-core";

const BASE = process.env.BASE ?? "http://localhost:5174";
const OUT = new URL("../docs/screenshots/", import.meta.url);
const BROWSERS = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const executablePath = process.env.BROWSER ?? BROWSERS.find((p) => existsSync(p));
if (!executablePath) throw new Error("Не найден Edge/Chrome — укажите путь в BROWSER");
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ executablePath, headless: true, args: ["--hide-scrollbars", "--lang=ru-RU"] });
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(hash, theme = "light") {
  await page.goto(`${BASE}/`, { waitUntil: "networkidle0" });
  await page.evaluate((t) => {
    localStorage.setItem("legkost-analytics:theme", JSON.stringify({ state: { theme: t }, version: 0 }));
  }, theme);
  await page.goto(`${BASE}/?shot=${Date.now()}#${hash}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => !document.querySelector('[data-slot="skeleton"]'), { timeout: 20_000 }).catch(() => undefined);
  await sleep(2200); // анимации графиков
}
async function shot(name) {
  await page.screenshot({ path: new URL(`${name}.png`, OUT), type: "png" });
  console.log("✓", name);
}

await open("/?p=30d");
await shot("01-summary");

await open("/marketing?p=30d");
await page.evaluate(() => {
  const row = [...document.querySelectorAll("tbody tr")].find((t) => t.textContent.includes("Посевы"));
  row?.querySelector('button[aria-label="Развернуть"]')?.click();
});
await sleep(400);
await shot("02-marketing");

await open("/funnel?p=90d");
await shot("03-funnel");

await open("/sales?p=30d");
await shot("04-sales");

await open("/clients?p=30d");
await shot("05-clients");

// Карточка клиентки с самым большим LTV среди пришедших за период
await page.evaluate(() => [...document.querySelectorAll("th button")].find((b) => b.textContent.startsWith("LTV"))?.click());
await sleep(1200);
await page.evaluate(() => document.querySelector("tbody tr")?.click());
await page.waitForFunction(() => location.hash.includes("/clients/u-"));
await sleep(2000);
await shot("06-client-card");

await open("/?p=30d", "dark");
await shot("07-summary-dark");

await open("/funnel?p=90d", "dark");
await page.evaluate(() => window.scrollTo(0, 560));
await sleep(800);
await shot("08-funnel-dark");

await browser.close();
