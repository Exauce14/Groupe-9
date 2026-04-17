/**
 * Script pour les pages d'authentification
 */

const API_URL = '/api';

// Page de connexion
if (document.getElementById('connexionForm')) {
    document.getElementById('connexionForm').addEventListener('submit', async function(e) {
        e.preventDefault();

        const submitBtn = this.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('errorMessage');
        
        const email = document.querySelector('input[name="email"]').value;
        const motDePasse = document.querySelector('input[name="motDePasse"]').value;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Connexion...';
            errorDiv.style.display = 'none';

            const response = await fetch(`${API_URL}/auth/connexion`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, motDePasse })
            });

            const data = await response.json();

            if (data.succes && data.requires2FA) {
                sessionStorage.setItem('userId', data.userId);
                window.location.href = 'verification-2fa.html';
            } else if (!data.succes) {
                errorDiv.textContent = data.message;
                errorDiv.style.display = 'block';
                submitBtn.disabled = false;
                submitBtn.textContent = 'Se connecter';
            }
        } catch (error) {
            console.error('Erreur:', error);
            errorDiv.textContent = 'Une erreur est survenue. Veuillez réessayer.';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Se connecter';
        }
    });
}