import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';

// read .env manually
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*?)"?$/);
  if (match) env[match[1]] = match[2];
});

const CLIENT_ID = env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
const PORT = new URL(REDIRECT_URI).port || 5000;

function fetchJson(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { resolve({ error: 'Parse Error', raw: data }); }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  
  if (url.pathname === '/test-login') {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=${encodeURIComponent('https://www.googleapis.com/auth/youtube.readonly')}&access_type=offline&prompt=consent`;
    res.writeHead(302, { Location: authUrl });
    res.end();
    return;
  }
  
  if (url.pathname === '/api/auth/google/callback') {
    const code = url.searchParams.get('code');
    if (!code) {
      res.writeHead(400);
      return res.end('Error: No code returned. Did you cancel?');
    }
    
    try {
      const tokenBody = new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code: code,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code'
      }).toString();
      
      const tokenData = await fetchJson('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(tokenBody)
        },
        body: tokenBody
      });
      
      if (tokenData.error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        return res.end(`<h1>Token Error</h1><pre>${JSON.stringify(tokenData, null, 2)}</pre>`);
      }
      
      const ytData = await fetchJson('https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
      });
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (ytData.error) {
        res.end(`<h1>YouTube API Error</h1><p>The OAuth flow worked, but the YouTube API returned an error (it might not be enabled).</p><pre>${JSON.stringify(ytData, null, 2)}</pre>`);
      } else {
        res.end(`<h1>Success!</h1><p>Your Google Client ID, Secret, and YouTube Data API v3 are all working perfectly!</p><pre>${JSON.stringify(ytData, null, 2)}</pre>`);
      }
    } catch (e) {
      res.writeHead(500);
      res.end(`Server Error: ${e.message}`);
    }
    return;
  }
  
  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`\n==============================================`);
  console.log(`Test Server Running!`);
  console.log(`Click this link in your browser to test your OAuth & YouTube API:`);
  console.log(`http://localhost:${PORT}/test-login`);
  console.log(`==============================================\n`);
});
