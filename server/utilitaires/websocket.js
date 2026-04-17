const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

// Initialise le serveur WebSocket Socket.IO sur le serveur HTTP.
// Chaque client doit s'authentifier avec son token JWT via l'événement "authenticate".
// Associe l'identifiant utilisateur et le rôle à la socket pour les envois ciblés.
function initWebSocket(server) {
  io = socketIO(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
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

// Envoie une notification en temps réel à un utilisateur spécifique via sa socket active.
function sendNotificationToUser(userId, notification) {
  if (!io) return;
  
  const sockets = Array.from(io.sockets.sockets.values());
  const userSocket = sockets.find(s => s.userId === userId);
  
  if (userSocket) {
    userSocket.emit('new_notification', notification);
    console.log(`📨 Notification envoyée à l'utilisateur ${userId}`);
  }
}

// Diffuse une notification à tous les administrateurs connectés via WebSocket.
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