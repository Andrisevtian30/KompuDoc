// Mencari solusi dari internet: pertanyaan di Super User (Stack Exchange).
// Coba connect to superuser itu cuman masih tidak pasti. Kemungkinan bakal di ganti.
// Context in buat usernya bertanya basic info gitu tanpa harus tanya di browser.
// tapi ini ambil data hanya dari super user jadi tidak pasti banget.
const API = "https://api.stackexchange.com/2.3";
const SITE = "superuser";
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map();

// kalau bingung, ini entitas html yang di convert ke text. misal &amp; jadi &. ini biar lebih readable.
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

function htmlToText(html) {
  return html
    .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, "\n$1\n")
    .replace(/<\/(p|li|h\d|blockquote)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(amp|lt|gt|quot|nbsp|#39);/g, (m) => ENTITIES[m])
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max).trimEnd() + "..." : text;
}

async function getJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Stack Exchange API ${res.status}`);
  return res.json();
}

async function searchSolutions(query, limit = 5) {
  const key = `${query.toLowerCase()}|${limit}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.results;

  const params = new URLSearchParams({
    order: "desc", sort: "relevance", q: query, accepted: "True",
    site: SITE, pagesize: String(limit),
  });
  const found = await getJson(`${API}/search/advanced?${params}`);
  const questions = (found.items || []).filter((q) => q.accepted_answer_id);


  //resultnya bedasarkan pertanyaannya(masih agak agak gmna gitu lmao)
  let results = [];
  if (questions.length) {
    const ids = questions.map((q) => q.accepted_answer_id).join(";");
    const answers = await getJson(`${API}/answers/${ids}?site=${SITE}&filter=withbody`);
    const byId = new Map((answers.items || []).map((a) => [a.answer_id, a]));
    results = questions
      .map((q) => {
        const a = byId.get(q.accepted_answer_id);
        if (!a) return null;
        return {
          title: htmlToText(q.title),
          solution: truncate(htmlToText(a.body), 1500),
          score: a.score,
          source: "Super User",
          url: q.link,
        };
      })
      .filter(Boolean)
      .sort((x, y) => y.score - x.score);
  }
// memory management aja biar tidak numpuk cachenya
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), results });
  return results;
}

module.exports = { searchSolutions, htmlToText };
