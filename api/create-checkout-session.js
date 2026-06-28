// Vercel Serverless Function — Crée une session de paiement Stripe Checkout
// Appelée depuis le frontend quand le coach clique sur "Passer à Pro"
const Stripe = require("stripe");

module.exports = async function handler(req, res) {
  // Autoriser uniquement les requêtes POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const { coachId, email } = req.body || {};

  if (!coachId) {
    return res.status(400).json({ error: "coachId manquant" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  const appUrl = process.env.VITE_APP_URL || "https://fonte-coaching.vercel.app";

  try {
    // Créer la session Stripe Checkout en mode abonnement
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      // Pré-remplir l'email si disponible
      customer_email: email || undefined,
      // Métadonnées pour identifier le coach dans le webhook
      metadata: {
        coachId,
      },
      // URLs de redirection après paiement
      success_url: `${appUrl}/#success`,
      cancel_url: `${appUrl}/#cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Checkout:", err.message);
    return res.status(500).json({ error: "Impossible de créer la session de paiement" });
  }
};
