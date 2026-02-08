/*
    Simple dev server for test pages.
    Serves build/, test/, and node_modules/ at the root level,
    replicating the old gulp-webserver behavior.

    Usage: node scripts/dev-server.js
*/

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PORT = 3004;

// Directories to serve at the root level, checked in order
const SERVE_DIRS = ['build', 'test', 'node_modules'];

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.mp4': 'video/mp4',
    '.svg': 'image/svg+xml',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.json': 'application/json',
    '.map': 'application/json',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
};

function findFile(urlPath) {
    for (const dir of SERVE_DIRS) {
        const filePath = path.join(ROOT, dir, urlPath);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            return filePath;
        }
    }
    return null;
}

function serveFile(res, filePath, stat) {
    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, {
        'Content-Type': mimeType,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
}

function serveRange(req, res, filePath, stat) {
    const range = req.headers.range;
    const total = stat.size;
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    const ext = path.extname(filePath);
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${total}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': end - start + 1,
        'Content-Type': mimeType,
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
}

const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];

    // Default page
    if (urlPath === '/') urlPath = '/test.html';

    const filePath = findFile(urlPath);
    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found: ' + urlPath);
        return;
    }

    const stat = fs.statSync(filePath);

    // Support range requests for video seeking
    if (req.headers.range) {
        serveRange(req, res, filePath, stat);
    } else {
        serveFile(res, filePath, stat);
    }
});

server.listen(PORT, () => {
    console.log(`Dev server running at http://localhost:${PORT}`);
    console.log(`  test.html:     http://localhost:${PORT}/test.html`);
    console.log(`  test_api.html: http://localhost:${PORT}/test_api.html`);
});
