const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  console.log('--- authMiddleware ---');
  console.log('Cookies recibidas:', req.cookies); // 🔹 ver qué cookies llegan

  const token = req.cookies.auth_token; // leer cookie HttpOnly
  if (!token) {
    console.warn('❌ No hay token en la cookie');
    return res.status(401).json({ error: 'No autorizado: cookie no enviada' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decodificado correctamente:', decoded); // 🔹 debug
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Error verificando token:', err.message);
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;
