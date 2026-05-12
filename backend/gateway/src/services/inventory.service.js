const axios = require('axios');

const INVENTORY_SERVICE_URL = process.env.INVENTORY_SERVICE_URL;

/**
 * Obtiene el inventario desde el microservicio correspondiente.
 * Reenvía cookies y encabezados necesarios para mantener sesión.
 */
async function getInventory(req, res) {
  try {
    const targetUrl = `${INVENTORY_SERVICE_URL}${req.originalUrl.replace('/api/inventory', '')}`;
    console.log(`🔁 Proxying GET -> ${targetUrl}`);

    // 🔹 Solicitud al microservicio
    const response = await axios.get(targetUrl, {
      headers: {
        ...req.headers,
        cookie: req.headers.cookie || '',
        host: undefined, // evitar conflicto de host
      },
      withCredentials: true,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // 🔹 Si el microservicio devuelve cookies, las reenviamos al navegador
    const setCookie = response.headers['set-cookie'];
    if (setCookie) {
      const fixedCookies = setCookie.map(c => {
        if (process.env.NODE_ENV !== 'production') {
          // Eliminar atributos que bloquean cookies en desarrollo
          c = c.replace(/; Secure/gi, '');
          c = c.replace(/; SameSite=[^;]+/gi, '; SameSite=Lax');
        }
        return c;
      });
      res.setHeader('Set-Cookie', fixedCookies);
    }

    // 🔹 Enviamos la respuesta final al cliente
    res.status(response.status).json(response.data);

  } catch (err) {
    console.error('❌ Error al obtener inventario:', err.response?.data || err.message);
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: 'Error interno del gateway' });
  }
}

module.exports = { getInventory };
