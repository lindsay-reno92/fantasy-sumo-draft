const cookie = require('cookie');
const crypto = require('crypto');

const SESSION_SECRET = process.env.SESSION_SECRET || 'fantasy-sumo-draft-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Session helper
function signData(data) {
  const payload = Buffer.from(JSON.stringify(data)).toString('base64');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64');
  return `${payload}.${signature}`;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;
  
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid admin password' });
  }

  const sessionData = { userId: 'admin', sumoName: 'Admin', isAdmin: true };
  const sessionCookie = signData(sessionData);
  
  res.setHeader('Set-Cookie', cookie.serialize('session', sessionCookie, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60,
    path: '/'
  }));

  res.json({ message: 'Admin login successful', isAdmin: true });
}; 