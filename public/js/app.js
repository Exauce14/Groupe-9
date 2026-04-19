/**
 * Script principal pour le tableau de bord
 */

const API_URL = '/api';
let token = localStorage.getItem('token');
let socket;

// Vérifier l'authentification
if (!token) {
    window.location.href = 'index.html';
}

// Initialiser WebSocket pour notifications temps réel
function initWebSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('✅ WebSocket connecté');
        socket.emit('authenticate', token);
    });

    socket.on('authenticated', (data) => {
        console.log('✅ WebSocket authentifié:', data);
    });

    socket.on('new_notification', (notification) => {
        console.log('📨 Nouvelle notification:', notification);
        afficherNotificationToast(notification);
        chargerNotifications();
    });

    socket.on('authentication_error', (error) => {
        console.error('❌ Erreur authentification WebSocket:', error);
    });

    socket.on('disconnect', () => {
        console.log('🔌 WebSocket déconnecté');
    });
}

// Afficher une notification toast
function afficherNotificationToast(notification) {
    // Créer l'élément toast
    const toast = document.createElement('div');
    toast.className = 'notification-toast';
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        max-width: 350px;
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;

    const iconMap = {
        'request_approved': '✅',
        'request_rejected': '❌',
        'request_submitted': '📝',
        'card_blocked': '🔒',
        'card_unblocked': '🔓',
        'transaction': '💰',
        'system': 'ℹ️'
    };

    toast.innerHTML = `
        <div style="display: flex; align-items: start; gap: 10px;">
            <span style="font-size: 24px;">${iconMap[notification.type] || '🔔'}</span>
            <div style="flex: 1;">
                <strong style="display: block; margin-bottom: 5px;">${notification.titre}</strong>
                <p style="margin: 0; color: #6b7280; font-size: 14px;">${notification.message}</p>
            </div>
        </div>
    `;

    document.body.appendChild(toast);

    // Retirer après 5 secondes
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Ajouter les animations CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Charger les notifications non lues
async function chargerNotifications() {
    try {
        const response = await fetch(`${API_URL}/notifications/non-lues/count`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.succes) {
            const badge = document.getElementById('notificationsBadge');
            if (badge && data.count > 0) {
                badge.textContent = data.count;
                badge.style.display = 'inline-block';
            } else if (badge) {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Erreur chargement notifications:', error);
    }
}

// Déconnexion
async function deconnexion() {
    const ok = await showConfirm('Voulez-vous vraiment vous déconnecter ?', {
        title: 'Déconnexion',
        confirmText: 'Se déconnecter',
        cancelText: 'Rester connecté'
    });
    if (!ok) return;
    localStorage.removeItem('token');
    if (socket) socket.disconnect();
    window.location.href = 'index.html';
}

// Initialiser au chargement
document.addEventListener('DOMContentLoaded', function() {
    initWebSocket();
    chargerNotifications();
    
    // Rafraîchir les notifications toutes les 30 secondes
    setInterval(chargerNotifications, 30000);
});