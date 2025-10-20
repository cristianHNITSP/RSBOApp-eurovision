const axios = require('axios');
const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL;

async function getUsers(req, res) {
  try {
    const response = await axios.get(`${USERS_SERVICE_URL}`, {
      headers: { cookie: req.headers.cookie || '' },
      withCredentials: true,
    });

    const setCookie = response.headers['set-cookie'];
    if (setCookie) res.setHeader('Set-Cookie', setCookie);

    res.json(response.data);
  } catch (err) {
    const status = err.response?.status || 500;
    res.status(status).json(err.response?.data || { error: 'Error interno del gateway' });
  }
}

module.exports = { getUsers };
