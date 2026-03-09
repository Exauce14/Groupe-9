// Vérifier si le token est expiré ET si le statut du compte a changé
async function verifierToken() {
    const token = localStorage.getItem('token');
    
    if (!token) {
        if (window.location.pathname !== '/index.html' && !window.location.pathname.includes('inscription')) {
            window.location.href = 'index.html';
        }
        return false;
    }

    try {
        // Décoder le token (sans vérification de signature)
        const payload = JSON.parse(atob(token.split('.')[1]));
        
        // Vérifier l'expiration
        const maintenant = Math.floor(Date.now() / 1000);
        
        if (payload.exp && payload.exp < maintenant) {
            console.log('⚠️ Token expiré - Redirection vers login');
            localStorage.removeItem('token');
            alert('Votre session a expiré. Veuillez vous reconnecter.');
            window.location.href = 'index.html';
            return false;
        }

        // ✅ NOUVEAU : Vérifier si le statut du compte a changé côté serveur
        await verifierStatutCompte();

        return true;
    } catch (error) {
        console.error('Erreur vérification token:', error);
        localStorage.removeItem('token');
        window.location.href = 'index.html';
        return false;
    }
}

// ✅ NOUVELLE FONCTION : Vérifier le statut actuel du compte
async function verifierStatutCompte() {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
        const response = await fetch('http://localhost:3000/api/utilisateurs/mon-profil', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) return;

        const data = await response.json();

        if (data.succes) {
            const payload = JSON.parse(atob(token.split('.')[1]));
            
            // Si le statut a changé de pending à active
            if (payload.accountStatus === 'pending' && data.utilisateur.statut_compte === 'active') {
                console.log('✅ Compte approuvé ! Rechargement...');
                
                // Afficher message de succès
                alert('🎉 Félicitations ! Votre compte a été approuvé. La page va se recharger.');
                
                // Forcer déconnexion et reconnexion pour obtenir le nouveau token
                localStorage.removeItem('token');
                window.location.href = 'index.html';
            }
            
            // Si le compte est suspendu
            if (data.utilisateur.statut_compte === 'suspended') {
                localStorage.removeItem('token');
                alert('⚠️ Votre compte a été suspendu. Contactez le support.');
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Erreur vérification statut:', error);
    }
}

// Vérifier toutes les 30 secondes (au lieu de 5 minutes)
setInterval(verifierToken, 30 * 1000);

// Vérifier au chargement
verifierToken();