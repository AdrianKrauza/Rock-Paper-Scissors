import { readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises';
import { watch } from 'node:fs';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';
import postcss from 'postcss';
import autoprefixer from 'autoprefixer';
import CleanCSS from 'clean-css';
import { transformAsync } from '@babel/core';
import { minify as minifyJs } from 'terser';
import { minify as minifyHtml } from 'html-minifier-terser';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const src = path.join(root, 'src');
const dist = path.join(root, 'dist');
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true }).catch(error => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  const nested = await Promise.all(entries.map(entry => {
    const name = path.join(dir, entry.name);
    return entry.isDirectory() ? files(name) : [name];
  }));
  return nested.flat().sort();
}
async function save(name, data) {
  await mkdir(path.dirname(name), { recursive: true });
  await writeFile(name, data);
}
async function build() {
  await rm(dist, { recursive: true, force: true });
  const styles = new Map();
  for (const file of (await files(path.join(src, 'css'))).filter(f => f.endsWith('.css'))) {
    styles.set(path.relative(path.join(src, 'css'), file), await readFile(file, 'utf8'));
  }
  for (const file of await files(path.join(src, 'scss'))) {
    if (!file.endsWith('.scss') || path.basename(file).startsWith('_')) continue;
    const result = sass.compile(file);
    const prefixed = await postcss([autoprefixer({ overrideBrowserslist: ['last 3 versions'] })]).process(result.css, { from: file });
    const relative = path.relative(path.join(src, 'scss'), file).replace(/\.scss$/, '.css');
    styles.set(relative, prefixed.css);
  }
  const css = [...styles.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, css]) => css).join('\n');
  const result = new CleanCSS().minify(css);
  if (result.errors.length) throw new Error(result.errors.join('\n'));
  await save(path.join(dist, 'css/style.css'), result.styles);
  const js = [];
  for (const file of (await files(path.join(src, 'js'))).filter(f => f.endsWith('.js'))) {
    const transformed = await transformAsync(await readFile(file, 'utf8'), { filename: file, presets: ['@babel/preset-env'], babelrc: false, configFile: false });
    js.push(transformed.code);
  }
  await save(path.join(dist, 'js/script.js'), (await minifyJs(js.join('\n;\n'))).code);
  for (const file of await files(path.join(src, 'img'))) {
    const ext = path.extname(file).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) continue;
    const image = await sharp(file, { animated: true }).toBuffer();
    const original = await readFile(file);
    await save(path.join(dist, 'img', path.relative(path.join(src, 'img'), file)), image.length < original.length ? image : original);
  }
  for (const file of (await files(src)).filter(f => path.dirname(f) === src && f.endsWith('.html'))) {
    let html = await readFile(file, 'utf8');
    html = html.replace(/<!-- build:css -->([\s\S]*?)<!-- endbuild -->/g, (_, content) => content.replace(/<link\b[^>]*rel=["']stylesheet["'][^>]*>/g, '').trim() + '\n<link rel="stylesheet" href="css/style.css">');
    html = html.replace(/<!-- build:js -->[\s\S]*?<!-- endbuild -->/g, '<script src="js/script.js"></script>');
    await save(path.join(dist, path.basename(file)), await minifyHtml(html, { sortAttributes: true, sortClassName: true, collapseWhitespace: true }));
  }
  console.log('Built dist');
}
await build();
if (process.argv.includes('--serve')) {
  const clients = new Set();
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif' };
  const server = createServer(async (req, res) => {
    if (req.url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      res.write(': connected\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return;
    }
    try {
      const url = new URL(req.url, 'http://localhost');
      const filename = path.resolve(dist, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
      if (!filename.startsWith(dist + path.sep)) { res.writeHead(403).end(); return; }
      let data = await readFile(filename);
      const ext = path.extname(filename);
      if (ext === '.html') data = Buffer.concat([data, Buffer.from('<script>new EventSource("/__reload").onmessage=()=>location.reload()</script>')]);
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }).end(data);
    } catch { res.writeHead(404).end('Not found'); }
  });
  server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log('Serving http://127.0.0.1:' + server.address().port));
  let timer;
  let running = false;
  let pending = false;
  async function rebuild() {
    if (running) { pending = true; return; }
    running = true;
    try { await build(); for (const client of clients) client.write('data: reload\n\n'); }
    catch (error) { console.error(error); }
    finally { running = false; if (pending) { pending = false; void rebuild(); } }
  }
  watch(src, { recursive: true }, (_event, filename) => {
    if (!filename) return;
    clearTimeout(timer); timer = setTimeout(rebuild, 150);
  });
}
