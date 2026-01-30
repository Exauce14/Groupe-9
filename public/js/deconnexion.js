const messagesBox = document.getElementById('message-box');
const deconnexionBtn = document.getElementById('btn-deconnexion');
const connexionBtn = document.getElementById('btn-connexion');


deconnexion = async (event) => {
    event.preventDefault();



    const response = await fetch('/api/deconnexion', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    });
    
    if (response.ok) {
        messageBox.textContent = 'Déconnexion réussie !';
        connexionBtn.style.display = 'block';
        deconnexionBtn.style.display = 'none';
    }
    
}


btnDeconnexion.addEventListener('click', deconnexion)