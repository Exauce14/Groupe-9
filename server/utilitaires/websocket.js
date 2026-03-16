const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initWebSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('🔌 Nouvelle connexion WebSocket:', socket.id);

    socket.on('authenticate', (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userRole = decoded.role;
        socket.emit('authenticated', { userId: decoded.id, role: decoded.role });
        console.log(`✅ Socket authentifié: User ${decoded.id} (${decoded.role})`);
      } catch (error) {
        if (error.name === 'TokenExpiredError') {
          console.log('⚠️ Token expiré pour socket:', socket.id);
          socket.emit('auth_error', { message: 'Session expirée', expired: true });
        } else {
          console.error('❌ Erreur authentification socket:', error.message);
          socket.emit('auth_error', { message: 'Token invalide' });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Déconnexion WebSocket:', socket.id);
    });
  });

  return io;
}

function sendNotificationToUser(userId, notification) {
  if (!io) return;
  
  const sockets = Array.from(io.sockets.sockets.values());
  const userSocket = sockets.find(s => s.userId === userId);
  
  if (userSocket) {
    userSocket.emit('new_notification', notification);
    console.log(`📨 Notification envoyée à l'utilisateur ${userId}`);
  }
}

function sendNotificationToAdmin(notification) {
  if (!io) return;
  
  const sockets = Array.from(io.sockets.sockets.values());
  const adminSockets = sockets.filter(s => s.userRole === 'admin');
  
  adminSockets.forEach(socket => {
    socket.emit('new_registration', notification);
    socket.emit('new_request', notification);
  });
  
  console.log(`📨 Notification envoyée aux admins (${adminSockets.length})`);
}

module.exports = {
  initWebSocket,
  sendNotificationToUser,
  sendNotificationToAdmin
};