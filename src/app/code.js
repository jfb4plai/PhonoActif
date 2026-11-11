// Code anonyme de l'élève : lettres, chiffres et tiret, 1 à 12 caractères (jamais un nom ; il reste sur l'appareil).
export const codeValide = c => typeof c === 'string' && /^[A-Za-z0-9-]{1,12}$/.test(c);
