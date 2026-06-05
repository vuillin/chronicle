const FEEDS = window.RSS_MONITOR_FEEDS || [];

const statusText = document.querySelector("#status");
const result = document.querySelector("#feed-result");
const statsEl = document.querySelector("#stats");
const filtersEl = document.querySelector("#filters");
const searchInput = document.querySelector("#search");
const emptyEl = document.querySelector("#empty");
const refreshBtn = document.querySelector("#refresh");

const CALENDAR_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 2v2H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2h-2v2H9V2H7Zm12 7v10H5V9h14Z"/></svg>`;
const ARROW_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 11v2h10l-4 4 1.4 1.4L19.8 12l-7.4-7.4L11 6l4 4H5Z"/></svg>`;

let allArticles = [];
let activeSource = "all";

refreshBtn.addEventListener("click", loadFeeds);
searchInput.addEventListener("input", render);

loadFeeds();

async function loadFeeds() {
  refreshBtn.classList.add("is-loading");
  setStatus("Récupération des flux…");
  activeSource = "all";
  renderSkeletons();

  const results = await Promise.allSettled(FEEDS.map(fetchFeed));

  allArticles = [];
  const errors = [];

  for (const item of results) {
    if (item.status === "fulfilled") {
      const feed = item.value;
      for (const article of feed.items) {
        allArticles.push({ ...article, source: feed });
      }
    } else {
      errors.push(item.reason);
    }
  }

  allArticles.sort((a, b) => dateValue(b.pubDate) - dateValue(a.pubDate));

  renderFilters();
  renderStats();
  render(errors);

  if (allArticles.length === 0 && errors.length > 0) {
    setStatus("Aucun flux n'a pu être récupéré.");
  } else {
    setStatus(errors.length > 0 ? `${errors.length} flux ignoré(s).` : "");
  }

  refreshBtn.classList.remove("is-loading");
}

async function fetchFeed(source) {
  const response = await fetch(`/api/feed?url=${encodeURIComponent(source.url)}`);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`${source.title} — ${data.error || "Impossible de récupérer le flux."}`);
  }

  return { ...data.feed, ...source };
}

function render(errors = []) {
  const query = searchInput.value.trim().toLowerCase();

  const articles = allArticles.filter((article) => {
    const matchSource = activeSource === "all" || article.source.theme === activeSource;
    if (!matchSource) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = `${article.title || ""} ${article.description || ""} ${article.source.title || ""}`.toLowerCase();
    return haystack.includes(query);
  });

  result.replaceChildren();

  for (const error of errors) {
    const message = document.createElement("p");
    message.className = "feed-error";
    message.textContent = error.message;
    result.append(message);
  }

  articles.forEach((article, index) => {
    result.append(buildCard(article, index));
  });

  emptyEl.hidden = articles.length > 0 || errors.length > 0;
}

function buildCard(article, index) {
  const card = document.createElement("article");
  card.className = `card feed-theme-${article.source.theme || "default"}`;
  card.style.animationDelay = `${Math.min(index, 12) * 40}ms`;

  const link = document.createElement("a");
  link.className = "card-link";
  link.href = article.link || "#";
  link.target = "_blank";
  link.rel = "noreferrer";
  link.setAttribute("aria-label", article.title || "Article sans titre");

  link.append(buildMedia(article), buildBody(article));
  card.append(link);
  return card;
}

function buildMedia(article) {
  const media = document.createElement("div");
  media.className = "card-media";

  if (article.image) {
    const img = document.createElement("img");
    img.src = article.image;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      media.replaceChildren();
      fillEmptyMedia(media, article);
    });
    media.append(img);
  } else {
    fillEmptyMedia(media, article);
  }

  return media;
}

function fillEmptyMedia(media, article) {
  media.classList.add("is-empty");
  if (article.source.image) {
    const glyph = document.createElement("div");
    glyph.className = "media-glyph";
    const logo = document.createElement("img");
    logo.src = article.source.image;
    logo.alt = "";
    logo.loading = "lazy";
    glyph.append(logo);
    media.append(glyph);
  }
}

