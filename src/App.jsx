import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Plus, ArrowLeft, Dumbbell, Apple, MessageCircle, User, Trash2, X, Send, Copy, Check,
  LayoutDashboard, Users, ListChecks, Calendar as CalendarIcon, BarChart3, Search,
  AlertTriangle, Link2, Menu,
} from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY;

const SB_HEADERS = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  "Content-Type": "application/json",
};

async function safeGet(key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_storage?key=eq.${encodeURIComponent(key)}&select=value`, { headers: SB_HEADERS });
    if (!res.ok) return null;
    const rows = await res.json();
    if (!rows.length) return null;
    return JSON.parse(rows[0].value);
  } catch { return null; }
}

async function safeSet(key, value) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_storage`, {
      method: "POST",
      headers: { ...SB_HEADERS, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ key, value: JSON.stringify(value), updated_at: new Date().toISOString() }),
    });
    return res.ok;
  } catch { return false; }
}

async function safeDelete(key) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_storage?key=eq.${encodeURIComponent(key)}`, { method: "DELETE", headers: SB_HEADERS });
    return res.ok;
  } catch { return false; }
}

const KEYS = {
  students: "students:index",
  student: (id) => `student:${id}`,
  chat: (id) => `chat:${id}`,
  gyms: "gyms:index",
  sessions: "planning:sessions",
};

function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4); }
function todayISO() { return new Date().toISOString().slice(0, 10); }
function formatDate(iso) { const d = new Date(iso + "T00:00:00"); return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }); }
function formatTime(ts) { return new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }); }
function initials(name) { return (name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join(""); }

function newStudent({ name, sex, height, weight, age, sessionsPerWeek, mealsPerDay }) {
  const id = uid();
  return {
    id, name, sex, age: age || "", height: height || "",
    sessionsPerWeek: sessionsPerWeek || "",
    mealsPerDay: mealsPerDay || "",
    weightHistory: weight ? [{ date: todayISO(), value: Number(weight) }] : [],
    training: { planName: "", days: [] },
    diet: { planName: "", calories: "", protein: "", carbs: "", fat: "", meals: [] },
    createdAt: Date.now(),
  };
}

const MUSCLE_GROUPS = ["Pectoraux", "Dos", "Jambes", "Épaules", "Bras", "Abdominaux"];

const EXERCISE_PRESETS = [
  { name: "Écarté à la poulie basse", group: "Pectoraux" },
  { name: "Développé couché barre", group: "Pectoraux" },
  { name: "Développé incliné barre", group: "Pectoraux" },
  { name: "Développé incliné haltère", group: "Pectoraux" },
  { name: "Écarté couché", group: "Pectoraux" },
  { name: "Développé couché haltère", group: "Pectoraux" },
  { name: "Développé incliné haltère rotation", group: "Pectoraux" },
  { name: "Développé pec machine", group: "Pectoraux" },
  { name: "Écarté incliné", group: "Pectoraux" },
  { name: "Traction", group: "Dos" },
  { name: "T Bar", group: "Dos" },
  { name: "Tirage verticale prise large", group: "Dos" },
  { name: "Tirage verticale prise serrée", group: "Dos" },
  { name: "Tirage à genoux poulie haute", group: "Dos" },
  { name: "Rowing haltère sur chaise romaine", group: "Dos" },
  { name: "Tirage horizontale", group: "Dos" },
  { name: "Pull over à la poulie haute", group: "Dos" },
  { name: "Squat", group: "Jambes" },
  { name: "Fente bulgare", group: "Jambes" },
  { name: "Fente haltère en marchant", group: "Jambes" },
  { name: "Presse verticale / horizontale", group: "Jambes" },
  { name: "Leg extension", group: "Jambes" },
  { name: "Leg curl", group: "Jambes" },
  { name: "Mollet à la presse", group: "Jambes" },
  { name: "Mollet debout", group: "Jambes" },
  { name: "Élévation latérale", group: "Épaules" },
  { name: "Élévation latérale à la poulie", group: "Épaules" },
  { name: "Développé Arnold", group: "Épaules" },
  { name: "Développé militaire haltère", group: "Épaules" },
  { name: "Développé militaire barre", group: "Épaules" },
  { name: "Élévation frontale", group: "Épaules" },
  { name: "Face-pull", group: "Épaules" },
  { name: "Shrug à la barre", group: "Épaules" },
  { name: "Développé épaule machine", group: "Épaules" },
  { name: "Oiseau haltère sur banc incliné", group: "Épaules" },
  { name: "Tirage au menton poulie basse", group: "Épaules" },
  { name: "Curl barre droite", group: "Bras" },
  { name: "Curl au pupitre", group: "Bras" },
  { name: "Curl spider", group: "Bras" },
  { name: "Curl concentré prise marteau", group: "Bras" },
  { name: "Curl biceps EZ", group: "Bras" },
  { name: "Curl barre poulie basse", group: "Bras" },
  { name: "Curl marteau unilatéral à la poulie", group: "Bras" },
  { name: "Barre au front", group: "Bras" },
  { name: "Dips", group: "Bras" },
  { name: "Développé couché serré", group: "Bras" },
  { name: "Abdos crunch banc décliné", group: "Abdominaux" },
  { name: "Relevé de jambes", group: "Abdominaux" },
  { name: "Oblique sur chaise romaine", group: "Abdominaux" },
  { name: "Abdos rouleau", group: "Abdominaux" },
];

const DIET_LIBRARY = {
  "diete-seche": {
    id: "diete-seche", label: "Sèche",
    description: "Déficit calorique modéré · Haute protéine · 5 repas/jour",
    kcal: "~1900 kcal", protein: "~185g", carbs: "~160g", fat: "~55g",
    plans: [
      {
        id: "ds-j1", label: "Journée A — Classique",
        meals: [
          { id: "ds-j1-m1", label: "Petit-déjeuner", notes: "À prendre 30 min après le réveil. Riche en protéines pour limiter le catabolisme matinal.", items: [
            { id: uid(), name: "Flocons d'avoine", amount: 60, kcal: 370, protein: 13, carbs: 59, fat: 7 },
            { id: uid(), name: "Blanc d'œuf", amount: 150, kcal: 52, protein: 11, carbs: 0.5, fat: 0.2 },
            { id: uid(), name: "Fromage blanc 0%", amount: 150, kcal: 64, protein: 11, carbs: 5, fat: 0 },
            { id: uid(), name: "Fruits rouges", amount: 80, kcal: 40, protein: 0.6, carbs: 10, fat: 0.2 },
          ]},
          { id: "ds-j1-m2", label: "Collation matinale", notes: "Shaker à prendre 1h30 avant l'entraînement si séance le matin, ou en milieu de matinée.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Pomme", amount: 150, kcal: 78, protein: 0.5, carbs: 21, fat: 0.3 },
          ]},
          { id: "ds-j1-m3", label: "Déjeuner", notes: "Repas principal. Prépare en avance pour la semaine (batch cooking). Cuisson vapeur ou plancha.", items: [
            { id: uid(), name: "Blanc de poulet", amount: 200, kcal: 220, protein: 46, carbs: 0, fat: 2.4 },
            { id: uid(), name: "Riz blanc cuit", amount: 180, kcal: 234, protein: 4.3, carbs: 51, fat: 0.5 },
            { id: uid(), name: "Brocoli", amount: 150, kcal: 51, protein: 4.2, carbs: 7, fat: 0.5 },
            { id: uid(), name: "Huile d'olive", amount: 10, kcal: 90, protein: 0, carbs: 0, fat: 10 },
          ]},
          { id: "ds-j1-m4", label: "Collation post-workout", notes: "À prendre dans les 30 min après l'effort. Cruciale pour la récupération musculaire.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Banane", amount: 120, kcal: 107, protein: 1.3, carbs: 27, fat: 0.4 },
          ]},
          { id: "ds-j1-m5", label: "Dîner", notes: "Repas léger, sans glucides complexes. Favorise la récupération nocturne.", items: [
            { id: uid(), name: "Saumon frais", amount: 180, kcal: 374, protein: 36, carbs: 0, fat: 25 },
            { id: uid(), name: "Patate douce cuite", amount: 150, kcal: 129, protein: 2.4, carbs: 30, fat: 0.2 },
            { id: uid(), name: "Haricots verts", amount: 150, kcal: 37, protein: 2.4, carbs: 6, fat: 0.3 },
          ]},
        ],
      },
      {
        id: "ds-j2", label: "Journée B — Sans gluten",
        meals: [
          { id: "ds-j2-m1", label: "Petit-déjeuner", notes: "Option sans gluten. Les œufs entiers apportent des acides aminés essentiels et des oméga-3.", items: [
            { id: uid(), name: "Œuf entier", amount: 150, kcal: 215, protein: 18, carbs: 1, fat: 15 },
            { id: uid(), name: "Fromage blanc 0%", amount: 200, kcal: 86, protein: 15, carbs: 7, fat: 0 },
            { id: uid(), name: "Fruits rouges", amount: 100, kcal: 50, protein: 0.7, carbs: 12, fat: 0.3 },
          ]},
          { id: "ds-j2-m2", label: "Shaker pré-workout", notes: "À prendre 45 min avant l'entraînement. La caféine du café améliore les performances.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Compote de pomme", amount: 100, kcal: 52, protein: 0.3, carbs: 11, fat: 0.2 },
          ]},
          { id: "ds-j2-m3", label: "Déjeuner", notes: "Recette : dinde en dés sautée à l'ail + quinoa cuit + salade de crudités. Assaisonnement : citron + herbes.", items: [
            { id: uid(), name: "Blanc de dinde", amount: 200, kcal: 218, protein: 44, carbs: 0, fat: 2 },
            { id: uid(), name: "Quinoa cuit", amount: 150, kcal: 180, protein: 6.6, carbs: 32, fat: 3 },
            { id: uid(), name: "Tomate", amount: 150, kcal: 27, protein: 1.3, carbs: 5.2, fat: 0.3 },
            { id: uid(), name: "Concombre", amount: 100, kcal: 15, protein: 0.6, carbs: 3.1, fat: 0.1 },
            { id: uid(), name: "Huile d'olive", amount: 10, kcal: 90, protein: 0, carbs: 0, fat: 10 },
          ]},
          { id: "ds-j2-m4", label: "Collation post-workout", notes: "Shaker de récupération. La whey + la banane reconstituent les stocks de glycogène.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Banane", amount: 100, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
          ]},
          { id: "ds-j2-m5", label: "Dîner", notes: "Recette : cabillaud vapeur + légumes rôtis au four (courgettes, poivrons, oignons) + fromage blanc en dessert.", items: [
            { id: uid(), name: "Cabillaud", amount: 200, kcal: 176, protein: 38, carbs: 0, fat: 1.6 },
            { id: uid(), name: "Courgette", amount: 200, kcal: 34, protein: 2.6, carbs: 5.4, fat: 0.4 },
            { id: uid(), name: "Fromage blanc 0%", amount: 150, kcal: 64, protein: 11, carbs: 5, fat: 0 },
          ]},
        ],
      },
      {
        id: "ds-j3", label: "Journée C — Végétarienne",
        meals: [
          { id: "ds-j3-m1", label: "Petit-déjeuner protéiné", notes: "Version végétarienne. Le skyr et les œufs couvrent les besoins protéiques du matin.", items: [
            { id: uid(), name: "Skyr nature", amount: 200, kcal: 120, protein: 20, carbs: 8, fat: 0.4 },
            { id: uid(), name: "Blanc d'œuf", amount: 100, kcal: 35, protein: 7.2, carbs: 0.3, fat: 0.1 },
            { id: uid(), name: "Flocons d'avoine", amount: 50, kcal: 185, protein: 6.4, carbs: 32, fat: 3.4 },
            { id: uid(), name: "Fruits rouges", amount: 100, kcal: 50, protein: 0.7, carbs: 12, fat: 0.3 },
          ]},
          { id: "ds-j3-m2", label: "Collation matinale", notes: "Les amandes sont riches en graisses saines et limitent les fringales.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Amandes", amount: 20, kcal: 116, protein: 4.3, carbs: 2, fat: 10 },
          ]},
          { id: "ds-j3-m3", label: "Déjeuner", notes: "Recette : bowl de légumineuses — lentilles + œufs durs + légumes crus + vinaigrette légère.", items: [
            { id: uid(), name: "Lentilles cuites", amount: 200, kcal: 230, protein: 18, carbs: 40, fat: 0.8 },
            { id: uid(), name: "Œuf entier", amount: 100, kcal: 143, protein: 12, carbs: 0.7, fat: 10 },
            { id: uid(), name: "Épinards frais", amount: 100, kcal: 23, protein: 2.9, carbs: 1.4, fat: 0.4 },
            { id: uid(), name: "Tomate", amount: 100, kcal: 18, protein: 0.9, carbs: 3.5, fat: 0.2 },
            { id: uid(), name: "Huile d'olive", amount: 8, kcal: 72, protein: 0, carbs: 0, fat: 8 },
          ]},
          { id: "ds-j3-m4", label: "Collation post-workout", notes: "Shaker végétal ou whey standard. Le fromage blanc ajoute des caséines pour la récupération longue.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Fromage blanc 0%", amount: 100, kcal: 43, protein: 7.3, carbs: 3.3, fat: 0 },
          ]},
          { id: "ds-j3-m5", label: "Dîner", notes: "Recette : tofu sauté aux légumes + patate douce + fromage blanc. Assaisonnement soja + gingembre.", items: [
            { id: uid(), name: "Tofu ferme", amount: 200, kcal: 160, protein: 18, carbs: 4, fat: 8 },
            { id: uid(), name: "Patate douce cuite", amount: 100, kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
            { id: uid(), name: "Brocoli", amount: 150, kcal: 51, protein: 4.2, carbs: 7, fat: 0.5 },
          ]},
        ],
      },
    ],
  },
  "diete-masse": {
    id: "diete-masse", label: "Prise de masse",
    description: "Surplus calorique contrôlé · Prise de masse propre · 5 repas/jour",
    kcal: "~2800 kcal", protein: "~200g", carbs: "~320g", fat: "~75g",
    plans: [
      {
        id: "dm-j1", label: "Journée A — Classique",
        meals: [
          { id: "dm-j1-m1", label: "Petit-déjeuner", notes: "Gros repas matinal pour charger les muscles en glucides dès le réveil. Prépare la veille si besoin.", items: [
            { id: uid(), name: "Flocons d'avoine", amount: 100, kcal: 370, protein: 13, carbs: 59, fat: 7 },
            { id: uid(), name: "Œuf entier", amount: 150, kcal: 215, protein: 18, carbs: 1, fat: 15 },
            { id: uid(), name: "Blanc d'œuf", amount: 100, kcal: 35, protein: 7.2, carbs: 0.3, fat: 0.1 },
            { id: uid(), name: "Banane", amount: 120, kcal: 107, protein: 1.3, carbs: 27, fat: 0.4 },
            { id: uid(), name: "Beurre de cacahuète", amount: 20, kcal: 118, protein: 5, carbs: 4, fat: 10 },
          ]},
          { id: "dm-j1-m2", label: "Shaker pré-workout", notes: "À prendre 45 min avant l'entraînement. Les glucides rapides alimentent l'effort, la whey protège les muscles.", items: [
            { id: uid(), name: "Whey protéine", amount: 40, kcal: 150, protein: 32, carbs: 4, fat: 2 },
            { id: uid(), name: "Banane", amount: 120, kcal: 107, protein: 1.3, carbs: 27, fat: 0.4 },
            { id: uid(), name: "Flocons d'avoine", amount: 30, kcal: 111, protein: 3.9, carbs: 20, fat: 2.1 },
          ]},
          { id: "dm-j1-m3", label: "Déjeuner", notes: "Repas post-workout si entraînement le matin. Recette : riz blanc + poulet mariné + légumes vapeur + huile d'olive.", items: [
            { id: uid(), name: "Blanc de poulet", amount: 250, kcal: 275, protein: 58, carbs: 0, fat: 3 },
            { id: uid(), name: "Riz blanc cuit", amount: 250, kcal: 325, protein: 6, carbs: 71, fat: 0.6 },
            { id: uid(), name: "Brocoli", amount: 150, kcal: 51, protein: 4.2, carbs: 7, fat: 0.5 },
            { id: uid(), name: "Huile d'olive", amount: 15, kcal: 135, protein: 0, carbs: 0, fat: 15 },
          ]},
          { id: "dm-j1-m4", label: "Collation après-midi", notes: "Pour maintenir le flux d'acides aminés entre le déjeuner et le dîner. Les amandes ajoutent des graisses saines.", items: [
            { id: uid(), name: "Fromage blanc 0%", amount: 200, kcal: 86, protein: 15, carbs: 7, fat: 0 },
            { id: uid(), name: "Amandes", amount: 30, kcal: 174, protein: 6.4, carbs: 3, fat: 15 },
            { id: uid(), name: "Fruits rouges", amount: 100, kcal: 50, protein: 0.7, carbs: 12, fat: 0.3 },
          ]},
          { id: "dm-j1-m5", label: "Dîner", notes: "Recette : saumon + patate douce + haricots verts. La caséine du fromage blanc avant le coucher optimise la synthèse protéique nocturne.", items: [
            { id: uid(), name: "Saumon frais", amount: 200, kcal: 416, protein: 40, carbs: 0, fat: 28 },
            { id: uid(), name: "Patate douce cuite", amount: 200, kcal: 172, protein: 3.2, carbs: 40, fat: 0.3 },
            { id: uid(), name: "Haricots verts", amount: 150, kcal: 37, protein: 2.4, carbs: 6, fat: 0.3 },
            { id: uid(), name: "Fromage blanc 0%", amount: 200, kcal: 86, protein: 15, carbs: 7, fat: 0 },
          ]},
        ],
      },
      {
        id: "dm-j2", label: "Journée B — Haute énergie",
        meals: [
          { id: "dm-j2-m1", label: "Petit-déjeuner bulk", notes: "Recette pancakes protéinés : mélange flocons + blancs + 1 œuf + cannelle → cuisson poêle. Sirop d'érable autorisé.", items: [
            { id: uid(), name: "Flocons d'avoine", amount: 100, kcal: 370, protein: 13, carbs: 59, fat: 7 },
            { id: uid(), name: "Blanc d'œuf", amount: 200, kcal: 70, protein: 14.4, carbs: 0.6, fat: 0.2 },
            { id: uid(), name: "Œuf entier", amount: 100, kcal: 143, protein: 12, carbs: 0.7, fat: 10 },
            { id: uid(), name: "Beurre de cacahuète", amount: 30, kcal: 177, protein: 7.4, carbs: 6, fat: 15 },
            { id: uid(), name: "Banane", amount: 100, kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
          ]},
          { id: "dm-j2-m2", label: "Shaker masse", notes: "Shaker hypercalorique maison. Mixe tout ensemble. Peut remplacer un repas les jours sans appétit.", items: [
            { id: uid(), name: "Whey protéine", amount: 40, kcal: 150, protein: 32, carbs: 4, fat: 2 },
            { id: uid(), name: "Flocons d'avoine", amount: 60, kcal: 222, protein: 7.7, carbs: 40, fat: 4.2 },
            { id: uid(), name: "Beurre de cacahuète", amount: 20, kcal: 118, protein: 5, carbs: 4, fat: 10 },
            { id: uid(), name: "Banane", amount: 120, kcal: 107, protein: 1.3, carbs: 27, fat: 0.4 },
          ]},
          { id: "dm-j2-m3", label: "Déjeuner", notes: "Recette : bœuf haché extra-lean + pâtes + sauce tomate maison. Cuire les pâtes al dente (index glycémique plus bas).", items: [
            { id: uid(), name: "Bœuf haché 5%", amount: 200, kcal: 210, protein: 40, carbs: 0, fat: 10 },
            { id: uid(), name: "Pâtes cuites", amount: 250, kcal: 330, protein: 11, carbs: 67, fat: 1.5 },
            { id: uid(), name: "Tomate", amount: 150, kcal: 27, protein: 1.3, carbs: 5.2, fat: 0.3 },
            { id: uid(), name: "Huile d'olive", amount: 10, kcal: 90, protein: 0, carbs: 0, fat: 10 },
          ]},
          { id: "dm-j2-m4", label: "Collation récupération", notes: "Après l'entraînement ou en milieu d'après-midi. Le mélange whey + skyr assure un flux protéique continu.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Skyr nature", amount: 150, kcal: 90, protein: 15, carbs: 6, fat: 0.3 },
            { id: uid(), name: "Fruits rouges", amount: 80, kcal: 40, protein: 0.6, carbs: 10, fat: 0.2 },
          ]},
          { id: "dm-j2-m5", label: "Dîner", notes: "Recette : escalope de veau + riz + épinards sautés à l'ail. Fromage blanc 0% avant de dormir pour les caséines.", items: [
            { id: uid(), name: "Veau (escalope)", amount: 200, kcal: 220, protein: 42, carbs: 0, fat: 5 },
            { id: uid(), name: "Riz blanc cuit", amount: 200, kcal: 260, protein: 4.8, carbs: 57, fat: 0.4 },
            { id: uid(), name: "Épinards frais", amount: 150, kcal: 35, protein: 4.3, carbs: 2.1, fat: 0.6 },
            { id: uid(), name: "Fromage blanc 0%", amount: 200, kcal: 86, protein: 15, carbs: 7, fat: 0 },
          ]},
        ],
      },
      {
        id: "dm-j3", label: "Journée C — Jour de repos",
        meals: [
          { id: "dm-j3-m1", label: "Petit-déjeuner léger", notes: "Jour sans entraînement : légèrement moins de glucides mais protéines maintenues. Le skyr rassasie longtemps.", items: [
            { id: uid(), name: "Skyr nature", amount: 200, kcal: 120, protein: 20, carbs: 8, fat: 0.4 },
            { id: uid(), name: "Flocons d'avoine", amount: 70, kcal: 259, protein: 9.1, carbs: 48, fat: 4.9 },
            { id: uid(), name: "Amandes", amount: 20, kcal: 116, protein: 4.3, carbs: 2, fat: 10 },
            { id: uid(), name: "Fruits rouges", amount: 100, kcal: 50, protein: 0.7, carbs: 12, fat: 0.3 },
          ]},
          { id: "dm-j3-m2", label: "Collation matinale", notes: "Collation légère. Le fromage blanc + fruits rouges est rapide à préparer et facile à emporter.", items: [
            { id: uid(), name: "Fromage blanc 0%", amount: 200, kcal: 86, protein: 15, carbs: 7, fat: 0 },
            { id: uid(), name: "Fruits rouges", amount: 100, kcal: 50, protein: 0.7, carbs: 12, fat: 0.3 },
          ]},
          { id: "dm-j3-m3", label: "Déjeuner", notes: "Recette : cabillaud en papillote + patate douce + haricots verts. Simple, léger, efficace pour la récupération.", items: [
            { id: uid(), name: "Cabillaud", amount: 250, kcal: 220, protein: 47.5, carbs: 0, fat: 2 },
            { id: uid(), name: "Patate douce cuite", amount: 200, kcal: 172, protein: 3.2, carbs: 40, fat: 0.3 },
            { id: uid(), name: "Haricots verts", amount: 150, kcal: 37, protein: 2.4, carbs: 6, fat: 0.3 },
            { id: uid(), name: "Huile d'olive", amount: 10, kcal: 90, protein: 0, carbs: 0, fat: 10 },
          ]},
          { id: "dm-j3-m4", label: "Collation après-midi", notes: "Les oléagineux + whey maintiennent la synthèse protéique même les jours sans sport.", items: [
            { id: uid(), name: "Whey protéine", amount: 30, kcal: 113, protein: 24, carbs: 3, fat: 1.5 },
            { id: uid(), name: "Amandes", amount: 30, kcal: 174, protein: 6.4, carbs: 3, fat: 15 },
            { id: uid(), name: "Pomme", amount: 150, kcal: 78, protein: 0.5, carbs: 21, fat: 0.3 },
          ]},
          { id: "dm-j3-m5", label: "Dîner", notes: "Recette : saumon + quinoa + épinards. Plus digeste que le riz le soir. Fromage blanc avant coucher = caséine lente.", items: [
            { id: uid(), name: "Saumon frais", amount: 180, kcal: 374, protein: 36, carbs: 0, fat: 25 },
            { id: uid(), name: "Quinoa cuit", amount: 150, kcal: 180, protein: 6.6, carbs: 32, fat: 3 },
            { id: uid(), name: "Épinards frais", amount: 150, kcal: 35, protein: 4.3, carbs: 2.1, fat: 0.6 },
            { id: uid(), name: "Fromage blanc 0%", amount: 200, kcal: 86, protein: 15, carbs: 7, fat: 0 },
          ]},
        ],
      },
    ],
  },
};

const PROGRAM_LIBRARY = {
  "pro-masse": {
    id: "pro-masse", label: "Pro Masse",
    sessions: [
      { id: "pm-pec", label: "Séance 1 — Pectoraux", warmup: "5 min de rameur", rest: "2 min entre chaque exercice", exercises: [
        { name: "Écarté à la poulie basse", sets: "3", reps: "12", rest: "1min30", technique: "3s de pic contraction" },
        { name: "Développé couché barre", sets: "4", reps: "8", rest: "2min", technique: "" },
        { name: "Développé incliné barre", sets: "4", reps: "8", rest: "2min", technique: "" },
        { name: "Développé incliné haltère", sets: "3", reps: "10", rest: "2min", technique: "3s de pic contraction" },
        { name: "Écarté couché", sets: "4", reps: "10", rest: "1min30", technique: "3s de pic contraction" },
        { name: "Abdos crunch banc décliné", sets: "3", reps: "15", rest: "1min", technique: "" },
      ]},
      { id: "pm-dos", label: "Séance 2 — Dos", warmup: "5 min de rameur", rest: "2 min entre chaque exercice", exercises: [
        { name: "Traction", sets: "4", reps: "10", rest: "1min30", technique: "Lesté, poids du corps ou assisté" },
        { name: "T Bar", sets: "4", reps: "8", rest: "2min", technique: "Alternative : rowing barre" },
        { name: "Tirage verticale prise large", sets: "4", reps: "10", rest: "2min", technique: "2s phase excentrique" },
        { name: "Tirage à genoux poulie haute", sets: "4", reps: "10", rest: "1min30", technique: "(5rép 5s) x 3" },
        { name: "Rowing haltère sur chaise romaine", sets: "5", reps: "12", rest: "1min30", technique: "" },
        { name: "Relevé de jambes", sets: "4", reps: "échec", rest: "1min", technique: "Échec = autant de réps possible" },
      ]},
      { id: "pm-bras", label: "Séance 3 — Bras", warmup: "5 min de rameur", rest: "2 min entre chaque exercice", exercises: [
        { name: "Curl barre droite", sets: "4", reps: "10+10", rest: "1min30", technique: "Super-set avec barre au front" },
        { name: "Curl au pupitre", sets: "4", reps: "10+10", rest: "1min30", technique: "Super-set avec développé couché serré" },
        { name: "Curl spider", sets: "4", reps: "10+10", rest: "1min30", technique: "Super-set avec dips" },
        { name: "Curl concentré prise marteau", sets: "4", reps: "12", rest: "1min30", technique: "12 réps pour chaque bras" },
        { name: "Abdos crunch banc décliné", sets: "4", reps: "12", rest: "1min", technique: "3s phase excentrique" },
        { name: "Relevé de jambes", sets: "4", reps: "échec", rest: "1min", technique: "Échec = autant de réps possible" },
        { name: "Oblique sur chaise romaine", sets: "4", reps: "12", rest: "1min", technique: "12 réps pour chaque côté" },
      ]},
      { id: "pm-jambes", label: "Séance 4 — Jambes", warmup: "5 min de vélo", rest: "2 min entre chaque exercice", exercises: [
        { name: "Squat", sets: "4", reps: "8", rest: "2min30", technique: "" },
        { name: "Fente bulgare", sets: "4", reps: "10", rest: "2min", technique: "10 réps de chaque jambe" },
        { name: "Presse verticale / horizontale", sets: "4", reps: "12", rest: "2min", technique: "4s excentrique" },
        { name: "Leg extension", sets: "4", reps: "12", rest: "2min", technique: "4s excentrique" },
        { name: "Leg curl", sets: "4", reps: "12", rest: "2min", technique: "4s excentrique" },
        { name: "Mollet à la presse", sets: "4", reps: "12", rest: "1min", technique: "" },
      ]},
      { id: "pm-epaules", label: "Séance 5 — Épaules", warmup: "5 min de rameur", rest: "2 min entre chaque exercice", exercises: [
        { name: "Élévation latérale", sets: "4", reps: "10", rest: "1min30", technique: "1 moitié + 1 complète = 1 répétition" },
        { name: "Développé Arnold", sets: "4", reps: "8", rest: "1min30", technique: "" },
        { name: "Développé militaire haltère", sets: "4", reps: "10", rest: "1min30", technique: "" },
        { name: "Élévation frontale", sets: "4", reps: "10+10", rest: "1min30", technique: "Super-set avec face-pull, 3s excentrique" },
        { name: "Shrug à la barre", sets: "4", reps: "10", rest: "1min30", technique: "" },
        { name: "Abdos rouleau", sets: "4", reps: "12", rest: "1min", technique: "" },
        { name: "Relevé de jambes", sets: "4", reps: "échec", rest: "1min", technique: "Échec = autant de réps possible" },
      ]},
    ],
  },
  "pro-seche": {
    id: "pro-seche", label: "Pro Sèche",
    sessions: [
      { id: "ps-pec", label: "Séance 1 — Pectoraux", warmup: "5 min de rameur + 15 min de fractionné", rest: "2 min entre chaque exercice", exercises: [
        { name: "Écarté à la poulie basse", sets: "3", reps: "15", rest: "1min30", technique: "(5rép 5s) x 3" },
        { name: "Développé incliné haltère rotation", sets: "4", reps: "12", rest: "1min30", technique: "2s concentrique + 2s excentrique" },
        { name: "Développé couché haltère", sets: "4", reps: "8", rest: "1min30", technique: "1 moitié + 1 complète = 1 répétition" },
        { name: "Développé pec machine", sets: "3", reps: "35", rest: "1min30", technique: "35 réps pyramidal" },
        { name: "Écarté incliné", sets: "3", reps: "10", rest: "1min30", technique: "1 moitié + 1 complète = 1 répétition" },
        { name: "Abdos crunch banc décliné", sets: "4", reps: "12", rest: "1min", technique: "3s phase excentrique" },
      ]},
      { id: "ps-dos", label: "Séance 2 — Dos", warmup: "5 min de rameur", rest: "2 min entre chaque exercice", exercises: [
        { name: "Traction", sets: "4", reps: "10-12", rest: "1min30", technique: "Lesté, poids du corps ou assisté" },
        { name: "Tirage verticale prise large", sets: "4", reps: "8", rest: "2min", technique: "" },
        { name: "Tirage verticale prise serrée", sets: "4", reps: "10", rest: "2min", technique: "35 réps pyramidal" },
        { name: "Tirage horizontale", sets: "4", reps: "10", rest: "1min30", technique: "1 moitié + 1 complète = 1 répétition" },
        { name: "Pull over à la poulie haute", sets: "5", reps: "12", rest: "1min30", technique: "3s pic contraction" },
        { name: "Relevé de jambes", sets: "4", reps: "12", rest: "1min", technique: "" },
      ]},
      { id: "ps-jambes", label: "Séance 3 — Jambes", warmup: "5 min de vélo", rest: "2 min entre chaque exercice", exercises: [
        { name: "Leg extension", sets: "3", reps: "15", rest: "1min30", technique: "(5rép 5s) x 3" },
        { name: "Leg curl", sets: "3", reps: "15", rest: "1min30", technique: "(5rép 5s) x 3" },
        { name: "Squat", sets: "4", reps: "10", rest: "1min30", technique: "" },
        { name: "Fente haltère en marchant", sets: "4", reps: "12", rest: "1min30", technique: "12 réps pour chaque jambe" },
        { name: "Presse verticale / horizontale", sets: "4", reps: "10", rest: "1min30", technique: "1 moitié + 1 complète = 1 répétition" },
        { name: "Mollet debout", sets: "4", reps: "15", rest: "1min30", technique: "" },
      ]},
      { id: "ps-epaules", label: "Séance 4 — Épaules", warmup: "5 min de rameur", rest: "2 min entre chaque exercice", exercises: [
        { name: "Élévation latérale à la poulie", sets: "3", reps: "15", rest: "1min30", technique: "(5rép 5s) x 3" },
        { name: "Développé militaire barre", sets: "3", reps: "15", rest: "1min30", technique: "(5rép 5s) x 3" },
        { name: "Développé épaule machine", sets: "3", reps: "35", rest: "1min30", technique: "35 réps pyramidal" },
        { name: "Oiseau haltère sur banc incliné", sets: "3", reps: "10", rest: "1min30", technique: "3 temps saccadé" },
        { name: "Tirage au menton poulie basse", sets: "4", reps: "12", rest: "1min30", technique: "" },
        { name: "Abdos rouleau", sets: "4", reps: "12", rest: "1min", technique: "" },
        { name: "Relevé de jambes", sets: "4", reps: "échec", rest: "1min", technique: "Échec = autant de réps possible" },
      ]},
      { id: "ps-bras", label: "Séance 5 — Bras", warmup: "5 min de rameur", rest: "2 min entre chaque exercice", exercises: [
        { name: "Curl biceps EZ", sets: "3", reps: "15", rest: "1min30", technique: "(5rép 5s) x 3" },
        { name: "Curl barre poulie basse", sets: "4", reps: "10", rest: "1min30", technique: "2s pic contraction" },
        { name: "Curl marteau unilatéral à la poulie", sets: "4", reps: "12", rest: "1min30", technique: "12 réps pour chaque bras" },
        { name: "Barre au front", sets: "3", reps: "10", rest: "1min30", technique: "3 temps saccadé" },
        { name: "Dips", sets: "4", reps: "échec", rest: "1min30", technique: "3s de pic contraction" },
        { name: "Abdos crunch banc décliné", sets: "4", reps: "12", rest: "1min", technique: "3s phase excentrique" },
        { name: "Relevé de jambes", sets: "4", reps: "échec", rest: "1min", technique: "Échec = autant de réps possible" },
        { name: "Oblique sur chaise romaine", sets: "4", reps: "12", rest: "1min", technique: "12 réps pour chaque côté" },
      ]},
    ],
  },
};

const FOOD_GROUPS = ["Protéines", "Glucides", "Légumes", "Lipides", "Fruits"];

const FOOD_PRESETS = [
  { name: "Blanc de poulet cuit", group: "Protéines", kcal: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: "Viande hachée 5% cuite", group: "Protéines", kcal: 172, protein: 28, carbs: 0, fat: 6.5 },
  { name: "Filet de bœuf", group: "Protéines", kcal: 158, protein: 28, carbs: 0, fat: 5 },
  { name: "Dinde cuite", group: "Protéines", kcal: 150, protein: 29, carbs: 0, fat: 3.5 },
  { name: "Cabillaud cuit", group: "Protéines", kcal: 90, protein: 20, carbs: 0, fat: 0.8 },
  { name: "Saumon cuit", group: "Protéines", kcal: 200, protein: 22, carbs: 0, fat: 12 },
  { name: "Thon (nature)", group: "Protéines", kcal: 130, protein: 28, carbs: 0, fat: 1.3 },
  { name: "Œufs entiers", group: "Protéines", kcal: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: "Blanc d'œuf", group: "Protéines", kcal: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: "Whey protéine (poudre)", group: "Protéines", kcal: 380, protein: 80, carbs: 6, fat: 4 },
  { name: "Riz basmati cuit", group: "Glucides", kcal: 130, protein: 2.7, carbs: 28, fat: 0.3 },
  { name: "Riz complet cuit", group: "Glucides", kcal: 123, protein: 2.7, carbs: 25.8, fat: 1 },
  { name: "Pâtes cuites", group: "Glucides", kcal: 138, protein: 5, carbs: 28, fat: 1 },
  { name: "Pâtes complètes cuites", group: "Glucides", kcal: 124, protein: 5.3, carbs: 25, fat: 1.1 },
  { name: "Pomme de terre", group: "Glucides", kcal: 87, protein: 2, carbs: 20, fat: 0.1 },
  { name: "Patate douce", group: "Glucides", kcal: 86, protein: 1.6, carbs: 20, fat: 0.1 },
  { name: "Quinoa cuit", group: "Glucides", kcal: 120, protein: 4.4, carbs: 21, fat: 1.9 },
  { name: "Pain complet", group: "Glucides", kcal: 240, protein: 9, carbs: 41, fat: 3.4 },
  { name: "Flocon d'avoine", group: "Glucides", kcal: 370, protein: 13, carbs: 60, fat: 7 },
  { name: "Légumes verts cuits", group: "Légumes", kcal: 35, protein: 2, carbs: 5, fat: 0.3 },
  { name: "Brocolis", group: "Légumes", kcal: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
  { name: "Haricots verts", group: "Légumes", kcal: 31, protein: 1.8, carbs: 7, fat: 0.1 },
  { name: "Salade verte", group: "Légumes", kcal: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  { name: "Courgette", group: "Légumes", kcal: 17, protein: 1.2, carbs: 3.1, fat: 0.3 },
  { name: "Huile d'olive", group: "Lipides", kcal: 884, protein: 0, carbs: 0, fat: 100 },
  { name: "Amandes", group: "Lipides", kcal: 579, protein: 21, carbs: 22, fat: 50 },
  { name: "Noix", group: "Lipides", kcal: 654, protein: 15, carbs: 14, fat: 65 },
  { name: "Beurre de cacahuète", group: "Lipides", kcal: 588, protein: 25, carbs: 20, fat: 50 },
  { name: "Avocat", group: "Lipides", kcal: 160, protein: 2, carbs: 9, fat: 15 },
  { name: "Banane", group: "Fruits", kcal: 89, protein: 1.1, carbs: 23, fat: 0.3 },
  { name: "Pomme", group: "Fruits", kcal: 52, protein: 0.3, carbs: 14, fat: 0.2 },
  { name: "Compote de pomme", group: "Fruits", kcal: 52, protein: 0.3, carbs: 11, fat: 0.2 },
  { name: "Fruits rouges", group: "Fruits", kcal: 50, protein: 0.7, carbs: 12, fat: 0.3 },
];

const MACRO_RULES = {
  "prise-masse": { label: "Prise de masse", surplus: 300, proteinPerKg: { H: 2.2, F: 2.0 }, fatPerKg: { H: 1.0, F: 1.1 } },
  "seche":       { label: "Sèche",          surplus: -350, proteinPerKg: { H: 2.4, F: 2.2 }, fatPerKg: { H: 0.8, F: 0.9 } },
  "maintien":    { label: "Maintien",        surplus: 0,    proteinPerKg: { H: 2.0, F: 1.8 }, fatPerKg: { H: 0.9, F: 1.0 } },
};

function calcMacros(weightKg, goalKey, sex = "H", heightCm = "", age = "") {
  const w = parseFloat(weightKg);
  const rule = MACRO_RULES[goalKey];
  if (!w || !rule) return null;
  const h = parseFloat(heightCm);
  const a = parseFloat(age);
  let bmr;
  if (h && a) {
    // Mifflin-St Jeor
    bmr = sex === "F"
      ? 10 * w + 6.25 * h - 5 * a - 161
      : 10 * w + 6.25 * h - 5 * a + 5;
  } else {
    // Fallback si taille/âge manquants : Harris-Benedict simplifié
    bmr = sex === "F" ? w * 22 : w * 24;
  }
  const tdee = Math.round(bmr * 1.55); // activité modérée
  const kcal = Math.round(tdee + rule.surplus);
  const protein = Math.round(w * rule.proteinPerKg[sex] || rule.proteinPerKg["H"]);
  const fat = Math.round(w * rule.fatPerKg[sex] || rule.fatPerKg["H"]);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, carbs, fat };
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(typeof window !== "undefined" ? window.innerWidth <= 760 : false);
  useEffect(() => {
    function onResize() { setIsMobile(window.innerWidth <= 760); }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
}

export default function CoachApp() {
  const [route, setRoute] = useState({ view: "loading" });
  const [students, setStudents] = useState([]);
  const [coachUnlocked, setCoachUnlocked] = useState(() => sessionStorage.getItem("coach_auth") === "1");
  const [showPin, setShowPin] = useState(() => sessionStorage.getItem("show_pin") === "1");

  useEffect(() => {
    function resolve() {
      const hash = window.location.hash || "";
      const mStudent = hash.match(/student=([a-z0-9]+)/i);
      if (mStudent) { setRoute({ view: "student-portal", studentId: mStudent[1] }); return; }
      if (hash === "#join") { setRoute({ view: "onboarding" }); return; }
      setRoute({ view: "coach" });
    }
    resolve();
    window.addEventListener("hashchange", resolve);
    return () => window.removeEventListener("hashchange", resolve);
  }, []);

  const loadIndex = useCallback(async () => {
    const idx = (await safeGet(KEYS.students)) || [];
    setStudents(idx);
    return idx;
  }, []);

  useEffect(() => { loadIndex(); }, [loadIndex]);

  if (route.view === "loading") return <Shell><LoadingState /></Shell>;
  if (route.view === "student-portal") return <Shell><StudentPortal studentId={route.studentId} /></Shell>;
  if (route.view === "onboarding") return <Shell><OnboardingPage /></Shell>;
  if (!coachUnlocked) return <Shell><LandingPage onCoach={() => { sessionStorage.setItem("show_pin","1"); setShowPin(true); }} showPin={showPin} onUnlock={() => { sessionStorage.setItem("coach_auth","1"); setCoachUnlocked(true); }} /></Shell>;
  return <Shell><CoachApp_Inner students={students} refreshIndex={loadIndex} /></Shell>;
}

const COACH_PIN = "1234";

function LandingPage({ onCoach, showPin, onUnlock }) {
  if (showPin) return <CoachPinGate onUnlock={onUnlock} />;
  return (
    <div className="landing">
      <div className="landing-inner">
        <div className="landing-logo">
          <div className="mark" />
          <span className="brand-name">Fonte</span>
        </div>
        <p className="landing-sub mono">Studio de coaching</p>
        <div className="landing-choices">
          <button className="landing-choice coach" onClick={onCoach}>
            <span className="lc-icon"><User size={28} strokeWidth={1.6} /></span>
            <span className="lc-title">Je suis le coach</span>
            <span className="lc-desc">Accéder au tableau de bord</span>
          </button>
          <div className="landing-choice student">
            <span className="lc-icon"><Dumbbell size={28} strokeWidth={1.6} /></span>
            <span className="lc-title">Je suis un élève</span>
            <span className="lc-desc">Ouvre le lien personnel que ton coach t'a envoyé par WhatsApp ou SMS pour accéder à ton espace.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoachPinGate({ onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  function tryPin(val) {
    setPin(val);
    if (val.length === 4) {
      if (val === COACH_PIN) { onUnlock(); }
      else { setError(true); setTimeout(() => { setPin(""); setError(false); }, 700); }
    } else {
      setError(false);
    }
  }
  return (
    <div className="pin-gate">
      <div className="pin-card">
        <div className="pin-logo"><div className="mark" /><span className="brand-name">Fonte</span></div>
        <p className="pin-label">Code coach</p>
        <div className={`pin-dots ${error ? "shake" : ""}`}>
          {[0,1,2,3].map((i) => <div key={i} className={`pin-dot ${pin.length > i ? "filled" : ""} ${error ? "err" : ""}`} />)}
        </div>
        <div className="pin-grid">
          {[1,2,3,4,5,6,7,8,9,"",0,"\u232b"].map((k, i) => (
            <button key={i} className={`pin-key ${k === "" ? "invisible" : ""}`} onClick={() => {
              if (k === "\u232b") tryPin(pin.slice(0,-1));
              else if (k !== "" && pin.length < 4) tryPin(pin + k);
            }}>{k}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="loading-wrap">
      <div className="loading-bar"><div className="loading-fill" /></div>
      <div className="loading-text mono">CHARGEMENT</div>
    </div>
  );
}

function Shell({ children }) {
  return <div className="fonte-shell"><style>{CSS}</style>{children}</div>;
}

const NAV_ITEMS = [
  { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, ready: true },
  { id: "students", label: "Élèves", icon: Users, ready: true },
  { id: "programs", label: "Programmes", icon: ListChecks, ready: true },
  { id: "planning", label: "Planning", icon: CalendarIcon, ready: true },
  { id: "stats", label: "Statistiques", icon: BarChart3, ready: true },
];

function CoachApp_Inner({ students, refreshIndex }) {
  const [section, setSection] = useState("dashboard");
  const [selectedId, setSelectedId] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [query, setQuery] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [applyTarget, setApplyTarget] = useState(null);
  const [reloadSignal, setReloadSignal] = useState(0);
  const isMobile = useIsMobile();

  function goToStudent(id) { setSelectedId(id); setSection("students"); setNavOpen(false); }
  function changeSection(s) { setSection(s); setSelectedId(null); setNavOpen(false); }

  async function applySessionToStudent(studentId, session) {
    const s = await safeGet(KEYS.student(studentId));
    if (!s) return;
    const newDay = { id: uid(), label: session.label, exercises: session.exercises.map((ex) => ({ id: uid(), name: ex.name, sets: ex.sets, reps: ex.reps, load: "" })) };
    const training = s.training || { planName: "", days: [] };
    await safeSet(KEYS.student(studentId), { ...s, training: { ...training, days: [...training.days, newDay] } });
    setApplyTarget(null);
    setReloadSignal((n) => n + 1);
    goToStudent(studentId);
  }

  const showingDetail = !!selectedId;

  return (
    <div className={`app-grid ${isMobile ? "is-mobile" : ""}`}>
      <Sidebar section={section} setSection={changeSection} studentCount={students.length} isMobile={isMobile} navOpen={navOpen} setNavOpen={setNavOpen} />
      {isMobile && navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)} />}
      <main className="main">
        {showingDetail ? (
          <StudentDetailPage studentId={selectedId} onBack={() => { setSelectedId(null); refreshIndex(); }} onDeleted={() => { setSelectedId(null); refreshIndex(); }} isMobile={isMobile} reloadSignal={reloadSignal} />
        ) : (
          <>
            <TopBar section={section} query={query} setQuery={setQuery} onAdd={() => setShowAdd(true)} isMobile={isMobile} onMenu={() => setNavOpen(true)} />
            <div className="scroll">
              {section === "dashboard" && <DashboardSection students={students} onOpenStudent={goToStudent} />}
              {section === "students" && <StudentsSection students={students} query={query} onOpenStudent={goToStudent} onAdd={() => setShowAdd(true)} />}
              {section === "programs" && <ProgramsSection onApplyToStudent={(session) => setApplyTarget(session)} students={students} />}
              {section === "planning" && <PlanningSection students={students} />}
              {section === "stats" && <StatsSection students={students} />}
            </div>
          </>
        )}
      </main>
      {isMobile && !showingDetail && section === "students" && students.length > 0 && (
        <button className="fab" onClick={() => setShowAdd(true)} aria-label="Ajouter un élève"><Plus size={22} strokeWidth={2.4} /></button>
      )}
      {showAdd && (
        <AddStudentModal onClose={() => setShowAdd(false)} onCreated={async (student) => {
          const idx = (await safeGet(KEYS.students)) || [];
          await safeSet(KEYS.students, [...idx, { id: student.id, name: student.name, sex: student.sex, createdAt: student.createdAt }]);
          await safeSet(KEYS.student(student.id), student);
          setShowAdd(false);
          await refreshIndex();
        }} />
      )}
      {applyTarget && <ApplySessionModal session={applyTarget} students={students} onClose={() => setApplyTarget(null)} onApply={applySessionToStudent} />}
    </div>
  );
}

function ApplySessionModal({ session, students, onClose, onApply }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Appliquer « {session.label} »</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        {students.length === 0 ? <p className="modal-text">Aucun élève pour l'instant. Crée d'abord une fiche élève.</p> : (
          <><p className="modal-text">Choisis l'élève à qui ajouter cette séance comme nouveau jour d'entraînement.</p>
          <div className="picker-list">{students.map((s) => <button key={s.id} className="picker-item" onClick={() => onApply(s.id, session)}>{s.name}</button>)}</div></>
        )}
      </div>
    </div>
  );
}

function Sidebar({ section, setSection, studentCount, isMobile, navOpen, setNavOpen }) {
  const content = (
    <>
      <div className="brand">
        <div className="mark" />
        <div><div className="brand-name">Fonte</div><div className="brand-sub mono">Studio Coaching</div></div>
        {isMobile && <button className="icon-btn drawer-close" onClick={() => setNavOpen(false)} aria-label="Fermer le menu"><X size={18} /></button>}
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = section === item.id;
          return (
            <a key={item.id} className={active ? "active" : ""} onClick={() => setSection(item.id)}>
              <Icon className="ic" size={isMobile ? 18 : 17} strokeWidth={1.8} />
              <span>{item.label}</span>
              {item.id === "students" && studentCount > 0 && <i className="badge">{studentCount}</i>}
              {!item.ready && <i className="badge soon mono">bientôt</i>}
            </a>
          );
        })}
      </nav>
    </>
  );
  if (isMobile) return <aside className={`sidebar mobile-drawer ${navOpen ? "open" : ""}`}>{content}</aside>;
  return <aside className="sidebar">{content}</aside>;
}

function TopBar({ section, query, setQuery, onAdd, isMobile, onMenu }) {
  const titles = { dashboard: "Tableau de bord", students: "Élèves", programs: "Programmes", planning: "Planning", stats: "Statistiques" };
  const today = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const [copied, setCopied] = useState(false);
  function copyJoinLink() {
    const link = `${window.location.origin}${window.location.pathname}#join`;
    navigator.clipboard.writeText(link).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }
  return (
    <header className="topbar">
      {isMobile && <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu"><Menu size={19} /></button>}
      <h1>{titles[section]}</h1>
      {!isMobile && <div className="day mono">{today}</div>}
      {section === "students" && (
        <>
          <div className="search"><Search size={15} /><input placeholder={isMobile ? "Rechercher…" : "Rechercher un élève…"} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <button className="btn ghost" onClick={copyJoinLink}>{copied ? <Check size={14} /> : <Link2 size={14} />}{copied ? "Copié !" : "Lien d'inscription"}</button>
          {!isMobile && <button className="btn primary" onClick={onAdd}><Plus size={15} strokeWidth={2.4} />Élève</button>}
        </>
      )}
    </header>
  );
}

