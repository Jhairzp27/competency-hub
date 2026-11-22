const crypto = require('crypto');

function generateCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) return next();

  const tokenFromReq = req.body?._csrf || req.headers['x-csrf-token'];
  const tokenFromSession = req.session?.csrfToken;

  if (!tokenFromReq || !tokenFromSession) {
    return res.status(403).send('Solicitud inválida: token CSRF faltante.');
  }

  const bufA = Buffer.from(String(tokenFromReq));
  const bufB = Buffer.from(String(tokenFromSession));

  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return res.status(403).send('Solicitud inválida: token CSRF no coincide.');
  }

  next();
}

module.exports = { generateCsrfToken, verifyCsrfToken };