// Vercel Serverless Function — Crée une session de paiement Stripe Checkout
// Authentifie le coach via son JWT Supabase (header Authorization: Bearer <token>)
// Le coachId est extrait du token vérifié côté serveur — jamais du body.
const Stripe = require("stripe");

async function getAuthenticatedCoachId(authHeader) {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const user = await res.json();
  return user?.id || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID;
  if (!stripeKey || !priceId) {
    console.error("Variables d'environnement Stripe manquantes");
    return res.status(500).json({ error: "Configuration serveur incomplète" });
  }

  const coachId = await getAuthenticatedCoachId(req.headers.authorization);
  if (!coachId) {
    return res.status(401).json({ error: "Non authentifié" });
  }

  const { email } = req.body || {};

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const appUrl = process.env.VITE_APP_URL || "https://fonte-coaching.vercel.app";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      customer_email: email || undefined,
      metadata: { coachId },
      success_url: `${appUrl}/#success`,
      cancel_url: `${appUrl}/#cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Erreur Stripe Checkout:", err.message);
    return res.status(500).json({ error: "Impossible de créer la session de paiement" });
  }
};
