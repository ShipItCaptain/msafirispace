/**
 * Msafiri Space — pilot WhatsApp OTP sender.
 *
 * Adapted from the Pochi project's pochi.whatsapp.client.js: automates a real
 * WhatsApp Web session (via whatsapp-web.js + Puppeteer) on a dedicated phone
 * number, instead of an official paid API. This is a deliberate, known
 * tradeoff for a fast pilot, not a long-term production decision:
 *
 * ponytail: this automates WhatsApp Web against WhatsApp's own Terms of
 * Service and the number can be banned if it sends too much, too fast, to
 * too many first-contact numbers -- exactly the pattern a public signup OTP
 * flow produces. Fine for testing with a small group. Before opening signup
 * to the public, replace this service with an official API (Twilio / Meta
 * Cloud API / Africa's Talking) -- the Django side only talks to this over
 * HTTP, so swapping it out never touches apps/users/services/otp.py again.
 *
 * Session auth is LocalAuth (scan the QR once, session persists to disk in
 * .wwebjs_auth/). No Postgres-backed RemoteAuth like Pochi's production
 * setup -- not worth building for something we already plan to replace.
 */
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// whatsapp-web.js drives a real Chrome tab via Puppeteer -- that tab can
// crash or get closed out from under it (e.g. mid-QR-refresh) and throws
// from deep inside an internal event handler, not from anything we called
// directly. Without this, that's an uncaught exception that kills the
// whole Node process. Log it and let the existing 'disconnected' handler's
// reconnect logic take over instead of dying.
process.on('uncaughtException', (err) => {
  console.error('[WA-OTP] Uncaught exception (continuing):', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('[WA-OTP] Unhandled rejection (continuing):', err?.message || err);
});

const PORT = process.env.WHATSAPP_SERVICE_PORT || 4001;
const INTERNAL_TOKEN = process.env.WHATSAPP_SERVICE_TOKEN || '';
const SESSION_ID = 'msafiri-otp';
const QR_TTL_MS = 60000;

let client = null;
let ready = false;
let initializing = false;
let currentQr = null;
let qrGeneratedAt = null;

const clearLocks = () => {
  const sessionDir = path.join('.wwebjs_auth', `session-${SESSION_ID}`);
  ['SingletonLock', 'SingletonCookie', 'SingletonSocket'].forEach((f) => {
    try { fs.unlinkSync(path.join(sessionDir, f)); } catch (_) {}
  });
};

const init = () => {
  if (initializing || ready) return;
  initializing = true;
  console.log('[WA-OTP] Initialising...');
  clearLocks();

  client = new Client({
    authStrategy: new LocalAuth({ clientId: SESSION_ID, dataPath: '.wwebjs_auth' }),
    puppeteer: {
      // No executablePath override: let Puppeteer launch the Chrome-for-Testing
      // build it ships matched to this puppeteer-core version. Pinning this to
      // the system-installed Google Chrome (as Pochi's original code does)
      // looks simpler, but system Chrome auto-updates past whatever CDP
      // protocol version puppeteer-core actually speaks -- that mismatch is
      // what caused the "Target closed" crash during setup here.
      ...(process.env.PUPPETEER_EXECUTABLE_PATH ? { executablePath: process.env.PUPPETEER_EXECUTABLE_PATH } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      headless: true,
      protocolTimeout: 300000,
    },
  });

  client.on('qr', (qr) => {
    currentQr = qr;
    qrGeneratedAt = Date.now();
    console.log(`[WA-OTP] QR ready -- open http://localhost:${PORT}/qr to scan it`);
  });

  client.on('authenticated', () => {
    currentQr = null;
    console.log('[WA-OTP] Authenticated, loading...');
  });

  client.on('ready', () => {
    ready = true;
    initializing = false;
    currentQr = null;
    console.log('[WA-OTP] Connected and ready to send codes.');
  });

  client.on('auth_failure', (msg) => {
    ready = false;
    initializing = false;
    console.error('[WA-OTP] Auth failed:', msg);
  });

  client.on('disconnected', async (reason) => {
    ready = false;
    initializing = false;
    console.warn('[WA-OTP] Disconnected:', reason);
    const stale = client;
    client = null;
    try { await stale.destroy(); } catch (_) {}
    setTimeout(() => init(), 10000);
  });

  client.initialize().catch((err) => {
    initializing = false;
    console.error('[WA-OTP] Initialization error:', err.message);
    setTimeout(() => init(), 15000);
  });
};

const getQrDataUrl = async () => {
  if (!currentQr) return null;
  if (Date.now() - (qrGeneratedAt || 0) > QR_TTL_MS) {
    currentQr = null;
    return null;
  }
  return QRCode.toDataURL(currentQr, { width: 300, margin: 2 });
};

const normalizePhone = (raw) => String(raw || '').replace(/[^0-9]/g, '');

const sendOtp = async (phoneNumber, code, expiryMinutes) => {
  if (!ready || !client) throw new Error('WhatsApp client not ready');
  const digits = normalizePhone(phoneNumber);
  if (!digits) throw new Error('Invalid phone number');
  const chatId = `${digits}@c.us`;
  const message =
    `🔐 *Your Msafiri Space verification code:*\n\n` +
    `*${code}*\n\n` +
    `Valid for ${expiryMinutes} minutes.\n` +
    `Do not share this code with anyone.`;
  await Promise.race([
    client.sendMessage(chatId, message),
    new Promise((_, reject) => setTimeout(() => reject(new Error('sendMessage timeout')), 15000)),
  ]);
};

// ── HTTP surface ──────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.get('/', (_req, res) => res.send('Msafiri WhatsApp OTP service is running.'));

app.get('/status', (_req, res) => {
  res.json({ ready, initializing, hasQr: !!currentQr });
});

app.get('/qr', async (_req, res) => {
  const dataUrl = await getQrDataUrl();
  if (ready) {
    return res.send('<h2>Connected ✅</h2><p>This number is already paired. No QR needed.</p>');
  }
  if (!dataUrl) {
    return res.send('<meta http-equiv="refresh" content="3"><p>Waiting for a QR code to generate…</p>');
  }
  res.send(`
    <meta http-equiv="refresh" content="20">
    <body style="font-family:sans-serif;text-align:center;padding-top:40px;">
      <h2>Scan with the dedicated WhatsApp number</h2>
      <img src="${dataUrl}" width="300" height="300" />
      <p>WhatsApp → Settings → Linked Devices → Link a Device</p>
    </body>
  `);
});

app.post('/send-otp', async (req, res) => {
  if (!INTERNAL_TOKEN || req.header('X-Internal-Token') !== INTERNAL_TOKEN) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }
  const { phone_number, code, expiry_minutes } = req.body || {};
  if (!phone_number || !code) {
    return res.status(400).json({ ok: false, error: 'phone_number and code are required' });
  }
  try {
    await sendOtp(phone_number, code, expiry_minutes || 10);
    res.json({ ok: true });
  } catch (err) {
    console.error('[WA-OTP] Send failed:', err.message);
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[WA-OTP] Listening on http://127.0.0.1:${PORT} (internal only)`);
  init();
});
