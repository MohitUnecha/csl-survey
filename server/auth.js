const crypto = require('crypto');

const DEFAULT_ADMIN_USERNAME = 'cslxrcg';
const DEFAULT_ADMIN_PASSWORD = 'rutgerscslconsultinggroup4426';

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) {
    return null;
  }

  try {
    const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
    const separatorIndex = decoded.indexOf(':');

    if (separatorIndex === -1) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD,
  };
}

function requireAdminAuth(req, res, next) {
  const provided = parseBasicAuth(req.headers.authorization);
  const expected = getAdminCredentials();

  const isAuthorized = Boolean(
    provided &&
    safeEqual(provided.username, expected.username) &&
    safeEqual(provided.password, expected.password)
  );

  if (!isAuthorized) {
    res.set('WWW-Authenticate', 'Basic realm="CSL Admin"');
    return res.status(401).json({ error: 'Unauthorized', requiresAuth: true });
  }

  return next();
}

module.exports = {
  DEFAULT_ADMIN_PASSWORD,
  DEFAULT_ADMIN_USERNAME,
  getAdminCredentials,
  requireAdminAuth,
};