function DashboardSection({ students, onOpenStudent }) {
  const [fullStudents, setFullStudents] = useState([]);
  useEffect(() => {
    if (!students.length) { setFullStudents([]); return; }
    Promise.all(students.map((s) => safeGet(KEYS.student(s.id)))).then((res) => setFullStudents(res.filter(Boolean)));
  }, [students]);

  const total = students.length;
  const withProgram = fullStudents.filter((s) => s.training?.days?.length > 0).length;
  const withDiet = fullStudents.filter((s) => s.diet?.meals?.length > 0).length;

  return (
    <div className="layout">
      <div>
        <div className="kpis">
          <Kpi label="Élèves actifs" icon={<Users size={14} />} num={total} unit="" />
          <Kpi label="Avec programme" icon={<Dumbbell size={14} />} num={withProgram} unit={`/${total || 0}`} />
          <Kpi label="Avec diète" icon={<Apple size={14} />} num={withDiet} unit={`/${total || 0}`} />
          <Kpi label="Messages non lus" icon={<MessageCircle size={14} />} num="—" unit="" />
        </div>
        <div className="sec-head"><h2>Élèves récents</h2><span className="ct mono">{total} au total</span></div>
        {total === 0 ? <p className="muted">Aucun élève pour l'instant. Ajoute ta première fiche depuis la section Élèves.</p> : (
          <div className="roster">{fullStudents.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 6).map((s) => (
            <StudentCard key={s.id} student={s} onClick={() => onOpenStudent(s.id)} />
          ))}</div>
        )}
      </div>
      <div>
        <div className="panel">
          <h3><CalendarIcon size={16} color="var(--acid)" />Planning du jour<span className="ct mono">à venir</span></h3>
          <p className="muted small" style={{ marginTop: 10 }}>Consulte la section Planning pour gérer tes séances.</p>
        </div>
        <div className="panel">
          <h3><AlertTriangle size={16} color="var(--red)" />Alertes<span className="ct mono">0 active</span></h3>
          <p className="muted small" style={{ marginTop: 10 }}>Aucune alerte pour le moment.</p>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, icon, num, unit }) {
  return <div className="kpi"><div className="lab">{icon}{label}</div><div className="num">{num}<span className="unit mono">{unit}</span></div></div>;
}

