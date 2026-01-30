// Version en fonction fléchée
export const isNomValide = (nom) =>
    typeof nom === 'string' &&
    nom.trim().length > 0 &&
    nom.length <= 30;
export const isMailValide = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
export const isPasswordValide = (password) => {
    if (typeof password !== 'string') return false;

    return (
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
    );
};
export const isAgeValide = (age) => {
    const ageNumber = Number(age);

    return (
        Number.isInteger(ageNumber) &&
        ageNumber > 0 &&
        ageNumber < 120
    );
};
export const isTelephoneValide = (telephone) => {
    const phoneRegex = /^\+?[0-9]{7,15}$/;
    return phoneRegex.test(telephone);
}
export const isNASValide = (nas) => {
    const nasRegex = /^[0-9]{9}$/;
    return nasRegex.test(nas);
}
export const isDateDeNaissanceValide = (dateString) => {
    if (typeof dateString !== 'string') return false;

    const date = new Date(dateString);
    const now = new Date();

    if (isNaN(date.getTime())) return false;
    if (date >= now) return false;

    // âge minimum : 18 ans
    const age = now.getFullYear() - date.getFullYear();
    const hasHadBirthday =
        now.getMonth() > date.getMonth() ||
        (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());

    const realAge = hasHadBirthday ? age : age - 1;

    return realAge >= 18 && realAge <= 120;
};
export const isAdresseDomicileValide = (adresse) => {
    return typeof adresse === 'string' && adresse.trim().length > 0;
}   
