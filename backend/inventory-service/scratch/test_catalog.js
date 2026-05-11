
const axios = require('axios');

const API_URL = 'http://localhost:3000/api/inventory/sales-catalog'; // Assuming through gateway or direct if local

async function testCatalog() {
  console.log('--- Testing Sales Catalog ---');
  
  // 1. Test Inventory category (Micas/Bases)
  // We need a real ID, but let's just test if the endpoint exists and returns 404 for a fake ID instead of 500
  try {
    const res = await axios.get(`${API_URL}/items`, {
      params: { sheetId: '507f1f77bcf86cd799439011', category: 'inventory' }
    });
    console.log('Inventory Test Result:', res.status, res.data.ok);
  } catch (err) {
    console.log('Inventory Test Result (Expected 404):', err.response?.status, err.response?.data?.message);
  }

  // 2. Test Contact Lenses category
  try {
    const res = await axios.get(`${API_URL}/items`, {
      params: { sheetId: '507f1f77bcf86cd799439011', category: 'contact-lenses' }
    });
    console.log('LC Test Result:', res.status, res.data.ok);
  } catch (err) {
    console.log('LC Test Result (Expected 404):', err.response?.status, err.response?.data?.message);
  }
}

testCatalog();
