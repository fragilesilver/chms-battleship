// ============================================================
//  i18n.js  -  labels that change with the question set
//
//  A set picks a language ("en" or "ms") and can override any label
//  in its own `ui` object. Use t("key", { n: 3 }) to read one.
//  Labels with {n} style placeholders get the values filled in.
// ============================================================
const EN = {
  "tab_fire": "Fire",
  "tab_torpedo": "Torpedo",
  "tab_code": "Code",
  "earn_shots": "Earn shots",
  "earn_sonar": "Earn sonar",
  "earn_airstrike": "Earn airstrikes",

  "level_easy": "Easy",
  "level_medium": "Medium",
  "level_hard": "Hard",
  "q_worth_one": "worth 1 shot",
  "q_worth_many": "worth {n} shots",
  "q_worth_sonar": "right answer earns 1 sonar",
  "q_worth_airstrike": "right answer earns 1 airstrike",
  "q_passage": "Read the passage",
  "q_next": "Next question",
  "q_nextIn": "Next question in {n}s",
  "q_shots_one": "Correct! +1 shot for your crew.",
  "q_shots_many": "Correct! +{n} shots for your crew.",
  "q_full": "Correct, but your crew's shots are full. Fire some first!",
  "q_streak": " Three in a row: your crew earned a {power}!",
  "q_power": "Correct! +1 {power} for your crew.",
  "q_recharge": "Correct, but your {power} is still recharging.",
  "q_wrong": "Not this time. Read the explanation, then try another.",
  "power_sonar": "sonar",
  "power_airstrike": "airstrike",

  "fire_help": "Tap a square in another team's waters, then fire. Get 3 questions right in a row to earn a power-up.",

  "torp_intro": "A torpedo is a free shot that <strong>never misses</strong>: it locks on to an enemy ship. Solve its puzzle to launch it. Get the puzzle wrong and the torpedo is lost.",
  "torp_introTyped": "A torpedo is a free shot that <strong>never misses</strong>: it locks on to an enemy ship. Type the right answer to launch it. Get it wrong and the torpedo is lost.",
  "torp_load": "Load a torpedo",
  "torp_loadAnother": "Load another torpedo",
  "torp_reloading": "Torpedo reloading, {n}s",
  "torp_nextIn": "Next torpedo in {n}s",
  "torp_typedTitle": "Torpedo question",
  "torp_placeholder": "Your answer",
  "torp_launch": "Launch",
  "torp_lost": "The answer was {answer}, not {guess}. The torpedo is lost.",

  "mode_quiz": "Questions",
  "mode_torpedo": "Torpedoes",
  "mode_console": "Code console",
  "mode_on": "on",
  "mode_off": "off",
  "mode_quizLabel": "Earn shots by answering questions",
  "mode_torpedoLabel": "Torpedoes: solve a puzzle to launch a guaranteed hit",
  "mode_consoleLabel": "Code console: write FIRE commands in pseudocode",
};

const MS = {
  "tab_fire": "Tembak",
  "tab_torpedo": "Torpedo",
  "tab_code": "Kod",
  "earn_shots": "Dapatkan peluru",
  "earn_sonar": "Dapatkan sonar",
  "earn_airstrike": "Dapatkan serangan udara",

  "level_easy": "Mudah",
  "level_medium": "Sederhana",
  "level_hard": "Sukar",
  "q_worth_one": "bernilai 1 peluru",
  "q_worth_many": "bernilai {n} peluru",
  "q_worth_sonar": "jawapan betul mendapat 1 sonar",
  "q_worth_airstrike": "jawapan betul mendapat 1 serangan udara",
  "q_passage": "Baca petikan",
  "q_next": "Soalan seterusnya",
  "q_nextIn": "Soalan seterusnya dalam {n}s",
  "q_shots_one": "Betul! +1 peluru untuk kru anda.",
  "q_shots_many": "Betul! +{n} peluru untuk kru anda.",
  "q_full": "Betul, tetapi peluru kru anda sudah penuh. Tembak dahulu!",
  "q_streak": " Tiga jawapan betul berturut-turut: kru anda mendapat {power}!",
  "q_power": "Betul! +1 {power} untuk kru anda.",
  "q_recharge": "Betul, tetapi {power} anda masih mengecas semula.",
  "q_wrong": "Belum tepat. Baca penerangan, kemudian cuba soalan lain.",
  "power_sonar": "sonar",
  "power_airstrike": "serangan udara",

  "fire_help": "Ketik petak di perairan pasukan lain, kemudian tembak. Jawab 3 soalan dengan betul berturut-turut untuk mendapat kuasa tambahan.",

  "torp_intro": "Torpedo ialah tembakan percuma yang <strong>tidak pernah tersasar</strong>: ia mengunci kapal musuh. Selesaikan teka-teki untuk melancarkannya. Jika salah, torpedo hilang.",
  "torp_introTyped": "Torpedo ialah tembakan percuma yang <strong>tidak pernah tersasar</strong>: ia mengunci kapal musuh. Taip jawapan yang betul untuk melancarkannya. Jika salah, torpedo hilang.",
  "torp_load": "Muatkan torpedo",
  "torp_loadAnother": "Muatkan torpedo lain",
  "torp_reloading": "Torpedo sedang dimuat semula, {n}s",
  "torp_nextIn": "Torpedo seterusnya dalam {n}s",
  "torp_typedTitle": "Soalan torpedo",
  "torp_placeholder": "Jawapan anda",
  "torp_launch": "Lancar",
  "torp_lost": "Jawapannya ialah {answer}, bukan {guess}. Torpedo hilang.",

  "mode_quiz": "Soalan",
  "mode_torpedo": "Torpedo",
  "mode_console": "Konsol kod",
  "mode_on": "hidup",
  "mode_off": "mati",
  "mode_quizLabel": "Dapatkan peluru dengan menjawab soalan",
  "mode_torpedoLabel": "Torpedo: taip jawapan yang betul untuk tembakan yang pasti kena",
  "mode_consoleLabel": "Konsol kod: tulis arahan FIRE dalam pseudokod",
};

const TABLES = { en: EN, ms: MS };
let current = EN;

// Pick the labels for a question set
export function useLanguage(set) {
  const base = TABLES[set && set.uiLang] || EN;
  current = { ...base, ...((set && set.ui) || {}) };
}

export function t(key, vars = {}) {
  const text = current[key] ?? EN[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : ""));
}
