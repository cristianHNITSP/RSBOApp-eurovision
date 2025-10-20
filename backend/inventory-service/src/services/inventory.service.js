async function getInventory(req, res) {
  res.json([
    { id: 1, name: 'Producto A', quantity: 10 },
    { id: 2, name: 'Producto B', quantity: 5 },
  ])
}

module.exports = { getInventory }
