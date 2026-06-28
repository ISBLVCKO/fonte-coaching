// Vercel Serverless Function — Webhook Stripe
// Écoute l'événement checkout.session.completed et passe le coach en plan "pro"
// dans app_storage (Supabase).
//
// Configurer dans Stripe Dashboard :
//   Endpoint URL : https://fonte-coaching.vercel.app/api/stripe-webhook
//   Événements   : checkout.session.completed
const Stripe = require("stripe");

// Désactiver le body parsing de Vercel pour vérifier la signature Stripe
// sur le corps brut (raw body requis par stripe.webhooks.constructEvent)
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2024-06-20",
  });

  // Récupérer le corps brut pour la vérification de signature
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    // Vercel fournit req.body en Buffer si bodyParser est désactivé via config
    const rawBody = req.body;
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Signature Stripe invalide :", err.message);
    return res.status(400).json({ error: `Webhook invalide : ${err.message}` });
  }

  // Traiter uniquement les paiements d'abonnement réussis
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const coachId = session.metadata?.coachId;

    if (!coachId) {
      console.error("coachId absent dans les métadonnées Stripe");
      return res.status(400).json({ error: "coachId manquant dans metadata" });
    }

    try {
      await upgradeCoachToPro(coachId);
      console.log(`Coach ${coachId} passé en plan Pro`);
    } catch (err) {
      console.error("Erreur mise à jour Supabase :", err.message);
      return res.status(500).json({ error: "Erreur mise à jour plan coach" });
    }
  }

  return res.status(200).json({ received: true });
};

// Mettre à jour le plan du coach dans Supabase (app_storage)
async function upgradeCoachToPro(coachId) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY; // clé service pour bypass RLS

  const profileKey = `coach_profile:${coachId}`;

  // Récupérer le profil actuel du coach
  const getRes = await fetch(
    `${supabaseUrl}/rest/v1/app_storage?key=eq.${encodeURIComponent(profileKey)}&select=value`,
    {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!getRes.ok) throw new Error(`GET profile failed: ${getRes.status}`);
  const rows = await getRes.json();

  // Construire le profil mis à jour
  let profile = rows.length ? JSON.parse(rows[0].value) : {};
  profile = { ...profile, plan: "pro", upgradedAt: new Date().toISOString() };

  // Sauvegarder via upsert
  const setRes = await fetch(`${supabaseUrl}/rest/v1/app_storage`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      key: profileKey,
      value: JSON.stringify(profile),
      updated_at: new Date().toISOString(),
    }),
  });

  if (!setRes.ok) throw new Error(`SET profile failed: ${setRes.status}`);
}

// Désactiver le body parser de Vercel pour recevoir le corps brut (requis par Stripe)
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
