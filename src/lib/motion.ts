import { browser } from '$app/environment';

/** Vrai si l'utilisateur a demandé moins d'animations (respecte prefers-reduced-motion). */
const prefersReduced = browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Durée d'un slide d'ouverture/fermeture (0 si reduced-motion). */
export const slideDuration = prefersReduced ? 0 : 200;
