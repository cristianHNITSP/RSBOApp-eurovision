const axios = require('axios');

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

async function login(req, res) {
  try {
    const response = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body, {
      headers: { cookie: req.headers.cookie || '' }, // reenviar cookies
      withCredentials: true, // permitir cookies cross-origin
    });

    // reenviar Set-Cookie del microservicio
    const setCookie = response.headers['set-cookie'];
    if (setCookie) res.setHeader('Set-Cookie', setCookie);

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: 'Error interno del gateway' });
  }
}

module.exports = { login };