function StudentsSection({ students, query, onOpenStudent, onAdd }) {
  const filtered = students.filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));
  if (students.length === 0) return (
    <div className="empty-state">
      <div className="empty-plate"><Dumbbell size={30} strokeWidth={1.5} /></div>
      <h2>Aucun élève pour l'instant</h2>
      <p>Ajoute ton premier élève pour créer son profil, son programme et sa diète.</p>
      <button className="btn primary" onClick={onAdd}><Plus size={16} strokeWidth={2.4} />Ajouter un élève</button>
    </div>
  );
  if (filtered.length === 0) return <p className="muted center" style={{ padding: "40px 0" }}>Aucun élève ne correspond à « {query} ».</p>;
  return (
    <>
      <div className="sec-head"><h2>Tous les élèves</h2><span className="ct mono">{filtered.length} affiché{filtered.length > 1 ? "s" : ""}</span></div>
      <div className="roster wide">{filtered.slice().sort((a, b) => b.createdAt - a.createdAt).map((s) => <StudentCard key={s.id} student={s} onClick={() => onOpenStudent(s.id)} />)}</div>
    </>
  );
}

function Plate({ name, size = 64 }) {
  const stroke = size >= 70 ? 5 : 4;
  const r = size / 2 - stroke / 2 - 1;
  const face = size - stroke * 2 - 8;
  const fs = size >= 70 ? 18 : 15;
  return (
    <div className="plate" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
        <circle className="track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
      </svg>
      <div className="face" style={{ width: face, height: face }}><span className="ini mono" style={{ fontSize: fs }}>{initials(name)}</span></div>
    </div>
  );
}

