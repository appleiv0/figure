const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')
const { createServer } = require('https')

const DIST = path.join(__dirname, 'frontend/dist')
const API_TARGET = 'http://localhost:3302'
const PORT = 18500

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.json': 'application/json', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.webp': 'image/webp',
}

const CORS_ORIGINS = ['https://family.qlab.ai.kr', 'https://qlab.ai.kr', 'http://localhost:3001']

function addCorsHeaders(req, res) {
  const origin = req.headers.origin
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Key')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
}

function proxyRequest(req, res) {
  if (req.method === 'OPTIONS') {
    addCorsHeaders(req, res)
    res.writeHead(200)
    res.end()
    return
  }
  const target = API_TARGET + req.url.replace(/^\/api/, '')
  const parsed = new URL(target)
  const opts = {
    hostname: parsed.hostname, port: parsed.port,
    path: parsed.pathname + parsed.search,
    method: req.method, headers: { ...req.headers, host: parsed.host },
  }
  const proxy = http.request(opts, (pRes) => {
    addCorsHeaders(req, res)
    const headers = { ...pRes.headers }
    delete headers['access-control-allow-origin']
    res.writeHead(pRes.statusCode, { ...headers, ...Object.fromEntries(Object.entries({
      'Access-Control-Allow-Origin': res.getHeader('Access-Control-Allow-Origin'),
      'Access-Control-Allow-Credentials': 'true',
    }))})
    pRes.pipe(res)
  })
  proxy.on('error', () => { res.writeHead(502); res.end('Bad Gateway') })
  req.pipe(proxy)
}

function serveStatic(req, res) {
  let filePath = path.join(DIST, req.url.split('?')[0])
  if (filePath.endsWith('/')) filePath += 'index.html'
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html') // SPA fallback
  }
  const ext = path.extname(filePath)
  const mime = MIME[ext] || 'application/octet-stream'
  try {
    const data = fs.readFileSync(filePath)
    res.writeHead(200, { 'Content-Type': mime, 'Access-Control-Allow-Origin': '*' })
    res.end(data)
  } catch { res.writeHead(404); res.end('Not Found') }
}

// Self-signed cert for HTTPS
const { execSync } = require('child_process')
const certDir = path.join(__dirname, '.certs')
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir)
const keyFile = path.join(certDir, 'key.pem')
const certFile = path.join(certDir, 'cert.pem')
if (!fs.existsSync(keyFile)) {
  execSync(`openssl req -x509 -newkey rsa:2048 -keyout ${keyFile} -out ${certFile} -days 365 -nodes -subj "/CN=localhost"`)
}

const server = createServer(
  { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) },
  (req, res) => {
    if (req.url.startsWith('/api')) return proxyRequest(req, res)
    serveStatic(req, res)
  }
)

server.listen(PORT, () => console.log(`Family app serving on https://localhost:${PORT}`))
