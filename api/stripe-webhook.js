// Vercel Serverless Function — Webhook Stripe
// Écoute checkout.session.completed et passe le coach en plan "pro" dans Supabase.
// bodyParser: false (voir config en bas) — le corps brut est nécessaire pour la signature HMAC.
const Stripe = require("stripe");

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Méthode non autorisée" });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeKey || !webhookSecret) {
    console.error("Variables d'environnement Stripe manquantes");
    return res.status(500).json({ error: "Configuration serveur incomplète" });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Signature Stripe invalide :", err.message);
    return res.status(400).json({ error: `Webhook invalide : ${err.message}` });
  }

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

async function upgradeCoachToPro(coachId) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Variables Supabase manquantes");
  }

  const profileKey = `coach_profile:${coachId}`;

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

  let profile = rows.length ? JSON.parse(rows[0].value) : {};
  profile = { ...profile, plan: "pro", upgradedAt: new Date().toISOString() };

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
      // La clé service bypasse RLS : sans coach_id explicite, une ligne créée ici
      // serait orpheline (coach_id NULL) et invisible pour le coach (policy coach_select).
      coach_id: coachId,
      updated_at: new Date().toISOString(),
    }),
  });

  if (!setRes.ok) throw new Error(`SET profile failed: ${setRes.status}`);
}

// Désactiver le body parser de Vercel — le corps brut est requis par Stripe
module.exports.config = {
  api: {
    bodyParser: false,
  },
};