function StudentCard({ student, onClick }) {
  return (
    <button className="card" onClick={onClick}>
      <Plate name={student.name} size={60} />
      <div className="meta">
        <div className="nm">{student.name}</div>
        <div className="prog-nm">{student.training?.planName || "Pas encore de programme"}</div>
        <div className="row">
          <div className="stat"><div className="k">Sexe</div><div className="v">{student.sex || "—"}</div></div>
          <div className="stat"><div className="k">Poids</div><div className="v">{student.weightHistory?.length ? `${student.weightHistory[student.weightHistory.length - 1].value}kg` : "—"}</div></div>
        </div>
      </div>
    </button>
  );
}

function OnboardingPage() {
  const [step, setStep] = useState("form");
  const [name, setName] = useState("");
  const [sex, setSex] = useState("H");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [sessions, setSessions] = useState("");
  const [meals, setMeals] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!name.trim() || !age || !height || !weight) { setError("Remplis au minimum ton prénom, âge, taille et poids."); return; }
    setSaving(true);
    setError("");
    try {
      const student = newStudent({ name: name.trim(), sex, age, height, weight, sessionsPerWeek: sessions, mealsPerDay: meals });
      const idx = (await safeGet(KEYS.students)) || [];
      await safeSet(KEYS.students, [...idx, { id: student.id, name: student.name, sex: student.sex, createdAt: student.createdAt }]);
      await safeSet(KEYS.student(student.id), student);
      setStep("done");
    } catch (e) {
      setError("Une erreur est survenue. Réessaie.");
    }
    setSaving(false);
  }

  if (step === "done") return (
    <div className="onboarding-wrap">
      <div className="onboarding-card">
        <div className="onboarding-logo"><div className="mark" /><span className="brand-name">Fonte</span></div>
        <div className="onboarding-success">
          <div className="ob-check-circle"><Check size={32} color="#0E0F12" strokeWidth={3} /></div>
          <h2>Inscription envoyée !</h2>
          <p className="muted">Tes informations ont bien été reçues par ton coach.</p>
          <div className="ob-next-steps">
            <div className="ob-step"><span className="ob-step-num mono">01</span><div><strong>Ton coach prépare ta fiche</strong><p>Il va créer ton programme d'entraînement et ta diète personnalisée.</p></div></div>
            <div className="ob-step"><span className="ob-step-num mono">02</span><div><strong>Il t'envoie ton lien personnel</strong><p>Tu recevras un lien unique (WhatsApp, SMS…) pour accéder à ton espace : programme, diète et messagerie avec ton coach.</p></div></div>
            <div className="ob-step"><span className="ob-step-num mono">03</span><div><strong>Tu suis tout depuis ton téléphone</strong><p>Ajoute l'app à ton écran d'accueil pour un accès rapide.</p></div></div>
          </div>
          <p className="ob-waiting">En attendant, pas d'action requise de ta part. 💪</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="onboarding-wrap">
      <div className="onboarding-card">
        <div className="onboarding-logo"><div className="mark" /><span className="brand-name">Fonte</span></div>
        <h2 className="onboarding-title">Rejoindre le programme</h2>
        <p className="muted" style={{ marginBottom: 24 }}>Remplis ce formulaire pour que ton coach puisse créer ta fiche de suivi.</p>
        <div className="modal-form">
          <label className="field"><span>Prénom &amp; Nom *</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ton prénom et nom" /></label>
          <label className="field"><span>Sexe</span>
            <select value={sex} onChange={(e) => setSex(e.target.value)}>
              <option value="H">Homme</option>
              <option value="F">Femme</option>
              <option value="Autre">Autre</option>
            </select>
          </label>
          <div className="field-row">
            <label className="field"><span>Âge *</span><input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="ex. 25" /></label>
            <label className="field"><span>Taille (cm) *</span><input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="ex. 175" /></label>
            <label className="field"><span>Poids (kg) *</span><input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex. 75" /></label>
          </div>
          <div className="field-row">
            <label className="field"><span>Séances / semaine</span><input type="number" min="1" max="7" value={sessions} onChange={(e) => setSessions(e.target.value)} placeholder="ex. 3" /></label>
            <label className="field"><span>Repas / jour</span><input type="number" min="1" max="8" value={meals} onChange={(e) => setMeals(e.target.value)} placeholder="ex. 3" /></label>
          </div>
          {error && <p className="onboarding-error">{error}</p>}
          <button className="btn primary full" onClick={submit} disabled={saving}>{saving ? "Envoi en cours…" : "Rejoindre"}</button>
        </div>
      </div>
    </div>
  );
}

function AddStudentModal({ onClose, onCreated }) {
  const [name, setName] = useState(""); const [sex, setSex] = useState("H"); const [age, setAge] = useState("");
  const [height, setHeight] = useState(""); const [weight, setWeight] = useState(""); const [saving, setSaving] = useState(false);
  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    await onCreated(newStudent({ name: name.trim(), sex, age, height, weight }));
    setSaving(false);
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Nouvel élève</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="modal-form">
          <label className="field"><span>Nom</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de l'élève" onKeyDown={(e) => e.key === "Enter" && submit()} /></label>
          <label className="field"><span>Sexe</span><select value={sex} onChange={(e) => setSex(e.target.value)}><option value="H">Homme</option><option value="F">Femme</option><option value="Autre">Autre</option></select></label>
          <div className="field-row">
            <label className="field"><span>Âge</span><input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="—" /></label>
            <label className="field"><span>Taille (cm)</span><input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="—" /></label>
            <label className="field"><span>Poids (kg)</span><input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="—" /></label>
          </div>
          <button className="btn primary full" onClick={submit} disabled={saving || !name.trim()}>{saving ? "Création…" : "Créer la fiche"}</button>
        </div>
      </div>
    </div>
  );
}

function StudentDetailPage({ studentId, onBack, onDeleted, isMobile, reloadSignal }) {
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("profil");
  const [showLink, setShowLink] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const load = useCallback(async () => { setStudent(await safeGet(KEYS.student(studentId))); }, [studentId]);
  useEffect(() => { load(); }, [load, reloadSignal]);
  async function save(updated) { setStudent(updated); await safeSet(KEYS.student(studentId), updated); }
  async function handleDelete() {
    const idx = (await safeGet(KEYS.students)) || [];
    await safeSet(KEYS.students, idx.filter((s) => s.id !== studentId));
    await safeDelete(KEYS.student(studentId));
    await safeDelete(KEYS.chat(studentId));
    const sessions = (await safeGet(KEYS.sessions)) || [];
    await safeSet(KEYS.sessions, sessions.map((s) => ({ ...s, studentIds: (s.studentIds || []).filter((id) => id !== studentId), studentNames: (s.studentNames || []).filter((n) => n !== student?.name) })));
    onDeleted();
  }
  if (!student) return <LoadingState />;
  const link = `${window.location.origin}${window.location.pathname}#student=${studentId}`;
  const lastWeight = student.weightHistory?.length ? student.weightHistory[student.weightHistory.length - 1].value : null;
  return (
    <>
      <header className="topbar detail-topbar">
        <button className="back-btn" onClick={onBack}><ArrowLeft size={17} />{!isMobile && "Tous les élèves"}</button>
        <div className="detail-topbar-id"><Plate name={student.name} size={32} /><span className="detail-topbar-name">{student.name}</span></div>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={() => setShowLink(true)} title="Lien élève"><Link2 size={16} /></button>
          <button className="icon-btn danger" onClick={() => setConfirmDelete(true)} title="Supprimer"><Trash2 size={16} /></button>
        </div>
      </header>
      <div className="scroll">
        <div className="detail-identity">
          <Plate name={student.name} size={isMobile ? 72 : 88} />
          <div>
            <h1 className="detail-name">{student.name}</h1>
            <div className="dmeta">
              <span className="pill mono">{student.sex || "—"}</span>
              <span className="pill mono">{student.age ? `${student.age} ans` : "Âge —"}</span>
              <span className="pill mono">{student.height ? `${student.height} cm` : "Taille —"}</span>
              <span className="pill mono">{lastWeight ? `${lastWeight} kg` : "Poids —"}</span>
            </div>
          </div>
        </div>
        <nav className="tabs">
          <TabBtn active={tab === "profil"} onClick={() => setTab("profil")} icon={<User size={15} />} label="Profil" />
          <TabBtn active={tab === "entrainement"} onClick={() => setTab("entrainement")} icon={<Dumbbell size={15} />} label="Entraînement" />
          <TabBtn active={tab === "diete"} onClick={() => setTab("diete")} icon={<Apple size={15} />} label="Diète" />
          <TabBtn active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageCircle size={15} />} label="Conversation" />
        </nav>
        <div className="tab-panel">
          {tab === "profil" && <ProfilTab student={student} save={save} />}
          {tab === "entrainement" && <EntrainementTab student={student} save={save} />}
          {tab === "diete" && <DieteTab student={student} save={save} />}
          {tab === "chat" && <ChatPanel studentId={studentId} sender="coach" />}
        </div>
      </div>
      {showLink && <LinkModal link={link} onClose={() => setShowLink(false)} />}
      {confirmDelete && <ConfirmModal title="Supprimer cet élève ?" message={`Toutes les données de ${student.name} (profil, programme, diète, conversation) seront définitivement supprimées.`} onCancel={() => setConfirmDelete(false)} onConfirm={handleDelete} />}
    </>
  );
}

function TabBtn({ active, onClick, icon, label }) {
  return <button className={`tab-btn ${active ? "active" : ""}`} onClick={onClick}>{icon}<span>{label}</span></button>;
}

function LinkModal({ link, onClose }) {
  const [copied, setCopied] = useState(false);
  async function copy() { try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); } catch {} }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Lien de l'élève</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <p className="modal-text">Envoie ce lien à ton élève. Il pourra consulter son profil, son entraînement, sa diète et te répondre dans la conversation — sans créer de compte.</p>
        <div className="link-row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} className="mono" />
          <button className="btn primary" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copié" : "Copier"}</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" onClick={onCancel}><X size={18} /></button></div>
        <p className="modal-text">{message}</p>
        <div className="modal-confirm-actions"><button className="btn" onClick={onCancel}>Annuler</button><button className="btn danger" onClick={onConfirm}>Supprimer</button></div>
      </div>
    </div>
  );
}

function ProfilTab({ student, save }) {
  const [weightInput, setWeightInput] = useState("");
  async function addWeight() {
    const v = parseFloat(weightInput);
    if (!v) return;
    await save({ ...student, weightHistory: [...(student.weightHistory || []), { date: todayISO(), value: v }] });
    setWeightInput("");
  }
  async function updateField(field, value) { await save({ ...student, [field]: value }); }
  const history = student.weightHistory || [];
  const max = Math.max(...history.map((h) => h.value), 1);
  const min = Math.min(...history.map((h) => h.value), 0);
  const range = max - min || 1;
  return (
    <div className="panel-grid">
      <div className="block-card">
        <h3 className="card-title">Informations</h3>
        <div className="field-row">
          <label className="field"><span>Âge</span><input type="number" value={student.age} onChange={(e) => updateField("age", e.target.value)} /></label>
          <label className="field"><span>Taille (cm)</span><input type="number" value={student.height} onChange={(e) => updateField("height", e.target.value)} /></label>
          <label className="field"><span>Sexe</span><select value={student.sex} onChange={(e) => updateField("sex", e.target.value)}><option value="H">Homme</option><option value="F">Femme</option><option value="Autre">Autre</option></select></label>
        </div>
      </div>
      <div className="block-card">
        <h3 className="card-title">Évolution du poids</h3>
        {history.length > 0 ? (
          <div className="weight-chart">
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="weight-svg">
              <polyline fill="none" stroke="var(--acid)" strokeWidth="2" points={history.map((h, i) => { const x = history.length === 1 ? 150 : (i / (history.length - 1)) * 280 + 10; const y = 90 - ((h.value - min) / range) * 70; return `${x},${y}`; }).join(" ")} />
              {history.map((h, i) => { const x = history.length === 1 ? 150 : (i / (history.length - 1)) * 280 + 10; const y = 90 - ((h.value - min) / range) * 70; return <circle key={i} cx={x} cy={y} r="3" fill="var(--acid)" />; })}
            </svg>
            <div className="weight-latest mono">{history[history.length - 1].value} <span>kg</span></div>
          </div>
        ) : <p className="muted">Aucune pesée enregistrée.</p>}
        <div className="add-weight-row">
          <input type="number" step="0.1" placeholder="Nouveau poids (kg)" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addWeight()} />
          <button className="btn" onClick={addWeight}>Ajouter</button>
        </div>
        {history.length > 0 && (
          <div className="weight-log">{history.slice().reverse().slice(0, 5).map((h, i) => <div key={i} className="weight-log-row mono"><span>{formatDate(h.date)}</span><span>{h.value} kg</span></div>)}</div>
        )}
      </div>
    </div>
  );
}

function ExercisePickerModal({ onClose, onPick }) {
  const [activeGroup, setActiveGroup] = useState(MUSCLE_GROUPS[0]);
  const filtered = EXERCISE_PRESETS.filter((e) => e.group === activeGroup);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Choisir un exercice</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="picker-groups">{MUSCLE_GROUPS.map((g) => <button key={g} className={`chip-btn ${activeGroup === g ? "active" : ""}`} onClick={() => setActiveGroup(g)}>{g}</button>)}</div>
        <div className="picker-list">{filtered.map((ex) => <button key={ex.name} className="picker-item" onClick={() => onPick(ex.name)}>{ex.name}</button>)}</div>
      </div>
    </div>
  );
}

function EntrainementTab({ student, save }) {
  const training = student.training || { planName: "", days: [] };
  const [pickerFor, setPickerFor] = useState(null);
  async function updatePlanName(name) { await save({ ...student, training: { ...training, planName: name } }); }
  async function addDay() { await save({ ...student, training: { ...training, days: [...training.days, { id: uid(), label: `Jour ${training.days.length + 1}`, exercises: [] }] } }); }
  async function updateDay(dayId, patch) { await save({ ...student, training: { ...training, days: training.days.map((d) => d.id === dayId ? { ...d, ...patch } : d) } }); }
  async function removeDay(dayId) { await save({ ...student, training: { ...training, days: training.days.filter((d) => d.id !== dayId) } }); }
  async function addExercise(dayId, presetName) { const day = training.days.find((d) => d.id === dayId); await updateDay(dayId, { exercises: [...day.exercises, { id: uid(), name: presetName || "", sets: "4", reps: "10", load: "" }] }); }
  async function updateExercise(dayId, exId, patch) { const day = training.days.find((d) => d.id === dayId); await updateDay(dayId, { exercises: day.exercises.map((ex) => ex.id === exId ? { ...ex, ...patch } : ex) }); }
  async function removeExercise(dayId, exId) { const day = training.days.find((d) => d.id === dayId); await updateDay(dayId, { exercises: day.exercises.filter((ex) => ex.id !== exId) }); }
  return (
    <div className="panel-stack">
      <div className="block-card">
        <h3 className="card-title">Nom du programme</h3>
        <input className="plan-name-input" value={training.planName} onChange={(e) => updatePlanName(e.target.value)} placeholder="Ex : Push Pull Legs — Prise de masse" />
      </div>
      {training.days.map((day) => (
        <div className="block-card" key={day.id}>
          <div className="day-head">
            <input className="day-label-input" value={day.label} onChange={(e) => updateDay(day.id, { label: e.target.value })} />
            <button className="icon-btn danger" onClick={() => removeDay(day.id)}><Trash2 size={15} /></button>
          </div>
          <div className="exercise-table">
            {day.exercises.length > 0 && <div className="exercise-table-head mono"><span>Exercice</span><span>Séries</span><span>Reps</span><span>Charge</span><span /></div>}
            {day.exercises.map((ex) => (
              <div className="exercise-row" key={ex.id}>
                <input placeholder="Nom de l'exercice" value={ex.name} onChange={(e) => updateExercise(day.id, ex.id, { name: e.target.value })} />
                <input placeholder="4" value={ex.sets} onChange={(e) => updateExercise(day.id, ex.id, { sets: e.target.value })} />
                <input placeholder="10" value={ex.reps} onChange={(e) => updateExercise(day.id, ex.id, { reps: e.target.value })} />
                <input placeholder="60kg" value={ex.load} onChange={(e) => updateExercise(day.id, ex.id, { load: e.target.value })} />
                <button className="icon-btn danger sm" onClick={() => removeExercise(day.id, ex.id)}><X size={14} /></button>
              </div>
            ))}
          </div>
          <div className="day-actions">
            <button className="btn-ghost" onClick={() => setPickerFor(day.id)}><ListChecks size={14} />Choisir un preset</button>
            <button className="btn-ghost" onClick={() => addExercise(day.id)}><Plus size={14} />Exercice vide</button>
          </div>
        </div>
      ))}
      <button className="btn full" onClick={addDay}><Plus size={16} />Ajouter un jour d'entraînement</button>
      {pickerFor && <ExercisePickerModal onClose={() => setPickerFor(null)} onPick={(name) => { addExercise(pickerFor, name); setPickerFor(null); }} />}
    </div>
  );
}

