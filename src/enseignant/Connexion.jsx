import React, { useState } from 'react';

// Connexion avec le compte PLAI (e-mail + mot de passe) ; réinitialisation par e-mail.
export default function Connexion({ auth, redirection }) {
  const [email, setEmail] = useState('');
  const [mdp, setMdp] = useState('');
  const [message, setMessage] = useState('');
  const [occupe, setOccupe] = useState(false);

  async function seConnecter(e) {
    e.preventDefault();
    setOccupe(true); setMessage('');
    const { error } = await auth.signInWithPassword({ email: email.trim(), password: mdp });
    setOccupe(false);
    if (error) setMessage('Connexion refusée : vérifier l’e-mail et le mot de passe.');
  }

  async function reinitialiser() {
    if (!email.trim()) { setMessage('Saisir d’abord l’e-mail, puis demander la réinitialisation.'); return; }
    const { error } = await auth.resetPasswordForEmail(email.trim(), { redirectTo: redirection });
    setMessage(error ? 'L’envoi a échoué : réessayer plus tard.' : 'E-mail envoyé : suivre le lien reçu.');
  }

  return (
    <form className="ens-carte" onSubmit={seConnecter}>
      <h1>Espace enseignant</h1>
      <label htmlFor="ens-email">E-mail du compte PLAI</label>
      <input id="ens-email" type="email" autoComplete="username" placeholder="prenom.nom@ecole.be" value={email} onChange={e => setEmail(e.target.value)} required />
      <p className="aide">Le même compte que pour les autres outils PLAI.</p>
      <label htmlFor="ens-mdp">Mot de passe</label>
      <input id="ens-mdp" type="password" autoComplete="current-password" value={mdp} onChange={e => setMdp(e.target.value)} required />
      <p className="aide">Mot de passe oublié : saisir l’e-mail puis choisir « Mot de passe oublié ».</p>
      <div className="ens-actions">
        <button type="submit" disabled={occupe}>Se connecter</button>
        <button type="button" onClick={reinitialiser}>Mot de passe oublié</button>
      </div>
      {message && <p role="status" className="ens-message">{message}</p>}
    </form>
  );
}
