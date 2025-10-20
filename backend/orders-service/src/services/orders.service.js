async function getOrders(req, res) {
  res.json([
    { id: 1, product: 'Producto A', quantity: 2 },
    { id: 2, product: 'Producto B', quantity: 1 },
  ])
}

module.exports = { getOrders }
