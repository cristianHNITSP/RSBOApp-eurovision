async function getNotifications(req, res) {
  res.json([
    { id: 1, message: 'Notificación 1', read: false },
    { id: 2, message: 'Notificación 2', read: true },
  ])
}

module.exports = { getNotifications }