function FoodPickerModal({ onClose, onPick }) {
  const [activeGroup, setActiveGroup] = useState(FOOD_GROUPS[0]);
  const filtered = FOOD_PRESETS.filter((f) => f.group === activeGroup);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal picker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Ajouter un aliment</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <div className="picker-groups">{FOOD_GROUPS.map((g) => <button key={g} className={`chip-btn ${activeGroup === g ? "active" : ""}`} onClick={() => setActiveGroup(g)}>{g}</button>)}</div>
        <div className="picker-list">{filtered.map((f) => <button key={f.name} className="picker-item food-item" onClick={() => onPick(f)}><span>{f.name}</span><span className="food-item-kcal mono">{f.kcal} kcal/100g</span></button>)}</div>
      </div>
    </div>
  );
}

function MacroCalculatorModal({ student, onClose, onApply }) {
  const lastWeight = student.weightHistory?.length ? student.weightHistory[student.weightHistory.length - 1].value : "";
  const [weight, setWeight] = useState(lastWeight);
  const [height, setHeight] = useState(student.height || "");
  const [age, setAge] = useState(student.age || "");
  const [sex, setSex] = useState(student.sex || "H");
  const [goal, setGoal] = useState("prise-masse");
  const result = calcMacros(weight, goal, sex, height, age);
  const sexLabel = sex === "F" ? "Femme" : "Homme";
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Calculer les macros</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <p className="modal-text">Calcul personnalisé via la formule Mifflin-St Jeor selon le sexe, l'âge et la taille. Activité modérée (×1.55). Ajustable après.</p>
        <div className="modal-form">
          <div className="field-row">
            <label className="field"><span>Sexe</span>
              <select value={sex} onChange={(e) => setSex(e.target.value)}>
                <option value="H">Homme</option>
                <option value="F">Femme</option>
              </select>
            </label>
            <label className="field"><span>Âge</span><input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="ex: 25" /></label>
          </div>
          <div className="field-row">
            <label className="field"><span>Taille (cm)</span><input type="number" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="ex: 175" /></label>
            <label className="field"><span>Poids (kg)</span><input type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="ex: 78" /></label>
          </div>
          <div className="goal-switch">{Object.entries(MACRO_RULES).map(([key, rule]) => <button key={key} className={`chip-btn lg ${goal === key ? "active" : ""}`} onClick={() => setGoal(key)}>{rule.label}</button>)}</div>
          {result
            ? <><p className="muted small" style={{marginBottom:4}}>{sexLabel} · TDEE estimé : {Math.round(result.kcal - MACRO_RULES[goal].surplus)} kcal · Cible : {result.kcal} kcal</p><div className="macro-readout"><MacroChip label="Calories" value={result.kcal} unit="kcal" /><MacroChip label="Protéines" value={result.protein} unit="g" /><MacroChip label="Glucides" value={result.carbs} unit="g" /><MacroChip label="Lipides" value={result.fat} unit="g" /></div></>
            : <p className="muted small">Renseigne le poids pour calculer les macros.</p>}
          <button className="btn primary full" disabled={!result} onClick={() => result && onApply(result)}>Appliquer ces macros</button>
        </div>
      </div>
    </div>
  );
}

