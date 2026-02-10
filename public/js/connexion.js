const formAuth = document.getElementById('form-auth');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('message-box');
const btnDeconnexion = document.getElementById('btn-deconnexion');
const btnconnexion = document.getElementById('btn-connexion');

btnDeconnexion.style.display = 'none';

const connexion = async (event) => {
    event.preventDefault();

    const data = {
        email: emailInput.value,
        password: passwordInput.value
    };

    try {
        const response = await fetch('/api/connexion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        // 👈ON LIT LE MESSAGE DU SERVEUR
        const result = await response.json();

        if (response.ok) {
            // Connexion réussie
            messageBox.textContent = result.message;
            btnDeconnexion.style.display = 'block';
            btnconnexion.style.display = 'none';

        } else {
            //Connexion refusée (401 / 403 / 500)
            messageBox.textContent = result.message;
        }

    } catch (error) {
        console.error(error);
        messageBox.textContent = 'Erreur lors de la connexion.';
    }
};


formAuth.addEventListener('submit', connexion);
