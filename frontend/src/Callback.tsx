import { useEffect } from 'react';
import { userManager } from './auth';
import { useNavigate } from 'react-router';

export const Callback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Cette fonction lit le paramètre `code` dans l’URL,
    // échange le code contre les tokens et stocke le résultat.
    userManager
      .signinCallback()
      .then(() => {
        // Redirige vers la page d’accueil (ou celle voulue)
        navigate('/');
      })
      .catch(err => {
        console.error('OIDC callback error:', err);
        // Vous pouvez afficher une UI d’erreur ici
      });
  }, [navigate]);

  return <p>Processing authentication…</p>;
};
