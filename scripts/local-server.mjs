import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const port = Number(process.env.LOCAL_PORT || 3004);
const origin = `http://127.0.0.1:${port}`;
process.env.APP_URL ||= origin;
const routes = new Set([
  'company-ai', 'activity', 'ai', 'images', 'google', 'artifacts', 'invites', 'promo', 'telegram',
  'business-overview', 'approvals', 'content-agent', 'business-metrics', 'business-agent', 'ai-audit',
]);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.ico':'image/x-icon','.txt':'text/plain'};
const server = http.createServer(async (req, res) => {
  res.status = code => { res.statusCode = code; return res; };
  res.json = data => { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(data)); };
  res.send = data => res.end(data);
  res.redirect = (code, url) => { res.writeHead(code, {Location:url}); res.end(); };
  try {
    if (![ `127.0.0.1:${port}`, `localhost:${port}` ].includes(req.headers.host)) return res.status(403).json({error:'Invalid host'});
    const url = new URL(req.url, origin);
    if (url.pathname.startsWith('/api/')) {
      res.setHeader('Cache-Control','no-store');
      if (req.headers.origin && ![origin, `http://localhost:${port}`].includes(req.headers.origin)) return res.status(403).json({error:'Invalid origin'});
      const name = url.pathname.slice(5);
      if (!routes.has(name)) return res.status(404).json({error:'Not found'});
      req.query = Object.fromEntries(url.searchParams);
      let size = 0; const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 4 * 1024 * 1024) return res.status(413).json({error:'Request too large'});
        chunks.push(chunk);
      }
      if (size) {
        try { req.body = JSON.parse(Buffer.concat(chunks).toString()); }
        catch { return res.status(400).json({error:'Invalid JSON'}); }
      } else req.body = {};
      const {default: handler} = await import(`../api/${name}.mjs`);
      return await handler(req, res);
    }
    if (!['GET','HEAD'].includes(req.method)) return res.status(405).json({error:'Method not allowed'});
    const build = path.join(root,'build');
    const requested = decodeURIComponent(url.pathname);
    if (requested.split('/').some(part => part.startsWith('.'))) return res.status(404).json({error:'Not found'});
    let file = path.resolve(build, '.' + requested);
    if (!file.startsWith(build + path.sep) && file !== build) return res.status(404).json({error:'Not found'});
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) file = path.join(build,'index.html');
    res.setHeader('Content-Type',mime[path.extname(file)] || 'application/octet-stream');
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch {
    if (!res.headersSent) res.status(500).json({error:'Local server request failed. Check configuration.'});
    else res.end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Flow Space: ${origin}`));