function DieteTab({ student, save }) {
  const diet = student.diet || { planName: "", calories: "", protein: "", carbs: "", fat: "", meals: [] };
  const [pickerFor, setPickerFor] = useState(null);
  const [showCalculator, setShowCalculator] = useState(false);
  async function updateField(field, value) { await save({ ...student, diet: { ...diet, [field]: value } }); }
  async function addMeal() { await save({ ...student, diet: { ...diet, meals: [...diet.meals, { id: uid(), label: `Repas ${diet.meals.length + 1}`, content: "", items: [], notes: "" }] } }); }
  async function updateMeal(mealId, patch) { await save({ ...student, diet: { ...diet, meals: diet.meals.map((m) => m.id === mealId ? { ...m, ...patch } : m) } }); }
  async function removeMeal(mealId) { await save({ ...student, diet: { ...diet, meals: diet.meals.filter((m) => m.id !== mealId) } }); }
  async function addFoodToMeal(mealId, food) {
    const meal = diet.meals.find((m) => m.id === mealId);
    const items = [...(meal.items || []), { id: uid(), name: food.name, amount: 100, kcal: food.kcal, protein: food.protein, carbs: food.carbs, fat: food.fat }];
    await updateMeal(mealId, { items, content: items.map((it) => `${it.name} (${it.amount}g)`).join(", ") });
  }
  async function removeFoodFromMeal(mealId, itemId) {
    const meal = diet.meals.find((m) => m.id === mealId);
    const items = (meal.items || []).filter((it) => it.id !== itemId);
    await updateMeal(mealId, { items, content: items.map((it) => `${it.name} (${it.amount}g)`).join(", ") });
  }
  async function updateFoodAmount(mealId, itemId, amount) {
    const meal = diet.meals.find((m) => m.id === mealId);
    const items = (meal.items || []).map((it) => it.id === itemId ? { ...it, amount: Number(amount) } : it);
    await updateMeal(mealId, { items, content: items.map((it) => `${it.name} (${it.amount}g)`).join(", ") });
  }
  function mealTotals(meal) {
    return (meal.items || []).reduce((acc, it) => { const r = (it.amount || 0) / 100; return { kcal: acc.kcal + it.kcal * r, protein: acc.protein + it.protein * r, carbs: acc.carbs + it.carbs * r, fat: acc.fat + it.fat * r }; }, { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  }
  return (
    <div className="panel-stack">
      <div className="block-card">
        <div className="diet-header-row"><h3 className="card-title" style={{ margin: 0 }}>Nom de la diète</h3><button className="btn-ghost" onClick={() => setShowCalculator(true)}><BarChart3 size={14} />Calculer les macros</button></div>
        <input className="plan-name-input" value={diet.planName} onChange={(e) => updateField("planName", e.target.value)} placeholder="Ex : Sèche — déficit modéré" style={{ marginTop: 12 }} />
        <div className="macro-grid">
          <label className="field"><span>Calories / jour</span><input type="number" value={diet.calories} onChange={(e) => updateField("calories", e.target.value)} placeholder="2400" /></label>
          <label className="field"><span>Protéines (g)</span><input type="number" value={diet.protein} onChange={(e) => updateField("protein", e.target.value)} placeholder="180" /></label>
          <label className="field"><span>Glucides (g)</span><input type="number" value={diet.carbs} onChange={(e) => updateField("carbs", e.target.value)} placeholder="250" /></label>
          <label className="field"><span>Lipides (g)</span><input type="number" value={diet.fat} onChange={(e) => updateField("fat", e.target.value)} placeholder="70" /></label>
        </div>
      </div>
      {diet.meals.map((meal) => {
        const totals = mealTotals(meal);
        const hasItems = (meal.items || []).length > 0;
        return (
          <div className="block-card" key={meal.id}>
            <div className="day-head"><input className="day-label-input" value={meal.label} onChange={(e) => updateMeal(meal.id, { label: e.target.value })} /><button className="icon-btn danger" onClick={() => removeMeal(meal.id)}><Trash2 size={15} /></button></div>
            {hasItems && (
              <div className="meal-items">
                {meal.items.map((it) => (
                  <div className="meal-item-row" key={it.id}>
                    <span className="mi-name">{it.name}</span>
                    <input type="number" className="mi-amount" value={it.amount} onChange={(e) => updateFoodAmount(meal.id, it.id, e.target.value)} />
                    <span className="mi-unit mono">g</span>
                    <span className="mi-kcal mono">{Math.round((it.kcal * it.amount) / 100)} kcal</span>
                    <button className="icon-btn danger sm" onClick={() => removeFoodFromMeal(meal.id, it.id)}><X size={13} /></button>
                  </div>
                ))}
                <div className="meal-totals mono">Total : {Math.round(totals.kcal)} kcal · P {Math.round(totals.protein)}g · G {Math.round(totals.carbs)}g · L {Math.round(totals.fat)}g</div>
              </div>
            )}
            <div className="day-actions"><button className="btn-ghost" onClick={() => setPickerFor(meal.id)}><Apple size={14} />Ajouter un aliment</button></div>
            <textarea className="meal-textarea" placeholder="Notes libres (facultatif) : préparation, alternative, conseils..." value={meal.notes || ""} onChange={(e) => updateMeal(meal.id, { notes: e.target.value })} rows={2} style={{ marginTop: 10 }} />
          </div>
        );
      })}
      <button className="btn full" onClick={addMeal}><Plus size={16} />Ajouter un repas</button>
      {pickerFor && <FoodPickerModal onClose={() => setPickerFor(null)} onPick={(food) => { addFoodToMeal(pickerFor, food); setPickerFor(null); }} />}
      {showCalculator && <MacroCalculatorModal student={student} onClose={() => setShowCalculator(false)} onApply={async (result) => { await save({ ...student, diet: { ...diet, calories: result.kcal, protein: result.protein, carbs: result.carbs, fat: result.fat } }); setShowCalculator(false); }} />}
    </div>
  );
}

function ChatPanel({ studentId, sender }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef(null);
  const pollRef = useRef(null);
  const load = useCallback(async () => { const m = (await safeGet(KEYS.chat(studentId))) || []; setMessages(m); setLoaded(true); }, [studentId]);
  useEffect(() => { load(); pollRef.current = setInterval(load, 3000); return () => clearInterval(pollRef.current); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);
  async function send() {
    if (!text.trim()) return;
    const msg = { id: uid(), from: sender, text: text.trim(), ts: Date.now() };
    const next = [...messages, msg];
    setMessages(next); setText("");
    await safeSet(KEYS.chat(studentId), next);
  }
  if (!loaded) return <LoadingState />;
  return (
    <div className="chat-panel">
      <div className="chat-scroll">
        {messages.length === 0 && <div className="chat-empty"><MessageCircle size={26} strokeWidth={1.5} /><p>Aucun message. {sender === "coach" ? "Envoie le premier message à ton élève." : "Envoie un message à ton coach."}</p></div>}
        {messages.map((m) => (
          <div key={m.id} className={`chat-bubble-row ${m.from === sender ? "self" : ""}`}>
            <div className="chat-bubble"><div className="chat-bubble-text">{m.text}</div><div className="chat-bubble-time mono">{formatTime(m.ts)}</div></div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input placeholder="Écrire un message…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
        <button className="chat-send" onClick={send} aria-label="Envoyer"><Send size={17} /></button>
      </div>
    </div>
  );
}

function StudentPortal({ studentId }) {
  const [student, setStudent] = useState(null);
  const [tab, setTab] = useState("entrainement");
  const [notFound, setNotFound] = useState(false);
  const pollRef = useRef(null);
  const load = useCallback(async () => { const s = await safeGet(KEYS.student(studentId)); if (!s) setNotFound(true); else setStudent(s); }, [studentId]);
  useEffect(() => { load(); pollRef.current = setInterval(load, 5000); return () => clearInterval(pollRef.current); }, [load]);
  if (notFound) return <div className="empty-state"><div className="empty-plate"><User size={30} strokeWidth={1.5} /></div><h2>Profil introuvable</h2><p>Ce lien ne correspond à aucun élève. Vérifie le lien avec ton coach.</p></div>;
  if (!student) return <LoadingState />;
  const training = student.training || { planName: "", days: [] };
  const diet = student.diet || { planName: "", calories: "", protein: "", carbs: "", fat: "", meals: [] };
  const lastWeight = student.weightHistory?.length ? student.weightHistory[student.weightHistory.length - 1].value : null;
  return (
    <div className="sp-root">
      <header className="sp-header">
        <div className="sp-header-inner">
          <div className="sp-avatar"><Plate name={student.name} size={42} /></div>
          <div className="sp-header-text">
            <div className="sp-greeting">Bonjour,</div>
            <div className="sp-name">{student.name}</div>
          </div>
          <div className="sp-pills">
            {student.age && <span className="pill mono">{student.age} ans</span>}
            {lastWeight && <span className="pill mono">{lastWeight} kg</span>}
          </div>
        </div>
      </header>

      <div className="sp-content">
        {tab === "entrainement" && (
          <div className="panel-stack">
            {training.planName ? <div className="sp-plan-banner"><Dumbbell size={16} color="var(--acid)" />{training.planName}</div> : null}
            {training.days.length === 0
              ? <div className="sp-empty-tab"><Dumbbell size={36} strokeWidth={1.2} color="var(--txt-4)" /><p>Ton programme arrive bientôt.<br/>Ton coach est en train de le préparer.</p></div>
              : training.days.map((day) => (
                <div className="block-card" key={day.id}>
                  <h4 className="day-title-readonly">{day.label}</h4>
                  <div className="exercise-table">
                    {day.exercises.length > 0 && <div className="exercise-table-head readonly mono"><span>Exercice</span><span>Séries</span><span>Reps</span><span>Charge</span></div>}
                    {day.exercises.map((ex) => <div className="exercise-row readonly" key={ex.id}><span>{ex.name || "—"}</span><span>{ex.sets || "—"}</span><span>{ex.reps || "—"}</span><span>{ex.load || "—"}</span></div>)}
                  </div>
                </div>
              ))
            }
          </div>
        )}
        {tab === "diete" && (
          <div className="panel-stack">
            {diet.planName ? <div className="sp-plan-banner"><Apple size={16} color="var(--acid)" />{diet.planName}</div> : null}
            {(diet.calories || diet.protein) && (
              <div className="block-card"><div className="macro-readout"><MacroChip label="Calories" value={diet.calories} unit="kcal" /><MacroChip label="Protéines" value={diet.protein} unit="g" /><MacroChip label="Glucides" value={diet.carbs} unit="g" /><MacroChip label="Lipides" value={diet.fat} unit="g" /></div></div>
            )}
            {diet.meals.length === 0
              ? <div className="sp-empty-tab"><Apple size={36} strokeWidth={1.2} color="var(--txt-4)" /><p>Ta diète arrive bientôt.<br/>Ton coach est en train de la préparer.</p></div>
              : diet.meals.map((meal) => (
                <div className="block-card" key={meal.id}>
                  <h4 className="day-title-readonly">{meal.label}</h4>
                  {meal.items?.length > 0
                    ? <div className="meal-items readonly">{meal.items.map((it) => <div className="meal-item-row readonly" key={it.id}><span className="mi-name">{it.name}</span><span className="mi-amount-readonly mono">{it.amount}g</span><span className="mi-kcal mono">{Math.round((it.kcal * it.amount) / 100)} kcal</span></div>)}</div>
                    : <p className="meal-readonly">{meal.content || "—"}</p>}
                  {meal.notes && <p className="meal-readonly" style={{ marginTop: 8 }}>{meal.notes}</p>}
                </div>
              ))
            }
          </div>
        )}
        {tab === "chat" && <ChatPanel studentId={studentId} sender="student" />}
      </div>

      <nav className="sp-bottom-nav">
        <button className={`sp-nav-btn ${tab === "entrainement" ? "active" : ""}`} onClick={() => setTab("entrainement")}>
          <Dumbbell size={22} strokeWidth={tab === "entrainement" ? 2.2 : 1.6} />
          <span>Entraînement</span>
        </button>
        <button className={`sp-nav-btn ${tab === "diete" ? "active" : ""}`} onClick={() => setTab("diete")}>
          <Apple size={22} strokeWidth={tab === "diete" ? 2.2 : 1.6} />
          <span>Diète</span>
        </button>
        <button className={`sp-nav-btn ${tab === "chat" ? "active" : ""}`} onClick={() => setTab("chat")}>
          <MessageCircle size={22} strokeWidth={tab === "chat" ? 2.2 : 1.6} />
          <span>Mon coach</span>
          <span className="sp-nav-dot" />
        </button>
      </nav>
    </div>
  );
}

function MacroChip({ label, value, unit }) {
  return <div className="macro-chip"><div className="macro-chip-value mono">{value || "—"}{value ? <span className="macro-unit">{unit}</span> : null}</div><div className="macro-chip-label">{label}</div></div>;
}

const SESSION_TYPES = ["Pectoraux", "Dos", "Jambes", "Épaules", "Bras", "Full body", "Cardio", "Autre"];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MONTH_LABELS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

function dateKey(y, m, d) { return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`; }

function PlanningSection({ students }) {
  const [cursor, setCursor] = useState(() => { const now = new Date(); return { year: now.getFullYear(), month: now.getMonth() }; });
  const [sessions, setSessions] = useState([]);
  const [gyms, setGyms] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [showGymManager, setShowGymManager] = useState(false);
  const load = useCallback(async () => { setSessions((await safeGet(KEYS.sessions)) || []); setGyms((await safeGet(KEYS.gyms)) || []); setLoaded(true); }, []);
  useEffect(() => { load(); }, [load]);
  async function saveSessions(next) { setSessions(next); await safeSet(KEYS.sessions, next); }
  async function saveGyms(next) { setGyms(next); await safeSet(KEYS.gyms, next); }
  if (!loaded) return <LoadingState />;
  const { year, month } = cursor;
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  function sessionsForDay(d) { return sessions.filter((s) => s.date === dateKey(year, month, d)); }
  function changeMonth(delta) { let m = month + delta, y = year; if (m < 0) { m = 11; y--; } else if (m > 11) { m = 0; y++; } setCursor({ year: y, month: m }); }
  const activeDaySessions = activeDay ? sessions.filter((s) => s.date === activeDay) : [];
  return (
    <>
      <div className="sec-head"><h2>Planning d'entraînement</h2><span className="ct mono">{sessions.length} séance{sessions.length > 1 ? "s" : ""} programmée{sessions.length > 1 ? "s" : ""}</span><div className="filters" style={{ marginLeft: "auto" }}><button className="btn" onClick={() => setShowGymManager(true)}>Mes salles</button></div></div>
      <div className="cal-header">
        <button className="icon-btn" onClick={() => changeMonth(-1)} aria-label="Mois précédent"><ArrowLeft size={16} /></button>
        <div className="cal-month-label">{MONTH_LABELS[month]} {year}</div>
        <button className="icon-btn" onClick={() => changeMonth(1)} aria-label="Mois suivant"><ArrowLeft size={16} style={{ transform: "rotate(180deg)" }} /></button>
      </div>
      <div className="cal-weekdays mono">{WEEKDAY_LABELS.map((w) => <div key={w}>{w}</div>)}</div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (d === null) return <div className="cal-cell empty" key={`e${i}`} />;
          const key = dateKey(year, month, d);
          const daySessions = sessionsForDay(d);
          return (
            <button key={key} className={`cal-cell ${key === todayKey ? "today" : ""}`} onClick={() => setActiveDay(key)}>
              <span className="cal-day-num mono">{d}</span>
              <div className="cal-tags">{daySessions.slice(0, 3).map((s) => <span key={s.id} className="cal-tag">{s.type}</span>)}{daySessions.length > 3 && <span className="cal-tag more">+{daySessions.length - 3}</span>}</div>
            </button>
          );
        })}
      </div>
      {activeDay && <DaySessionsModal dateKeyStr={activeDay} sessions={activeDaySessions} students={students} gyms={gyms} onClose={() => setActiveDay(null)} onCreate={async (session) => { await saveSessions([...sessions, session]); }} onDelete={async (id) => { await saveSessions(sessions.filter((s) => s.id !== id)); }} />}
      {showGymManager && <GymManagerModal gyms={gyms} onClose={() => setShowGymManager(false)} onSave={saveGyms} />}
    </>
  );
}

function DaySessionsModal({ dateKeyStr, sessions, students, gyms, onClose, onCreate, onDelete }) {
  const [showForm, setShowForm] = useState(sessions.length === 0);
  const niceDate = new Date(dateKeyStr + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3 style={{ textTransform: "capitalize" }}>{niceDate}</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        {sessions.length > 0 && !showForm && (
          <div className="day-session-list">{sessions.map((s) => (
            <div className="day-session-item" key={s.id}>
              <div className="dsi-main"><div className="dsi-type">{s.type}</div><div className="dsi-meta mono">{s.time || "—"} · {s.gym || "Lieu non précisé"}</div><div className="dsi-students">{s.studentNames.join(", ") || "Aucun élève"}</div></div>
              <button className="icon-btn danger sm" onClick={() => onDelete(s.id)}><Trash2 size={14} /></button>
            </div>
          ))}</div>
        )}
        {showForm ? <NewSessionForm students={students} gyms={gyms} onCancel={() => setShowForm(false)} onSave={async (data) => { await onCreate({ id: uid(), date: dateKeyStr, ...data }); setShowForm(false); }} /> : <button className="btn primary full" onClick={() => setShowForm(true)}><Plus size={16} strokeWidth={2.4} />Ajouter une séance</button>}
      </div>
    </div>
  );
}

function NewSessionForm({ students, gyms, onCancel, onSave }) {
  const [type, setType] = useState(SESSION_TYPES[0]);
  const [time, setTime] = useState("");
  const [gym, setGym] = useState(gyms[0] || "");
  const [selectedStudents, setSelectedStudents] = useState([]);
  function toggleStudent(id) { setSelectedStudents((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]); }
  function submit() { onSave({ type, time, gym, studentIds: selectedStudents, studentNames: students.filter((s) => selectedStudents.includes(s.id)).map((s) => s.name) }); }
  return (
    <div className="modal-form">
      <label className="field"><span>Type de séance</span><select value={type} onChange={(e) => setType(e.target.value)}>{SESSION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
      <div className="field-row">
        <label className="field"><span>Heure</span><input type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label>
        <label className="field"><span>Salle</span>{gyms.length > 0 ? <select value={gym} onChange={(e) => setGym(e.target.value)}>{gyms.map((g) => <option key={g} value={g}>{g}</option>)}</select> : <input value={gym} onChange={(e) => setGym(e.target.value)} placeholder="Aucune salle enregistrée" />}</label>
      </div>
      <div className="field"><span>Élève(s)</span>{students.length === 0 ? <p className="muted small">Aucun élève créé pour l'instant.</p> : <div className="student-check-list">{students.map((s) => <label key={s.id} className={`student-check ${selectedStudents.includes(s.id) ? "checked" : ""}`}><input type="checkbox" checked={selectedStudents.includes(s.id)} onChange={() => toggleStudent(s.id)} />{s.name}</label>)}</div>}</div>
      <div className="modal-confirm-actions" style={{ justifyContent: "flex-end" }}><button className="btn" onClick={onCancel}>Annuler</button><button className="btn primary" onClick={submit}>Enregistrer la séance</button></div>
    </div>
  );
}

function GymManagerModal({ gyms, onClose, onSave }) {
  const [list, setList] = useState(gyms);
  const [newGym, setNewGym] = useState("");
  function addGym() { const v = newGym.trim(); if (!v || list.includes(v)) return; setList([...list, v]); setNewGym(""); }
  async function save() { await onSave(list); onClose(); }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head"><h3>Mes salles</h3><button className="icon-btn" onClick={onClose}><X size={18} /></button></div>
        <p className="modal-text">Gère la liste des salles que tu utilises pour tes séances.</p>
        <div className="gym-list">{list.length === 0 && <p className="muted small">Aucune salle enregistrée pour l'instant.</p>}{list.map((g) => <div className="gym-row" key={g}><span>{g}</span><button className="icon-btn danger sm" onClick={() => setList(list.filter((x) => x !== g))}><X size={14} /></button></div>)}</div>
        <div className="link-row" style={{ marginTop: 14 }}><input value={newGym} onChange={(e) => setNewGym(e.target.value)} placeholder="Nom de la salle" onKeyDown={(e) => e.key === "Enter" && addGym()} /><button className="btn" onClick={addGym}>Ajouter</button></div>
        <button className="btn primary full" style={{ marginTop: 16 }} onClick={save}>Enregistrer</button>
      </div>
    </div>
  );
}

function StatsSection({ students }) {
  const [fullStudents, setFullStudents] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    async function load() {
      const full = await Promise.all(students.map((s) => safeGet(KEYS.student(s.id))));
      setFullStudents(full.filter(Boolean));
      setSessions((await safeGet(KEYS.sessions)) || []);
      setLoaded(true);
    }
    load();
  }, [students]);
  if (!loaded) return <LoadingState />;
  const total = fullStudents.length;
  const withProgram = fullStudents.filter((s) => s.training?.days?.length > 0).length;
  const withDiet = fullStudents.filter((s) => s.diet?.meals?.length > 0).length;
  const needsAttention = fullStudents.filter((s) => !(s.training?.days?.length > 0) || !(s.diet?.meals?.length > 0));
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sessionsThisMonth = sessions.filter((s) => new Date(s.date + "T00:00:00") >= startOfMonth);
  const typeCounts = {};
  sessionsThisMonth.forEach((s) => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1; });
  const maxTypeCount = Math.max(1, ...Object.values(typeCounts));
  const gymCounts = {};
  sessionsThisMonth.forEach((s) => { const g = s.gym || "Non précisé"; gymCounts[g] = (gymCounts[g] || 0) + 1; });
  const sessionCountByStudent = {};
  sessionsThisMonth.forEach((s) => { (s.studentIds || []).forEach((id) => { sessionCountByStudent[id] = (sessionCountByStudent[id] || 0) + 1; }); });
  const studentsWithNoSessionThisMonth = fullStudents.filter((s) => !sessionCountByStudent[s.id]);
  const last4Weeks = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay() - i * 7 + 1); weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 7);
    last4Weeks.push({ label: `S-${i}`, count: sessions.filter((s) => { const d = new Date(s.date + "T00:00:00"); return d >= weekStart && d < weekEnd; }).length });
  }
  const maxWeekCount = Math.max(1, ...last4Weeks.map((w) => w.count));
  return (
    <>
      <div className="sec-head"><h2>Statistiques</h2><span className="ct mono">{sessionsThisMonth.length} séances ce mois-ci</span></div>
      <div className="kpis">
        <Kpi label="Élèves actifs" icon={<Users size={14} />} num={total} unit="" />
        <Kpi label="Avec programme" icon={<Dumbbell size={14} />} num={withProgram} unit={`/${total || 0}`} />
        <Kpi label="Avec diète" icon={<Apple size={14} />} num={withDiet} unit={`/${total || 0}`} />
        <Kpi label="Séances ce mois" icon={<CalendarIcon size={14} />} num={sessionsThisMonth.length} unit="" />
      </div>
      <div className="layout">
        <div>
          <div className="block-card" style={{ marginBottom: 14 }}>
            <h3 className="card-title">Séances par semaine</h3>
            <div className="bar-chart">{last4Weeks.map((w, i) => <div className="bar-col" key={i}><div className="bar-track"><div className="bar-fill" style={{ height: `${(w.count / maxWeekCount) * 100}%` }} /></div><div className="bar-val mono">{w.count}</div><div className="bar-label mono">{i === 3 ? "Cette sem." : w.label}</div></div>)}</div>
          </div>
          <div className="block-card" style={{ marginBottom: 14 }}>
            <h3 className="card-title">Répartition par type de séance — ce mois</h3>
            {Object.keys(typeCounts).length === 0 ? <p className="muted small">Aucune séance programmée ce mois-ci.</p> : (
              <div className="hbar-list">{Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([type, count]) => <div className="hbar-row" key={type}><div className="hbar-label">{type}</div><div className="hbar-track"><div className="hbar-fill" style={{ width: `${(count / maxTypeCount) * 100}%` }} /></div><div className="hbar-val mono">{count}</div></div>)}</div>
            )}
          </div>
          <div className="block-card">
            <h3 className="card-title">Évolution du poids par élève</h3>
            {fullStudents.filter((s) => s.weightHistory?.length > 1).length === 0 ? <p className="muted small">Pas encore assez de pesées enregistrées pour afficher une tendance.</p> : (
              <div className="weight-stats-list">{fullStudents.filter((s) => s.weightHistory?.length > 1).map((s) => { const h = s.weightHistory; const delta = Math.round((h[h.length - 1].value - h[0].value) * 10) / 10; return <div className="weight-stats-row" key={s.id}><Plate name={s.name} size={32} /><div className="wsr-name">{s.name}</div><div className={`wsr-delta mono ${delta > 0 ? "up" : delta < 0 ? "down" : ""}`}>{delta > 0 ? "+" : ""}{delta} kg</div></div>; })}</div>
            )}
          </div>
        </div>
        <div>
          <div className="panel">
            <h3><AlertTriangle size={16} color="var(--red)" />À relancer<span className="ct mono">{needsAttention.length}</span></h3>
            {needsAttention.length === 0 ? <p className="muted small" style={{ marginTop: 10 }}>Tous tes élèves ont un programme et une diète actifs.</p> : (
              <div className="attention-list">{needsAttention.slice(0, 6).map((s) => <div className="attention-row" key={s.id}><Plate name={s.name} size={28} /><div className="ar-body"><div className="ar-name">{s.name}</div><div className="ar-reason">{!(s.training?.days?.length > 0) && "Pas de programme"}{!(s.training?.days?.length > 0) && !(s.diet?.meals?.length > 0) && " · "}{!(s.diet?.meals?.length > 0) && "Pas de diète"}</div></div></div>)}</div>
            )}
          </div>
          <div className="panel">
            <h3><CalendarIcon size={16} color="var(--acid)" />Sans séance ce mois<span className="ct mono">{studentsWithNoSessionThisMonth.length}</span></h3>
            {studentsWithNoSessionThisMonth.length === 0 ? <p className="muted small" style={{ marginTop: 10 }}>Tous tes élèves ont au moins une séance programmée.</p> : (
              <div className="attention-list">{studentsWithNoSessionThisMonth.slice(0, 6).map((s) => <div className="attention-row" key={s.id}><Plate name={s.name} size={28} /><div className="ar-body"><div className="ar-name">{s.name}</div></div></div>)}</div>
            )}
          </div>
          {Object.keys(gymCounts).length > 0 && (
            <div className="panel"><h3>Fréquentation par salle</h3><div className="hbar-list" style={{ marginTop: 10 }}>{Object.entries(gymCounts).sort((a, b) => b[1] - a[1]).map(([gym, count]) => <div className="hbar-row" key={gym}><div className="hbar-label">{gym}</div><div className="hbar-track"><div className="hbar-fill" style={{ width: `${(count / Math.max(...Object.values(gymCounts))) * 100}%` }} /></div><div className="hbar-val mono">{count}</div></div>)}</div></div>
          )}
        </div>
      </div>
    </>
  );
}

function ProgramsSection({ onApplyToStudent, students, onApplyDiet }) {
  const [tab, setTab] = useState("programs");
  const [programId, setProgramId] = useState("pro-masse");
  const [dietId, setDietId] = useState("diete-seche");
  const [openSession, setOpenSession] = useState(null);
  const [openPlan, setOpenPlan] = useState(null);
  const [applyDietTarget, setApplyDietTarget] = useState(null);
  const program = PROGRAM_LIBRARY[programId];
  const diet = DIET_LIBRARY[dietId];

  async function applyDietToStudent(studentId, dietPlan) {
    const s = await safeGet(KEYS.student(studentId));
    if (!s) return;
    const meals = dietPlan.meals.map((m) => ({ ...m, id: uid(), items: (m.items || []).map((it) => ({ ...it, id: uid() })) }));
    await safeSet(KEYS.student(studentId), { ...s, diet: { ...s.diet, planName: `${diet.label} — ${dietPlan.label}`, meals } });
    setApplyDietTarget(null);
  }

  return (
    <>
      <div className="sec-head"><h2>Bibliothèque</h2></div>
      <div className="lib-tabs">
        <button className={`lib-tab-btn ${tab === "programs" ? "active" : ""}`} onClick={() => setTab("programs")}><Dumbbell size={15} />Programmes</button>
        <button className={`lib-tab-btn ${tab === "diets" ? "active" : ""}`} onClick={() => setTab("diets")}><Apple size={15} />Diètes</button>
      </div>

      {tab === "programs" && (
        <>
          <div className="program-switch">{Object.values(PROGRAM_LIBRARY).map((p) => <button key={p.id} className={`chip-btn lg ${programId === p.id ? "active" : ""}`} onClick={() => { setProgramId(p.id); setOpenSession(null); }}>{p.label}</button>)}</div>
          <div className="program-sessions">
            {program.sessions.map((session) => {
              const isOpen = openSession === session.id;
              return (
                <div className="block-card" key={session.id}>
                  <button className="session-head" onClick={() => setOpenSession(isOpen ? null : session.id)}>
                    <div><h3 className="card-title" style={{ margin: 0 }}>{session.label}</h3><p className="muted small" style={{ margin: "4px 0 0" }}>{session.exercises.length} exercices · échauffement : {session.warmup}</p></div>
                    <span className="session-toggle mono">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <>
                      <div className="program-exercise-list">{session.exercises.map((ex, i) => <div className="program-exercise-row" key={i}><div className="pe-num mono">{i + 1}</div><div className="pe-body"><div className="pe-name">{ex.name}</div><div className="pe-stats mono">{ex.sets} séries · {ex.reps} reps · repos {ex.rest}</div>{ex.technique && <div className="pe-technique">{ex.technique}</div>}</div></div>)}</div>
                      <button className="btn primary full" style={{ marginTop: 12 }} onClick={() => onApplyToStudent(session)}><Plus size={15} strokeWidth={2.4} />Appliquer cette séance à un élève</button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "diets" && (
        <>
          <div className="program-switch">{Object.values(DIET_LIBRARY).map((d) => <button key={d.id} className={`chip-btn lg ${dietId === d.id ? "active" : ""}`} onClick={() => { setDietId(d.id); setOpenPlan(null); }}>{d.label}</button>)}</div>
          <div className="diet-lib-banner">
            <div className="dlb-meta"><span className="dlb-label">{diet.description}</span></div>
            <div className="dlb-macros"><span className="dlb-chip mono">{diet.kcal}</span><span className="dlb-chip mono">Protéines {diet.protein}</span><span className="dlb-chip mono">Glucides {diet.carbs}</span><span className="dlb-chip mono">Lipides {diet.fat}</span></div>
          </div>
          <div className="program-sessions">
            {diet.plans.map((plan) => {
              const isOpen = openPlan === plan.id;
              return (
                <div className="block-card" key={plan.id}>
                  <button className="session-head" onClick={() => setOpenPlan(isOpen ? null : plan.id)}>
                    <div><h3 className="card-title" style={{ margin: 0 }}>{plan.label}</h3><p className="muted small" style={{ margin: "4px 0 0" }}>{plan.meals.length} repas · {plan.meals.map((m) => m.label.split(" ")[1]).join(" · ")}</p></div>
                    <span className="session-toggle mono">{isOpen ? "−" : "+"}</span>
                  </button>
                  {isOpen && (
                    <>
                      <div className="diet-plan-meals">
                        {plan.meals.map((meal) => (
                          <div className="dpm-meal" key={meal.id}>
                            <div className="dpm-meal-head">{meal.label}</div>
                            {meal.notes && <p className="dpm-notes">{meal.notes}</p>}
                            <div className="dpm-items">
                              {(meal.items || []).map((it, i) => (
                                <div className="dpm-item" key={i}>
                                  <span className="dpm-item-name">{it.name}</span>
                                  <span className="dpm-item-amount mono">{it.amount}g</span>
                                  <span className="dpm-item-kcal mono">{Math.round(it.kcal * it.amount / 100)} kcal</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button className="btn primary full" style={{ marginTop: 12 }} onClick={() => setApplyDietTarget(plan)}>
                        <Apple size={15} />Appliquer cette journée à un élève
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {applyDietTarget && (
        <div className="modal-backdrop" onClick={() => setApplyDietTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h3>Appliquer « {applyDietTarget.label} »</h3><button className="icon-btn" onClick={() => setApplyDietTarget(null)}><X size={18} /></button></div>
            {students.length === 0
              ? <p className="modal-text">Aucun élève pour l'instant.</p>
              : <><p className="modal-text">Choisis l'élève à qui appliquer cette journée alimentaire. Cela remplacera sa diète actuelle.</p><div className="picker-list">{students.map((s) => <button key={s.id} className="picker-item" onClick={() => applyDietToStudent(s.id, applyDietTarget)}>{s.name}</button>)}</div></>
            }
          </div>
        </div>
      )}
    </>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&family=Archivo:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap');
html,body,#root{margin:0;padding:0;background:#15161A;min-height:100vh}
.fonte-shell{--bg:#15161A;--bg-1:#1B1D22;--bg-2:#212329;--bg-3:#282A31;--line:#2E3037;--line-2:#3A3D45;--txt:#F2F2EF;--txt-2:#B7B5AD;--txt-3:#807E76;--txt-4:#5C5A53;--acid:#C8FF4D;--acid-dim:#9BC23A;--red:#E8543F;--metal-1:#34373F;--metal-2:#23252B;--r:14px;--r-sm:9px;--sidebar-w:220px;background:var(--bg);color:var(--txt);font-family:'Archivo',system-ui,sans-serif;font-size:15px;line-height:1.45;-webkit-font-smoothing:antialiased;min-height:100vh;width:100%}
.fonte-shell *{box-sizing:border-box}
.fonte-shell button,.fonte-shell input,.fonte-shell select,.fonte-shell textarea{font-family:inherit}
.fonte-shell .mono{font-family:'JetBrains Mono',monospace;font-feature-settings:"tnum" 1}
.loading-wrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px}
.loading-bar{width:160px;height:3px;background:var(--bg-3);border-radius:2px;overflow:hidden}
.loading-fill{width:40%;height:100%;background:var(--acid);animation:loadbar 1.1s ease-in-out infinite}
@keyframes loadbar{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}
.loading-text{font-size:11px;letter-spacing:.15em;color:var(--txt-3)}
.app-grid{display:grid;grid-template-columns:var(--sidebar-w) 1fr;min-height:100vh}
.app-grid.is-mobile{display:flex;flex-direction:column;min-height:100vh}
.sidebar{background:var(--bg-1);border-right:1px solid var(--line);display:flex;flex-direction:column;padding:22px 16px;padding-top:max(22px,calc(env(safe-area-inset-top) + 12px))}
.brand{display:flex;align-items:center;gap:11px;padding:4px 6px 22px;position:relative}
.mark{width:34px;height:34px;border-radius:7px;flex:none;background:var(--acid);display:grid;place-items:center;box-shadow:0 0 0 1px #0003 inset;position:relative}
.mark::after{content:"";width:11px;height:11px;border-radius:3px;background:var(--bg)}
.brand-name{font-family:'Oswald';text-transform:uppercase;font-weight:700;font-size:21px;letter-spacing:.06em;line-height:1}
.brand-sub{font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--txt-3);font-weight:500}
.nav{display:flex;flex-direction:column;gap:3px;margin-top:6px}
.nav a{display:flex;align-items:center;gap:12px;padding:10px 11px;border-radius:var(--r-sm);color:var(--txt-2);text-decoration:none;font-weight:500;font-size:14px;cursor:pointer;transition:background .14s,color .14s}
.nav a:hover{background:var(--bg-2);color:var(--txt)}
.nav a.active{background:var(--bg-3);color:var(--txt)}
.nav a.active .ic{color:var(--acid)}
.nav a .badge{margin-left:auto;font-size:11px;background:var(--red);color:#fff;border-radius:20px;padding:1px 7px;font-weight:600}
.nav a .badge.soon{background:var(--bg-2);color:var(--txt-4);border:1px solid var(--line);font-weight:500;font-size:9px;text-transform:uppercase;letter-spacing:.05em;padding:2px 6px}
.nav-scrim{position:fixed;inset:0;background:rgba(11,12,14,0.7);backdrop-filter:blur(2px);z-index:60}
.mobile-drawer{position:fixed;top:0;left:0;bottom:0;width:78vw;max-width:300px;z-index:70;transform:translateX(-100%);transition:transform .25s ease;box-shadow:20px 0 40px #0008;padding-top:max(22px,env(safe-area-inset-top))}
.mobile-drawer.open{transform:translateX(0)}
.drawer-close{margin-left:auto}
.main{display:flex;flex-direction:column;min-width:0;min-height:100vh}
.topbar{height:calc(60px + env(safe-area-inset-top));flex:none;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:14px;padding:env(safe-area-inset-top) 22px 0;background:var(--bg)}
.topbar h1{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:19px;letter-spacing:.03em;white-space:nowrap}
.topbar .day{font-size:12px;color:var(--txt-3);padding-left:14px;border-left:1px solid var(--line);margin-left:2px;white-space:nowrap}
.topbar-actions{margin-left:auto;display:flex;gap:8px;flex:none}
.menu-btn{flex:none}
.search{margin-left:auto;display:flex;align-items:center;gap:9px;background:var(--bg-1);border:1px solid var(--line);border-radius:9px;padding:8px 12px;width:200px;color:var(--txt-3);flex:none}
.search input{background:none;border:0;outline:0;color:var(--txt);font-size:13px;width:100%;min-width:0}
.search input::placeholder{color:var(--txt-4)}
.back-btn{display:inline-flex;align-items:center;gap:7px;background:transparent;border:none;color:var(--txt-2);font-size:14px;font-weight:600;cursor:pointer;flex:none;padding:6px 0}
.back-btn:hover{color:var(--txt)}
.detail-topbar{gap:12px}
.detail-topbar-id{display:flex;align-items:center;gap:9px;min-width:0;flex:1}
.detail-topbar-name{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:14px;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.btn{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-family:'Oswald';text-transform:uppercase;letter-spacing:.04em;font-weight:600;font-size:13px;border-radius:9px;padding:9px 15px;border:1px solid var(--line-2);background:var(--bg-1);color:var(--txt);transition:.14s;white-space:nowrap}
.btn:hover{background:var(--bg-2)}
.btn.primary{background:var(--acid);color:#0E0F12;border-color:var(--acid)}
.btn.primary:hover{background:#d4ff6e}
.btn.danger{background:var(--red);color:#fff;border-color:var(--red)}
.btn.danger:hover{filter:brightness(1.1)}
.btn.full{width:100%;justify-content:center}
.btn:disabled{opacity:.55;cursor:not-allowed}
.btn-ghost{display:inline-flex;align-items:center;gap:6px;background:transparent;color:var(--acid-dim);border:1px dashed var(--line-2);padding:9px 14px;border-radius:7px;font-size:13px;font-weight:600;cursor:pointer}
.btn-ghost:hover{border-color:var(--acid-dim);color:var(--acid)}
.day-actions{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
.picker-modal{max-width:460px}
.picker-groups{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px}
.chip-btn{font-family:'Oswald';text-transform:uppercase;letter-spacing:.04em;font-weight:600;font-size:11.5px;color:var(--txt-2);background:var(--bg-2);border:1px solid var(--line);border-radius:20px;padding:6px 13px;cursor:pointer;transition:.14s}
.chip-btn:hover{border-color:var(--line-2);color:var(--txt)}
.chip-btn.active{background:var(--acid);color:#0E0F12;border-color:var(--acid)}
.picker-list{display:flex;flex-direction:column;gap:4px;max-height:320px;overflow-y:auto}
.picker-item{text-align:left;background:var(--bg-2);border:1px solid var(--line);border-radius:8px;padding:10px 13px;color:var(--txt);font-size:13.5px;cursor:pointer;transition:.14s}
.picker-item:hover{background:var(--bg-3);border-color:var(--acid-dim);color:var(--acid)}
.program-switch{display:flex;gap:8px;margin-bottom:20px}
.chip-btn.lg{padding:9px 18px;font-size:12.5px}
.program-sessions{display:flex;flex-direction:column;gap:12px;max-width:760px}
.session-head{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;background:transparent;border:none;cursor:pointer;text-align:left;padding:0;color:inherit}
.session-toggle{font-size:20px;color:var(--acid);width:24px;height:24px;display:flex;align-items:center;justify-content:center;flex:none}
.program-exercise-list{display:flex;flex-direction:column;gap:8px;margin-top:16px;padding-top:14px;border-top:1px solid var(--line)}
.program-exercise-row{display:flex;gap:12px;padding:10px;background:var(--bg-2);border-radius:8px}
.pe-num{width:22px;height:22px;border-radius:50%;background:var(--bg-3);color:var(--acid);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex:none}
.pe-body{flex:1;min-width:0}
.pe-name{font-weight:600;font-size:13.5px}
.pe-stats{font-size:11.5px;color:var(--txt-2);margin-top:3px}
.pe-technique{font-size:11.5px;color:var(--acid-dim);margin-top:3px;font-style:italic}
.cal-header{display:flex;align-items:center;justify-content:center;gap:18px;margin:4px 0 16px}
.cal-month-label{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:16px;letter-spacing:.04em;min-width:160px;text-align:center}
.cal-weekdays{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:6px}
.cal-weekdays div{text-align:center;font-size:11px;color:var(--txt-4);padding:4px 0}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.cal-cell{aspect-ratio:1;min-height:64px;background:var(--bg-1);border:1px solid var(--line);border-radius:9px;padding:6px;display:flex;flex-direction:column;align-items:flex-start;gap:4px;cursor:pointer;transition:.14s;text-align:left}
.cal-cell:hover{border-color:var(--line-2);background:var(--bg-2)}
.cal-cell.empty{background:transparent;border:none;cursor:default}
.cal-cell.today{border-color:var(--acid-dim)}
.cal-cell.today .cal-day-num{color:var(--acid)}
.cal-day-num{font-size:12px;color:var(--txt-2);font-weight:600}
.cal-tags{display:flex;flex-direction:column;gap:2px;width:100%}
.cal-tag{font-size:9.5px;background:var(--bg-3);color:var(--txt-2);border-radius:4px;padding:2px 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cal-tag.more{color:var(--acid-dim);background:transparent;padding:2px 0}
.day-session-list{display:flex;flex-direction:column;gap:8px;margin-bottom:16px}
.day-session-item{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;background:var(--bg-2);border:1px solid var(--line);border-radius:9px;padding:11px 13px}
.dsi-type{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:13px;letter-spacing:.02em}
.dsi-meta{font-size:11px;color:var(--txt-3);margin-top:3px}
.dsi-students{font-size:12.5px;color:var(--txt-2);margin-top:4px}
.student-check-list{display:flex;flex-direction:column;gap:6px;max-height:180px;overflow-y:auto}
.student-check{display:flex;align-items:center;gap:9px;background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:9px 11px;font-size:13.5px;cursor:pointer}
.student-check.checked{border-color:var(--acid-dim);background:rgba(200,255,77,0.06)}
.student-check input{accent-color:var(--acid)}
.gym-list{display:flex;flex-direction:column;gap:6px}
.gym-row{display:flex;align-items:center;justify-content:space-between;background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:8px 12px;font-size:13.5px}
.bar-chart{display:flex;align-items:flex-end;gap:14px;height:120px;padding-top:10px}
.bar-col{flex:1;display:flex;flex-direction:column;align-items:center;gap:6px;height:100%;justify-content:flex-end}
.bar-track{width:100%;max-width:40px;height:100%;display:flex;align-items:flex-end}
.bar-fill{width:100%;background:linear-gradient(var(--acid),var(--acid-dim));border-radius:4px 4px 0 0;min-height:3px;transition:height .4s ease}
.bar-val{font-size:11px;color:var(--txt-2)}
.bar-label{font-size:10px;color:var(--txt-4)}
.hbar-list{display:flex;flex-direction:column;gap:10px}
.hbar-row{display:grid;grid-template-columns:110px 1fr 28px;align-items:center;gap:10px}
.hbar-label{font-size:12.5px;color:var(--txt-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.hbar-track{height:8px;background:var(--bg-3);border-radius:4px;overflow:hidden}
.hbar-fill{height:100%;background:var(--acid);border-radius:4px;min-width:4px;transition:width .4s ease}
.hbar-val{font-size:11.5px;color:var(--txt-3);text-align:right}
.weight-stats-list{display:flex;flex-direction:column;gap:10px}
.weight-stats-row{display:flex;align-items:center;gap:10px}
.wsr-name{flex:1;font-size:13.5px;font-weight:500}
.wsr-delta{font-size:13px;font-weight:700;color:var(--txt-3)}
.wsr-delta.up{color:var(--acid)}
.wsr-delta.down{color:var(--red)}
.attention-list{display:flex;flex-direction:column;gap:10px;margin-top:10px}
.attention-row{display:flex;align-items:center;gap:10px}
.ar-body{min-width:0}
.ar-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ar-reason{font-size:11px;color:var(--txt-3);margin-top:1px}
.diet-header-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.food-item{display:flex;align-items:center;justify-content:space-between;gap:10px}
.food-item-kcal{font-size:11px;color:var(--txt-4);flex:none}
.goal-switch{display:flex;gap:8px;flex-wrap:wrap}
.meal-items{display:flex;flex-direction:column;gap:6px;margin-top:8px}
.meal-item-row{display:grid;grid-template-columns:1fr 56px 20px 70px 24px;gap:8px;align-items:center;background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:7px 9px}
.meal-item-row.readonly{grid-template-columns:1fr 56px 70px;padding:8px 10px}
.mi-name{font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mi-amount{width:100%;background:var(--bg);border:1px solid var(--line);border-radius:5px;padding:4px 6px;color:var(--txt);font-size:12px}
.mi-amount-readonly{font-size:11.5px;color:var(--txt-2)}
.mi-unit{font-size:10.5px;color:var(--txt-4)}
.mi-kcal{font-size:11px;color:var(--acid-dim);text-align:right}
.meal-totals{font-size:11.5px;color:var(--txt-2);border-top:1px solid var(--line);margin-top:8px;padding-top:8px;text-align:right}
.icon-btn{display:inline-flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:7px;border:1px solid var(--line);background:var(--bg-1);color:var(--txt-2);cursor:pointer;flex:none}
.icon-btn:hover{color:var(--txt);border-color:var(--line-2)}
.icon-btn.danger:hover{color:var(--red);border-color:var(--red)}
.icon-btn.sm{width:28px;height:28px}
.scroll{overflow-y:auto;flex:1;padding:24px}
.scroll::-webkit-scrollbar{width:11px}
.scroll::-webkit-scrollbar-thumb{background:var(--bg-3);border-radius:20px;border:3px solid var(--bg)}
.layout{display:grid;grid-template-columns:1fr 300px;gap:20px;max-width:1320px;margin:0 auto}
@media(max-width:1080px){.layout{grid-template-columns:1fr}}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r);padding:15px 16px}
.kpi .lab{display:flex;align-items:center;gap:7px;color:var(--txt-3);font-size:11.5px;margin-bottom:11px;white-space:nowrap;overflow:hidden}
.kpi .num{font-family:'Oswald';font-weight:600;font-size:30px;line-height:.95}
.kpi .unit{font-size:13px;color:var(--txt-3);font-weight:500;margin-left:4px}
.sec-head{display:flex;align-items:baseline;gap:13px;margin-bottom:15px}
.sec-head h2{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:16px;letter-spacing:.04em}
.sec-head .ct{font-size:12px;color:var(--txt-3)}
.roster{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}
.roster.wide{grid-template-columns:repeat(auto-fill,minmax(250px,1fr))}
.card{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r);padding:15px;display:flex;gap:13px;align-items:center;cursor:pointer;transition:.15s;text-align:left;width:100%}
.card:hover{border-color:var(--line-2);background:var(--bg-2);transform:translateY(-1px)}
.card .meta{min-width:0;flex:1}
.card .nm{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:15.5px;letter-spacing:.02em;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--txt)}
.card .prog-nm{font-size:12.5px;color:var(--txt-2);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.card .row{display:flex;gap:18px;margin-top:10px}
.card .stat .k{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--txt-4);font-weight:500}
.card .stat .v{font-family:'JetBrains Mono';font-size:13px;font-weight:600;margin-top:1px}
.plate{position:relative;flex:none;display:grid;place-items:center}
.plate .track{stroke:var(--bg-3)}
.plate .face{border-radius:50%;background:radial-gradient(circle at 38% 32%,#3c4049,#20222800 60%),radial-gradient(circle at 50% 50%,var(--metal-1),var(--metal-2));display:grid;place-items:center;position:relative;box-shadow:inset 0 0 0 1px #0006,inset 0 2px 5px #0007,0 1px 2px #0008}
.plate .ini{font-weight:700;color:var(--txt);letter-spacing:.02em}
.empty-state{display:flex;flex-direction:column;align-items:center;text-align:center;padding:64px 24px;gap:14px;max-width:420px;margin:0 auto}
.empty-plate{width:68px;height:68px;border-radius:50%;border:2px solid var(--line);display:flex;align-items:center;justify-content:center;color:var(--acid-dim);margin-bottom:4px}
.empty-state h2{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:18px}
.empty-state p{color:var(--txt-2);font-size:14px;line-height:1.5;margin:0 0 8px}
.fab{position:fixed;bottom:22px;right:22px;width:54px;height:54px;border-radius:50%;background:var(--acid);color:#0E0F12;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px #0007;z-index:30}
.modal-backdrop{position:fixed;inset:0;background:rgba(11,12,14,0.77);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:80}
.modal{background:var(--bg-1);border:1px solid var(--line-2);border-radius:16px;width:100%;max-width:420px;padding:22px;max-height:86vh;overflow-y:auto}
.modal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
.modal-head h3{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:17px}
.modal-text{color:var(--txt-2);font-size:13.5px;line-height:1.5;margin:0 0 16px}
.modal-confirm-actions{display:flex;gap:10px;justify-content:flex-end}
.modal-form{display:flex;flex-direction:column;gap:14px}
.field{display:flex;flex-direction:column;gap:6px;flex:1;min-width:0}
.field span{font-size:12px;color:var(--txt-2);font-weight:600}
.field input,.field select{background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:10px 12px;color:var(--txt);font-size:14px;width:100%}
.field input:focus,.field select:focus{outline:none;border-color:var(--acid-dim)}
.field-row{display:flex;gap:10px}
.link-row{display:flex;gap:8px}
.link-row input{flex:1;background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:10px 12px;color:var(--txt-2);font-size:12px;min-width:0}
.detail-identity{display:flex;gap:16px;align-items:center;margin-bottom:24px;max-width:760px;margin-left:auto;margin-right:auto}
.eyebrow{font-family:'Oswald';text-transform:uppercase;letter-spacing:.18em;font-weight:500;font-size:11px;color:var(--txt-3);margin-bottom:6px}
.detail-name{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:24px;margin:4px 0 8px;letter-spacing:.02em}
.dmeta{display:flex;gap:7px;flex-wrap:wrap}
.pill{font-size:11px;color:var(--txt-2);background:var(--bg-3);border:1px solid var(--line);border-radius:6px;padding:3px 9px}
.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-bottom:20px;overflow-x:auto;max-width:760px;margin-left:auto;margin-right:auto;-ms-overflow-style:none;scrollbar-width:none}
.tabs::-webkit-scrollbar{display:none}
.tab-btn{display:inline-flex;align-items:center;gap:7px;background:transparent;border:none;color:var(--txt-3);padding:10px 13px;font-size:13px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;flex:none}
.tab-btn.active{color:var(--acid);border-bottom-color:var(--acid)}
.tab-btn:hover:not(.active){color:var(--txt-2)}
.tab-panel{max-width:760px;margin:0 auto}
.panel-grid{display:grid;gap:14px}
.panel-stack{display:flex;flex-direction:column;gap:14px}
.block-card{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r);padding:16px}
.card-title{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:14px;margin:0 0 13px;letter-spacing:.02em}
.plan-name-input{width:100%;background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:11px 13px;color:var(--txt);font-size:14px;font-weight:600}
.plan-name-input:focus{outline:none;border-color:var(--acid-dim)}
.macro-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:14px}
@media(min-width:480px){.macro-grid{grid-template-columns:repeat(4,1fr)}}
.day-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.day-label-input{flex:1;background:transparent;border:none;border-bottom:1px solid var(--line);color:var(--txt);font-family:'Oswald';text-transform:uppercase;font-size:14px;padding:4px 2px;min-width:0}
.day-label-input:focus{outline:none;border-color:var(--acid-dim)}
.day-title-readonly{font-family:'Oswald';text-transform:uppercase;font-size:14px;margin:0 0 12px;letter-spacing:.02em}
.exercise-table{display:flex;flex-direction:column;gap:6px}
.exercise-table-head{display:grid;grid-template-columns:2fr .7fr .7fr .9fr 28px;gap:8px;font-size:10.5px;color:var(--txt-4);padding:0 2px 2px}
.exercise-table-head.readonly{grid-template-columns:2fr .7fr .7fr .9fr}
.exercise-row{display:grid;grid-template-columns:2fr .7fr .7fr .9fr 28px;gap:8px;align-items:center}
.exercise-row.readonly{grid-template-columns:2fr .7fr .7fr .9fr;font-size:13px;padding:6px 2px}
.exercise-row input{background:var(--bg-2);border:1px solid var(--line);border-radius:6px;padding:8px 9px;color:var(--txt);font-size:12.5px;width:100%;min-width:0}
.exercise-row input:focus{outline:none;border-color:var(--acid-dim)}
.meal-textarea{width:100%;background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:11px 13px;color:var(--txt);font-size:13.5px;resize:vertical;line-height:1.5}
.meal-textarea:focus{outline:none;border-color:var(--acid-dim)}
.meal-readonly{font-size:13.5px;color:var(--txt-2);line-height:1.6;margin:0;white-space:pre-wrap}
.macro-readout{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-top:4px}
@media(min-width:480px){.macro-readout{grid-template-columns:repeat(4,1fr)}}
.macro-chip{background:var(--bg-2);border:1px solid var(--line);border-radius:10px;padding:12px;text-align:center}
.macro-chip-value{font-size:17px;font-weight:700;color:var(--acid)}
.macro-unit{font-size:11px;color:var(--txt-4);margin-left:2px}
.macro-chip-label{font-size:11px;color:var(--txt-2);margin-top:3px}
.weight-chart{position:relative;margin-bottom:14px}
.weight-svg{width:100%;height:90px;display:block}
.weight-latest{position:absolute;top:-4px;right:0;font-size:19px;font-weight:700;color:var(--acid)}
.weight-latest span{font-size:11px;color:var(--txt-4)}
.add-weight-row{display:flex;gap:8px}
.add-weight-row input{flex:1;background:var(--bg-2);border:1px solid var(--line);border-radius:7px;padding:9px 12px;color:var(--txt);font-size:13.5px;min-width:0}
.weight-log{margin-top:14px;border-top:1px solid var(--line);padding-top:10px}
.weight-log-row{display:flex;justify-content:space-between;font-size:12.5px;color:var(--txt-2);padding:5px 0}
.muted{color:var(--txt-3);font-size:13.5px}
.muted.center{text-align:center;padding:20px 0}
.muted.small{font-size:12.5px}
.panel{background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r);padding:16px;margin-bottom:16px}
.panel h3{font-family:'Oswald';text-transform:uppercase;font-weight:600;font-size:14px;letter-spacing:.04em;display:flex;align-items:center;gap:9px;margin-bottom:4px}
.panel h3 .ct{margin-left:auto;font-size:12px;color:var(--txt-3);text-transform:none;letter-spacing:0}
.chat-panel{display:flex;flex-direction:column;height:56vh;min-height:360px;background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r);overflow:hidden}
.chat-scroll{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px}
.chat-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px;color:var(--txt-4);text-align:center;padding:20px}
.chat-empty p{font-size:13px;margin:0;max-width:240px}
.chat-bubble-row{display:flex}
.chat-bubble-row.self{justify-content:flex-end}
.chat-bubble{max-width:78%;background:var(--bg-3);border:1px solid var(--line);border-radius:12px 12px 12px 4px;padding:9px 12px}
.chat-bubble-row.self .chat-bubble{background:var(--acid);color:#0E0F12;border-color:var(--acid);border-radius:12px 12px 4px 12px}
.chat-bubble-text{font-size:14px;line-height:1.4;word-break:break-word}
.chat-bubble-time{font-size:10px;opacity:.6;margin-top:4px;text-align:right}
.chat-input-row{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line)}
.chat-input-row input{flex:1;background:var(--bg-2);border:1px solid var(--line);border-radius:20px;padding:10px 16px;color:var(--txt);font-size:14px;min-width:0}
.chat-input-row input:focus{outline:none;border-color:var(--acid-dim)}
.chat-send{width:40px;height:40px;border-radius:50%;background:var(--acid);color:#0E0F12;border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.chat-send:hover{filter:brightness(1.08)}
.portal{max-width:760px;margin:0 auto;padding:22px 18px 60px}
@media(max-width:760px){
.app-grid{display:flex;flex-direction:column}
.main{width:100%}
.topbar{padding:0 14px;gap:10px;height:56px}
.topbar h1{font-size:16px}
.scroll{padding:16px}
.kpis{grid-template-columns:repeat(2,1fr);gap:10px}
.kpi{padding:13px 14px}
.kpi .num{font-size:25px}
.roster,.roster.wide{grid-template-columns:1fr;gap:10px}
.card{padding:13px;gap:12px}
.detail-identity{flex-direction:column;text-align:center;gap:12px;margin-bottom:18px}
.dmeta{justify-content:center}
.detail-name{font-size:21px}
.tabs{gap:0}
.tab-btn{padding:9px 10px;font-size:12px}
.tab-btn span{display:none}
.tab-btn.active span{display:inline}
.field-row{flex-direction:column;gap:12px}
.exercise-row,.exercise-table-head{grid-template-columns:1.5fr .55fr .55fr .8fr 24px;gap:4px}
.exercise-row.readonly,.exercise-table-head.readonly{grid-template-columns:1.5fr .55fr .55fr .8fr}
.exercise-row input{padding:7px 5px;font-size:11.5px}
.exercise-table-head{font-size:9px}
.macro-grid,.macro-readout{grid-template-columns:repeat(2,1fr)}
.modal{padding:18px;border-radius:14px;max-width:none;width:100%}
.chat-panel{height:62vh}
.chat-bubble{max-width:86%}
.empty-state{padding:48px 20px}
.day-label-input{font-size:13px}
.onboarding-wrap{min-height:100vh;display:flex;align-items:flex-start;justify-content:center;padding:calc(env(safe-area-inset-top) + 24px) 24px 24px;background:var(--bg);overflow-y:auto}
.onboarding-card{width:100%;max-width:480px;background:var(--bg-1);border:1px solid var(--line);border-radius:var(--r);padding:36px 32px}
.onboarding-logo{display:flex;align-items:center;gap:10px;margin-bottom:28px}
.onboarding-logo .brand-name{font-family:'Oswald';font-size:22px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--txt)}
.onboarding-title{font-family:'Oswald';text-transform:uppercase;font-size:20px;font-weight:600;margin:0 0 6px}
.onboarding-success{display:flex;flex-direction:column;align-items:center;gap:20px;padding:8px 0;text-align:center}
.onboarding-success h2{font-family:'Oswald';text-transform:uppercase;font-size:22px;margin:0}
.ob-check-circle{width:64px;height:64px;border-radius:50%;background:var(--acid);display:flex;align-items:center;justify-content:center;flex:none}
.ob-next-steps{width:100%;display:flex;flex-direction:column;gap:16px;text-align:left;background:var(--bg-2);border-radius:var(--r-sm);padding:20px}
.ob-step{display:flex;gap:14px;align-items:flex-start}
.ob-step-num{font-size:11px;font-weight:700;color:var(--acid);background:var(--bg-3);border-radius:4px;padding:2px 6px;flex:none;margin-top:2px}
.ob-step strong{display:block;font-size:13.5px;font-weight:600;margin-bottom:3px}
.ob-step p{margin:0;font-size:12.5px;color:var(--txt-2);line-height:1.5}
.ob-waiting{font-size:13px;color:var(--txt-3);margin:0}
.onboarding-error{color:var(--red);font-size:13px;margin:0}
@media(max-width:480px){.onboarding-card{padding:28px 20px}}
.sp-root{display:flex;flex-direction:column;height:100vh;height:100dvh;background:var(--bg);overflow:hidden}
.sp-header{background:var(--bg-1);border-bottom:1px solid var(--line);padding:calc(env(safe-area-inset-top) + 14px) 20px 14px;flex:none}
.sp-header-inner{display:flex;align-items:center;gap:14px}
.sp-header-text{flex:1;min-width:0}
.sp-greeting{font-size:11px;color:var(--txt-3);text-transform:uppercase;letter-spacing:.06em;font-family:'Oswald'}
.sp-name{font-family:'Oswald';font-size:20px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-pills{display:flex;gap:6px;flex-wrap:wrap}
.sp-content{flex:1;overflow-y:auto;padding:16px}
.sp-plan-banner{display:flex;align-items:center;gap:10px;font-family:'Oswald';font-size:15px;font-weight:500;text-transform:uppercase;letter-spacing:.04em;color:var(--txt-2);padding:10px 14px;background:var(--bg-2);border-radius:var(--r-sm);margin-bottom:4px}
.sp-empty-tab{display:flex;flex-direction:column;align-items:center;gap:14px;padding:60px 20px;text-align:center;color:var(--txt-3)}
.sp-empty-tab p{margin:0;font-size:14px;line-height:1.6}
.sp-bottom-nav{display:flex;background:var(--bg-1);border-top:1px solid var(--line);flex:none;padding-bottom:env(safe-area-inset-bottom)}
.sp-nav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:12px 8px;background:none;border:none;cursor:pointer;color:var(--txt-4);font-size:11px;font-weight:500;letter-spacing:.02em;position:relative;transition:color .15s}
.sp-nav-btn.active{color:var(--acid)}
.sp-nav-btn.active svg{filter:drop-shadow(0 0 6px #C8FF4D55)}
.sp-nav-dot{position:absolute;top:10px;right:calc(50% - 16px);width:6px;height:6px;border-radius:50%;background:var(--acid);display:none}
.sp-nav-btn:last-child .sp-nav-dot{display:block}
.pin-gate{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:calc(env(safe-area-inset-top) + 24px) 24px 24px}
.pin-card{width:100%;max-width:320px;display:flex;flex-direction:column;align-items:center;gap:24px}
.pin-logo{display:flex;align-items:center;gap:10px}
.pin-logo .brand-name{font-family:'Oswald';font-size:24px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--txt)}
.pin-label{font-size:13px;color:var(--txt-3);text-transform:uppercase;letter-spacing:.1em;margin:0}
.pin-dots{display:flex;gap:16px}
.pin-dot{width:14px;height:14px;border-radius:50%;border:2px solid var(--line-2);transition:.15s}
.pin-dot.filled{background:var(--acid);border-color:var(--acid)}
.pin-dot.err{background:var(--red);border-color:var(--red)}
.pin-dots.shake{animation:shake .35s ease}
@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
.pin-grid{display:grid;grid-template-columns:repeat(3,72px);gap:10px}
.pin-key{width:72px;height:72px;border-radius:50%;background:var(--bg-2);border:1px solid var(--line);font-family:'Oswald';font-size:22px;font-weight:500;color:var(--txt);cursor:pointer;transition:.1s;display:flex;align-items:center;justify-content:center}
.pin-key:hover{background:var(--bg-3)}
.pin-key:active{transform:scale(.92)}
.pin-key.invisible{visibility:hidden;pointer-events:none}
.landing{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);padding:calc(env(safe-area-inset-top) + 28px) 28px 28px}.landing-inner{width:100%;max-width:360px;display:flex;flex-direction:column;align-items:center;gap:32px}.landing-logo{display:flex;align-items:center;gap:12px}.landing-logo .brand-name{font-family:"Oswald";font-size:28px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}.landing-sub{font-size:11px;color:var(--txt-4);letter-spacing:.14em;text-transform:uppercase;margin:-20px 0 0}.landing-choices{width:100%;display:flex;flex-direction:column;gap:12px}.landing-choice{width:100%;display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:20px;border-radius:var(--r);border:1px solid var(--line);background:var(--bg-1);text-align:left;cursor:default}.landing-choice.coach{cursor:pointer;transition:.15s}.landing-choice.coach:hover{border-color:var(--acid);background:var(--bg-2)}.landing-choice.coach:active{transform:scale(.98)}.lc-icon{color:var(--acid);display:flex;margin-bottom:4px}.lc-title{font-family:"Oswald";font-size:18px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--txt)}.lc-desc{font-size:12.5px;color:var(--txt-3);line-height:1.5}.landing-choice.student .lc-icon{color:var(--txt-4)}.landing-choice.student .lc-title{color:var(--txt-2)}.pin-student-hint{font-size:12px;color:var(--txt-4);text-align:center;line-height:1.6;margin:0}

.lib-tabs{display:flex;gap:8px;margin-bottom:16px}
.lib-tab-btn{display:flex;align-items:center;gap:7px;padding:9px 18px;border-radius:var(--r-sm);background:var(--bg-2);border:1px solid var(--line);color:var(--txt-3);font-size:13.5px;font-weight:500;cursor:pointer;transition:.15s}
.lib-tab-btn.active{background:var(--bg-3);border-color:var(--line-2);color:var(--txt)}
.diet-lib-banner{background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:16px;margin-bottom:16px;display:flex;flex-direction:column;gap:12px}
.dlb-label{font-size:13px;color:var(--txt-2);font-weight:500}
.dlb-macros{display:flex;gap:8px;flex-wrap:wrap}
.dlb-chip{font-size:11px;background:var(--bg-3);border:1px solid var(--line-2);border-radius:6px;padding:4px 10px;color:var(--acid);letter-spacing:.02em}
.diet-plan-meals{display:flex;flex-direction:column;gap:10px;margin-top:16px}
.dpm-meal{background:var(--bg-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:0;overflow:hidden}
.dpm-meal-head{font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--txt-3);padding:10px 14px;background:var(--bg-3);border-bottom:1px solid var(--line)}
.dpm-notes{font-size:12px;color:var(--txt-3);margin:0;padding:10px 14px 8px;line-height:1.5;border-bottom:1px solid var(--line)}
.dpm-items{display:flex;flex-direction:column;padding:8px 14px 12px}
.dpm-item{display:flex;align-items:center;gap:0;font-size:13px;padding:5px 0;border-bottom:1px solid var(--line)}
.dpm-item-name{flex:1;color:var(--txt)}
.dpm-item-amount{color:var(--txt-2);min-width:52px;text-align:right;padding-right:10px;font-size:12.5px}
.dpm-item-kcal{color:var(--txt-4);min-width:68px;text-align:right;font-size:12px}.dpm-item:last-child{border-bottom:none}
}
`;
