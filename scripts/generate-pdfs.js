const {mkdirSync, readFileSync, writeFileSync} = require('fs');
const {resolve} = require('path');
const {chromium} = require('playwright');

const root = resolve(__dirname, '..');
const buildDir = resolve(root, 'build');
const downloadsDir = resolve(buildDir, 'downloads');
const staticDownloadsDir = resolve(root, 'static', 'downloads');

const documents = [
  {title: 'Product User Guide', path: 'index.html'},
  {title: 'Device Wi-Fi Setup and Token', path: 'guide/device-wifi-token/index.html'},
  {title: 'Quick Start', path: 'guide/quick-start/index.html'},
  {title: 'Device Token and Email Activation', path: 'guide/device-token-activation/index.html'},
  {title: 'AI Companion', path: 'guide/ai-companion/index.html'},
  {title: 'Device Control Modes', path: 'guide/modes-overview/index.html'},
  {title: 'Disconnect and Reconnect', path: 'guide/reconnect-disconnect/index.html'},
  {title: 'Troubleshooting', path: 'troubleshooting/index.html'},
  {title: 'FAQ', path: 'faq/index.html'},
];

const pdfTargets = [
  {
    title: 'Quick Start',
    filename: 'quick-start',
    docs: documents.filter((doc) => doc.path === 'guide/quick-start/index.html'),
  },
  {
    title: 'Full Product User Guide',
    filename: 'product-user-guide',
    docs: documents,
  },
];

function extractMarkdown(html, sourcePath) {
  const match = html.match(/<div class="theme-doc-markdown markdown">([\s\S]*?)<\/div><\/article>/);
  if (!match) {
    throw new Error(`Could not find doc content in ${sourcePath}`);
  }

  return match[1]
    .replace(/<a href="#[^"]*" class="hash-link"[\s\S]*?<\/a>/g, '')
    .replace(/<header><h1>/g, '<h1>')
    .replace(/<\/h1><\/header>/g, '</h1>')
    .replace(/src="\//g, `src="file://${buildDir}/`)
    .replace(/href="\//g, 'href="https://docs.example.com/');
}

function renderPrintHtml(target) {
  const sections = target.docs.map((doc, index) => {
    const htmlPath = resolve(buildDir, doc.path);
    const html = readFileSync(htmlPath, 'utf8');
    const content = extractMarkdown(html, doc.path);
    return `<section class="doc-section${index > 0 ? ' page-break' : ''}">${content}</section>`;
  });

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${target.title}</title>
  <style>
    @page { size: A4; margin: 16mm 14mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: #24221f;
      background: #fff;
      font: 12.5px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    }
    h1, h2, h3 { color: #143f39; line-height: 1.22; page-break-after: avoid; }
    h1 { font-size: 28px; margin: 0 0 18px; }
    h2 { font-size: 19px; margin: 24px 0 10px; }
    h3 { font-size: 15px; margin: 18px 0 8px; }
    p, ul, ol, figure, img { break-inside: avoid; }
    img { display: block; max-width: 100%; height: auto; margin: 14px 0 18px; border: 1px solid #e7e2d9; border-radius: 6px; }
    a { color: #1f7a6d; text-decoration: none; overflow-wrap: anywhere; }
    code { padding: 1px 4px; border-radius: 4px; background: #f2eee6; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    ul, ol { padding-left: 21px; }
    .page-break { break-before: page; }
    [class*="placeholder"], figure {
      margin: 18px 0;
      border: 1px dashed #c6bdac;
      border-radius: 8px;
      overflow: hidden;
      background: #f8f4ec;
    }
    [class*="preview"] {
      min-height: 88px;
      display: grid;
      place-items: center;
      background: #f3ede1;
    }
    [class*="play"], [class*="icon"] {
      display: inline-grid;
      place-items: center;
      min-width: 58px;
      min-height: 34px;
      border-radius: 999px;
      background: #1f7a6d;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
    }
    figcaption { display: grid; gap: 3px; margin: 0; padding: 10px 12px; color: #3f3a31; }
    figcaption span { color: #62594d; font-size: 12px; }
    [class*="theme-admonition"] {
      margin: 14px 0 18px;
      border: 0;
      border-left: 4px solid #1f7a6d;
      border-radius: 6px;
      padding: 8px 12px;
      background: #f4faf7;
      break-inside: avoid;
    }
    [class*="admonitionHeading"] {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 4px;
      color: #143f39;
      font-weight: 700;
      text-transform: capitalize;
    }
    [class*="admonitionIcon"] {
      display: inline-flex;
      width: 14px;
      height: 14px;
      flex: 0 0 14px;
    }
    [class*="admonitionIcon"] svg {
      width: 14px;
      height: 14px;
      max-width: 14px;
      max-height: 14px;
      display: block;
    }
    [class*="admonitionContent"] p {
      margin: 0;
    }
  </style>
</head>
<body>
${sections.join('\n')}
</body>
</html>`;
}

async function printPdf(browser, htmlPath, pdfPath) {
  const page = await browser.newPage();
  await page.goto(`file://${htmlPath}`, {waitUntil: 'load'});
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
  });
  await page.close();
}

async function main() {
  mkdirSync(downloadsDir, {recursive: true});
  mkdirSync(staticDownloadsDir, {recursive: true});

  const browser = await chromium.launch();

  try {
    for (const target of pdfTargets) {
      const htmlPath = resolve(downloadsDir, `${target.filename}.print.html`);
      const pdfPath = resolve(downloadsDir, `${target.filename}.pdf`);
      writeFileSync(htmlPath, renderPrintHtml(target));
      await printPdf(browser, htmlPath, pdfPath);
      writeFileSync(resolve(staticDownloadsDir, `${target.filename}.pdf`), readFileSync(pdfPath));
      console.log(`Generated ${pdfPath}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
