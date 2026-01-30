const formAuth = document.getElementById('form-auth');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const messageBox = document.getElementById('message-box');
const btnDeconnexion = document.getElementById('btn-deconnexion');
const btnconnexion = document.getElementById('btn-connexion');
btnDeconnexion.style.display = 'none';




connexion = async (event) => {
    event.preventDefault();


    const data = {
        email: emailInput.value,
        password: passwordInput.value
    }

    const response = await fetch('/api/connexion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data )
    });

    if (response.ok) {
        // Rediriger vers la page d'accueil ou tableau de bord
        messageBox.textContent = 'Connexion réussie ! Redirection...';
        btnDeconnexion.style.display = 'block';
        btnconnexion.style.display = 'none';
        
    } else {
        const result = await response.json();
        let errorMessage = 'Erreur de connexion.';
        messageBox.textContent = errorMessage;
        console.log(result);
    }
    
        
}

formAuth.addEventListener('submit', connexion);


