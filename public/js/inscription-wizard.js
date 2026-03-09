let currentStep = 1;
const totalSteps = 4;

// Éléments DOM
const form = document.getElementById('inscriptionForm');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const errorMessage = document.getElementById('errorMessage');
const dateNaissanceInput = document.getElementById('dateNaissance');
const ageWarning = document.getElementById('ageWarning');
const motDePasseInput = document.getElementById('motDePasse');
const passwordStrengthBar = document.getElementById('passwordStrengthBar');

// Navigation entre les étapes
function showStep(step) {
    // Cacher toutes les étapes
    document.querySelectorAll('.wizard-step').forEach(s => {
        s.classList.remove('active');
    });

    // Afficher l'étape actuelle
    document.querySelector(`.wizard-step[data-step="${step}"]`).classList.add('active');

    // Mettre à jour la barre de progression
    document.querySelectorAll('.progress-bar .step').forEach((s, index) => {
        const stepNum = index + 1;
        if (stepNum < step) {
            s.classList.add('completed');
            s.classList.remove('active');
        } else if (stepNum === step) {
            s.classList.add('active');
            s.classList.remove('completed');
        } else {
            s.classList.remove('active', 'completed');
        }
    });

    // Gérer les boutons
    prevBtn.style.display = step === 1 ? 'none' : 'block';
    nextBtn.style.display = step === totalSteps ? 'none' : 'block';
    submitBtn.style.display = step === totalSteps ? 'block' : 'none';

    currentStep = step;
}

// Valider l'étape actuelle
function validateCurrentStep() {
    const currentStepElement = document.querySelector(`.wizard-step[data-step="${currentStep}"]`);
    const inputs = currentStepElement.querySelectorAll('input[required], select[required]');
    
    for (let input of inputs) {
        if (!input.value.trim()) {
            showError('Veuillez remplir tous les champs obligatoires');
            input.focus();
            return false;
        }

        // Validation spécifique par étape
        if (currentStep === 1) {
            // Vérifier l'âge
            if (input.name === 'dateNaissance') {
                const age = calculateAge(input.value);
                if (age < 16) {
                    showError('Vous devez avoir au moins 16 ans pour créer un compte');
                    return false;
                }
            }
        }

        if (currentStep === 2) {
            // Valider email
            if (input.name === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(input.value)) {
                    showError('Adresse email invalide');
                    return false;
                }
            }

            // Valider téléphone
            if (input.name === 'telephone') {
                const phone = input.value.replace(/\D/g, '');
                if (phone.length !== 10) {
                    showError('Numéro de téléphone invalide (10 chiffres requis)');
                    return false;
                }
            }
        }

        if (currentStep === 4) {
            // Valider mot de passe
            if (input.name === 'motDePasse') {
                if (input.value.length < 8) {
                    showError('Le mot de passe doit contenir au moins 8 caractères');
                    return false;
                }
                const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
                if (!passwordRegex.test(input.value)) {
                    showError('Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
                    return false;
                }
            }

            // Vérifier correspondance des mots de passe
            if (input.name === 'confirmerMotDePasse') {
                const motDePasse = document.querySelector('input[name="motDePasse"]').value;
                if (input.value !== motDePasse) {
                    showError('Les mots de passe ne correspondent pas');
                    return false;
                }
            }

            // Vérifier acceptation des conditions
            const conditionsCheckbox = document.querySelector('input[name="conditions"]');
            if (!conditionsCheckbox.checked) {
                showError('Vous devez accepter les conditions d\'utilisation');
                return false;
            }
        }
    }

    hideError();
    return true;
}

// Calculer l'âge
function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

// Vérifier l'âge en temps réel
dateNaissanceInput.addEventListener('change', function() {
    const age = calculateAge(this.value);
    if (age < 16) {
        ageWarning.style.display = 'block';
    } else {
        ageWarning.style.display = 'none';
    }
});

// Indicateur de force du mot de passe
motDePasseInput.addEventListener('input', function() {
    const password = this.value;
    let strength = 0;

    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    passwordStrengthBar.className = 'password-strength-bar';
    
    if (strength <= 2) {
        passwordStrengthBar.classList.add('strength-weak');
    } else if (strength <= 4) {
        passwordStrengthBar.classList.add('strength-medium');
    } else {
        passwordStrengthBar.classList.add('strength-strong');
    }
});

// Afficher un message d'erreur
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Cacher le message d'erreur
function hideError() {
    errorMessage.style.display = 'none';
}

// Bouton Suivant
nextBtn.addEventListener('click', function() {
    if (validateCurrentStep()) {
        if (currentStep < totalSteps) {
            showStep(currentStep + 1);
        }
    }
});

// Bouton Précédent
prevBtn.addEventListener('click', function() {
    if (currentStep > 1) {
        showStep(currentStep - 1);
    }
});

// Soumettre le formulaire
form.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!validateCurrentStep()) {
        return;
    }

    // Préparer les données
    const formData = new FormData(form);
    const data = {
        email: formData.get('email'),
        motDePasse: formData.get('motDePasse'),
        prenom: formData.get('prenom'),
        nom: formData.get('nom'),
        telephone: formData.get('telephone'),
        adresse: formData.get('adresse'),
        dateNaissance: formData.get('dateNaissance'),
        sexe: formData.get('sexe'),
        statut: formData.get('statut'),
        revenuAnnuel: parseFloat(formData.get('revenuAnnuel')),
        typeResidence: formData.get('typeResidence'),
        nas: formData.get('nas') || null
    };

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Inscription en cours...';

        const response = await fetch('/api/auth/inscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.succes) {
            // Stocker l'userId pour la vérification 2FA
            sessionStorage.setItem('userId', result.userId);
            sessionStorage.setItem('accountStatus', result.accountStatus);
            
            // Rediriger vers la page de vérification 2FA
            window.location.href = 'verification-2fa.html';
        } else {
            showError(result.message || 'Erreur lors de l\'inscription');
            submitBtn.disabled = false;
            submitBtn.textContent = 'S\'inscrire';
        }
    } catch (error) {
        console.error('Erreur:', error);
        showError('Une erreur est survenue. Veuillez réessayer.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'S\'inscrire';
    }
});

// Initialiser
showStep(1);