function buildBody(article) {
  const body = document.createElement("div");
  body.className = "card-body";

  const top = document.createElement("div");
  top.className = "card-top";

  const source = document.createElement("span");
  source.className = "source";
  if (article.source.image) {
    const logo = document.createElement("img");
    logo.src = article.source.image;
    logo.alt = "";
    logo.loading = "lazy";
    source.append(logo);
  }
  const sourceName = document.createElement("span");
  sourceName.textContent = article.source.title || "Flux RSS";
  source.append(sourceName);
  top.append(source);

  if (article.pubDate) {
    const date = document.createElement("span");
    date.className = "date";
    date.innerHTML = CALENDAR_ICON;
    const text = document.createElement("span");
    text.textContent = formatArticleDate(article.pubDate);
    date.append(text);
    top.append(date);
  }

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = article.title || "Article sans titre";

  body.append(top, title);

  if (article.description) {
    const desc = document.createElement("p");
    desc.className = "card-desc";
    desc.textContent = article.description;
    body.append(desc);
  }

  const foot = document.createElement("div");
  foot.className = "card-foot";
  const footText = document.createElement("span");
  footText.textContent = "Lire l'article";
  foot.append(footText);
  foot.insertAdjacentHTML("beforeend", ARROW_ICON);
  body.append(foot);

  return body;
}

function renderFilters() {
  filtersEl.replaceChildren();

  const sources = FEEDS.map((feed) => ({
    theme: feed.theme,
    title: feed.title,
    image: feed.image,
    count: allArticles.filter((article) => article.source.theme === feed.theme).length
  })).filter((source) => source.count > 0);

  filtersEl.append(buildChip({ theme: "all", title: "Tous", count: allArticles.length }));
  sources.forEach((source) => filtersEl.append(buildChip(source)));
}

function buildChip(source) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = `chip${source.theme === activeSource ? " is-active" : ""} feed-theme-${source.theme || "default"}`;

  if (source.image) {
    const logo = document.createElement("img");
    logo.src = source.image;
    logo.alt = "";
    chip.append(logo);
  } else {
    const dot = document.createElement("span");
    dot.className = "chip-dot";
    chip.append(dot);
  }

  const label = document.createElement("span");
  label.textContent = source.title;
  chip.append(label);

  const count = document.createElement("span");
  count.className = "chip-count";
  count.textContent = source.count;
  chip.append(count);

  chip.addEventListener("click", () => {
    activeSource = source.theme;
    filtersEl.querySelectorAll(".chip").forEach((node) => node.classList.remove("is-active"));
    chip.classList.add("is-active");
    render();
  });

  return chip;
}

function renderStats() {
  const sourceCount = new Set(allArticles.map((article) => article.source.theme)).size;
  statsEl.replaceChildren();
  statsEl.append(buildStat("Articles", allArticles.length));
  statsEl.append(buildStat("Sources", sourceCount));
}

function buildStat(label, value) {
  const group = document.createElement("div");
  const dd = document.createElement("dd");
  dd.textContent = value;
  const dt = document.createElement("dt");
  dt.textContent = label;
  group.append(dd, dt);
  return group;
}

function renderSkeletons() {
  result.replaceChildren();
  emptyEl.hidden = true;

  for (let i = 0; i < 8; i += 1) {
    const card = document.createElement("article");
    card.className = "card skeleton";

    const media = document.createElement("div");
    media.className = "card-media";

    const body = document.createElement("div");
    body.className = "card-body";
    body.append(
      makeSkLine("short"),
      makeSkLine("title"),
      makeSkLine(),
      makeSkLine("short")
    );

    card.append(media, body);
    result.append(card);
  }
}

function makeSkLine(modifier) {
  const line = document.createElement("div");
  line.className = `sk-line${modifier ? " " + modifier : ""}`;
  return line;
}

function setStatus(message) {
  statusText.textContent = message;
}

function dateValue(value) {
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function formatArticleDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value).replace(/\s+\d{2}:\d{2}:\d{2}\s+[+-]\d{4}$/, "");
  }

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) {
    return "Aujourd'hui";
  }

  if (isSameDay(date, yesterday)) {
    return "Hier";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function isSameDay(date, referenceDate) {
  return date.getFullYear() === referenceDate.getFullYear() &&
    date.getMonth() === referenceDate.getMonth() &&
    date.getDate() === referenceDate.getDate();
}
