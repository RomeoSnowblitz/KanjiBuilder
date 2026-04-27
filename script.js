/* ========================================
   Shared JavaScript for all pages
   ======================================== */

// -------------------------------
// LANGUAGE SELECTOR
// -------------------------------
const LANG_STORAGE_KEY = "appLang";
const LANGUAGES = {
  en: "English",
  zh: "中文",
  es: "Español",
  fr: "Français",
  ru: "Русский",
  de: "Deutsch",
  ja: "日本語",
};

const langBtn = document.getElementById("lang-btn");
const langDropdown = document.getElementById("lang-dropdown");

// -------------------------------
// UI ACCENT COLOR (left of language)
// -------------------------------
const UI_ACCENT_STORAGE_KEY = "uiAccentColor";
const DEFAULT_ACCENT_HEX = "#3da9fc";
const DEFAULT_RGB = [61, 169, 252];

function applyUiAccentColor(hex) {
  document.documentElement.style.setProperty("--accent-color", hex);
  // Refresh symbol visuals after the style is applied so canvas tint uses the new color
  requestAnimationFrame(() => {
    if (typeof window.kanjiBuilderRefreshCreate === "function") window.kanjiBuilderRefreshCreate();
    if (typeof window.kanjiBuilderRefreshDictionary === "function") window.kanjiBuilderRefreshDictionary();
  });
}

function getStoredUiAccent() {
  return localStorage.getItem(UI_ACCENT_STORAGE_KEY) || DEFAULT_ACCENT_HEX;
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : DEFAULT_RGB.slice();
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => ("0" + Math.max(0, Math.min(255, x)).toString(16)).slice(-2)).join("");
}

function setupUiColorPicker() {
  const navbarRight = document.querySelector(".navbar-right");
  if (!navbarRight) return;
  const wrapper = document.createElement("div");
  wrapper.className = "ui-color-wrapper";
  wrapper.innerHTML = '<span class="ui-color-label">UI Color:</span><div id="ui-color-box" class="ui-color-box" title="Click to open"></div>';
  navbarRight.insertBefore(wrapper, navbarRight.firstChild);

  const box = document.getElementById("ui-color-box");
  if (!box) return;

  applyUiAccentColor(getStoredUiAccent());

  // Build popup (same pattern as word-context-box)
  const popup = document.createElement("div");
  popup.id = "ui-color-popup";
  popup.className = "ui-color-popup hidden";
  popup.innerHTML = `
    <div class="ui-color-popup-content">
      <h2>UI Color</h2>
      <div class="ui-color-preview" id="ui-color-preview"></div>
      <label for="ui-color-red">Red:</label>
      <input type="number" id="ui-color-red" min="0" max="255" value="61" />
      <label for="ui-color-green">Green:</label>
      <input type="number" id="ui-color-green" min="0" max="255" value="169" />
      <label for="ui-color-blue">Blue:</label>
      <input type="number" id="ui-color-blue" min="0" max="255" value="252" />
      <div class="ui-color-actions">
        <button type="button" id="ui-color-save">Save</button>
        <button type="button" class="reset-btn" id="ui-color-reset">Reset</button>
        <button type="button" id="ui-color-close">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  const redInput = document.getElementById("ui-color-red");
  const greenInput = document.getElementById("ui-color-green");
  const blueInput = document.getElementById("ui-color-blue");
  const preview = document.getElementById("ui-color-preview");
  let savedHexWhenOpened = "";

  function getInputRgb() {
    const r = Math.max(0, Math.min(255, parseInt(redInput.value, 10) || 0));
    const g = Math.max(0, Math.min(255, parseInt(greenInput.value, 10) || 0));
    const b = Math.max(0, Math.min(255, parseInt(blueInput.value, 10) || 0));
    return [r, g, b];
  }

  function applyFromInputs() {
    const [r, g, b] = getInputRgb();
    const hex = rgbToHex(r, g, b);
    applyUiAccentColor(hex);
    preview.style.backgroundColor = hex;
  }

  function openPopup() {
    savedHexWhenOpened = getStoredUiAccent();
    const [r, g, b] = hexToRgb(savedHexWhenOpened);
    redInput.value = r;
    greenInput.value = g;
    blueInput.value = b;
    preview.style.backgroundColor = savedHexWhenOpened;
    popup.classList.remove("hidden");
  }

  function closePopup(revertToSaved) {
    popup.classList.add("hidden");
    if (revertToSaved) applyUiAccentColor(savedHexWhenOpened);
  }

  redInput.addEventListener("input", applyFromInputs);
  greenInput.addEventListener("input", applyFromInputs);
  blueInput.addEventListener("input", applyFromInputs);

  document.getElementById("ui-color-save").addEventListener("click", () => {
    const [r, g, b] = getInputRgb();
    const hex = rgbToHex(r, g, b);
    localStorage.setItem(UI_ACCENT_STORAGE_KEY, hex);
    closePopup(false);
  });
  document.getElementById("ui-color-reset").addEventListener("click", () => {
    redInput.value = DEFAULT_RGB[0];
    greenInput.value = DEFAULT_RGB[1];
    blueInput.value = DEFAULT_RGB[2];
    applyUiAccentColor(DEFAULT_ACCENT_HEX);
    localStorage.setItem(UI_ACCENT_STORAGE_KEY, DEFAULT_ACCENT_HEX);
    closePopup(false);
  });
  document.getElementById("ui-color-close").addEventListener("click", () => closePopup(true));

  popup.addEventListener("click", (e) => {
    if (e.target === popup) closePopup(true);
  });

  box.addEventListener("click", (e) => {
    e.preventDefault();
    openPopup();
  });
  box.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openPopup();
  });
}

setupUiColorPicker();

function getStoredLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return LANGUAGES[stored] ? stored : "en";
}

function getNested(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
}

function getTranslation(path) {
  const lang = getStoredLang();
  const t = window.TRANSLATIONS && (window.TRANSLATIONS[lang] || window.TRANSLATIONS.en);
  const val = t ? getNested(t, path) : null;
  return val != null ? val : path;
}

window.getStoredLang = getStoredLang;
window.getTranslation = getTranslation;

function applyTranslations(lang) {
  if (typeof window.TRANSLATIONS === "undefined") return;
  const t = window.TRANSLATIONS[lang] || window.TRANSLATIONS.en;
  if (!t) return;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const val = getNested(t, el.getAttribute("data-i18n"));
    if (val != null) el.textContent = val;
  });
  document.querySelectorAll("[data-i18n-html]").forEach((el) => {
    const val = getNested(t, el.getAttribute("data-i18n-html"));
    if (val != null) el.innerHTML = val;
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const val = getNested(t, el.getAttribute("data-i18n-placeholder"));
    if (val != null) el.placeholder = val;
  });
}

// Shared helpers for translated symbol name/description (used on Create and Dictionary)
function getSymbolName(sym) {
  if (!sym || sym.id == null) return sym ? sym.name : "";
  const lang = getStoredLang();
  const t = window.TRANSLATIONS && (window.TRANSLATIONS[lang] || window.TRANSLATIONS.en);
  const s = t && t.symbols && t.symbols[sym.id];
  return (s && s.name) ? s.name : (sym.name || "");
}

function getSymbolDescription(sym) {
  if (!sym || sym.id == null) return sym ? sym.description : "";
  const lang = getStoredLang();
  const t = window.TRANSLATIONS && (window.TRANSLATIONS[lang] || window.TRANSLATIONS.en);
  const s = t && t.symbols && t.symbols[sym.id];
  return (s && s.description) ? s.description : (sym.description || "");
}

function normalizeDictionaryWord(w) {
  return (w || "")
    .toLowerCase()
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "");
}

function makeEntryId() {
  return "e_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function ensureEntryIds(entries) {
  let changed = false;
  entries.forEach((entry) => {
    if (!entry) return;
    if (!entry._entryId) {
      entry._entryId = makeEntryId();
      changed = true;
    }
  });
  return changed;
}

function findEntryIndexById(entries, entryId) {
  if (!entryId) return -1;
  return entries.findIndex((e) => e && e._entryId === entryId);
}

function getSymbolsForEntry(entry) {
  if (!entry) return [];
  if (entry.slots) {
    const out = [];
    entry.slots.forEach((slot) => {
      if (slot.effectLeft) out.push(slot.effectLeft);
      if (slot.main) out.push(slot.main);
      if (slot.effectRight) out.push(slot.effectRight);
    });
    return out;
  }
  return entry.symbols || [];
}

function getEntrySignature(entry) {
  const refs = getSymbolsForEntry(entry);
  return refs.map((r) => (r && r.id != null ? String(r.id) : "x")).join("-");
}

function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function getEntryDisplayWord(entry, lang) {
  if (!entry) return "";
  if (entry.isCore) {
    const main = entry.slots && entry.slots[0] && entry.slots[0].main;
    if (!main || main.id == null) return entry.definition || "";
    const t = window.TRANSLATIONS && (window.TRANSLATIONS[lang] || window.TRANSLATIONS.en);
    const symbol = t && t.symbols && t.symbols[main.id];
    return symbol && symbol.name ? symbol.name : (entry.definition || "");
  }
  const tr = entry.translations && entry.translations[lang];
  return tr || entry.definition || "";
}

async function translateWordForLanguage(word, fromLang, toLang) {
  if (!word || fromLang === toLang) return word;
  try {
    const url = "https://api.mymemory.translated.net/get?q=" +
      encodeURIComponent(word) +
      "&langpair=" + encodeURIComponent(fromLang + "|" + toLang);
    const res = await fetch(url);
    if (!res.ok) return word;
    const data = await res.json();
    const translated = data && data.responseData && data.responseData.translatedText;
    return translated && String(translated).trim() ? String(translated).trim() : word;
  } catch {
    return word;
  }
}

async function buildCustomTranslations(word, sourceLang) {
  const out = {};
  const src = LANGUAGES[sourceLang] ? sourceLang : "en";
  out[src] = word;
  for (const lang of Object.keys(LANGUAGES)) {
    if (lang === src) continue;
    out[lang] = await translateWordForLanguage(word, src, lang);
  }
  return out;
}

let customTranslationBackfillPromise = null;
async function backfillMissingCustomTranslations() {
  if (customTranslationBackfillPromise) return customTranslationBackfillPromise;
  customTranslationBackfillPromise = (async () => {
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    let changed = false;
    for (const entry of entries) {
      if (!entry || entry.isCore) continue;
      const tr = entry.translations || {};
      const hasAll = Object.keys(LANGUAGES).every((lang) => tr[lang] && String(tr[lang]).trim());
      if (hasAll) continue;
      const source = entry.translationSource || "en";
      const baseWord = (tr[source] || entry.definition || "").trim();
      if (!baseWord) continue;
      entry.translations = await buildCustomTranslations(baseWord, source);
      entry.translationSource = source;
      if (!entry.definition) entry.definition = baseWord;
      changed = true;
    }
    if (changed) localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    return changed;
  })().finally(() => {
    customTranslationBackfillPromise = null;
  });
  return customTranslationBackfillPromise;
}

function ensureCoreWordsInDictionary() {
  if (typeof symbols === "undefined" || !Array.isArray(symbols) || !symbols.length) return [];
  let entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
  let changed = ensureEntryIds(entries);
  const byWord = {};
  entries.forEach((entry, idx) => {
    const key = normalizeDictionaryWord(entry.definition || "");
    if (key && byWord[key] == null) byWord[key] = idx;
  });

  symbols.forEach((sym) => {
    if (!sym || !sym.name) return;
    const key = normalizeDictionaryWord(sym.name);
    if (!key) return;
    if (byWord[key] != null) {
      const existing = entries[byWord[key]];
      if (existing && existing.isCore !== true) {
        existing.isCore = true;
        changed = true;
      }
      return;
    }
    entries.push({
      _entryId: makeEntryId(),
      slots: [
        {
          main: { id: sym.id, name: sym.name, image: sym.image, rgb: sym.rgb },
          effectLeft: null,
          effectRight: null,
        },
      ],
      definition: sym.name,
      isCore: true,
    });
    byWord[key] = entries.length - 1;
    changed = true;
  });

  if (changed) localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
  return entries;
}

var colorImageCache = {};
const SYMBOL_CUSTOM_IMAGES_KEY = "symbolCustomImages";

function getStoredCustomSymbolImages() {
  try {
    return JSON.parse(localStorage.getItem(SYMBOL_CUSTOM_IMAGES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStoredCustomSymbolImages(map) {
  localStorage.setItem(SYMBOL_CUSTOM_IMAGES_KEY, JSON.stringify(map || {}));
}

function getCustomImageConfigForSymbolId(symbolId) {
  if (symbolId == null) return { selected: 0, customImages: [] };
  const map = getStoredCustomSymbolImages();
  const cfg = map[String(symbolId)] || {};
  const customImages = Array.isArray(cfg.customImages) ? cfg.customImages.filter(Boolean) : [];
  let selected = parseInt(cfg.selected, 10);
  if (!Number.isFinite(selected)) selected = 0;
  if (selected < 0) selected = 0;
  if (selected > customImages.length) selected = customImages.length;
  return { selected, customImages };
}

function getEffectiveSymbolImageSource(symOrRef) {
  if (!symOrRef || !symOrRef.image || symOrRef.id == null) return symOrRef ? symOrRef.image : "";
  const cfg = getCustomImageConfigForSymbolId(symOrRef.id);
  if (cfg.selected > 0 && cfg.customImages[cfg.selected - 1]) return cfg.customImages[cfg.selected - 1];
  return symOrRef.image;
}

/** Only for rgb (color) symbols: returns a data URL. PNG paths are not resolved here — use createSymbolVisual which injects HTML like AlphabetApp. */
function getSymbolImageSrc(symOrRef) {
  if (!symOrRef || !symOrRef.rgb) return "";
  const key = symOrRef.rgb.join(",");
  if (!colorImageCache[key]) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgb(" + symOrRef.rgb[0] + "," + symOrRef.rgb[1] + "," + symOrRef.rgb[2] + ")";
    ctx.fillRect(0, 0, 128, 128);
    colorImageCache[key] = canvas.toDataURL();
  }
  return colorImageCache[key];
}

/** Escape for HTML attribute to avoid breaking the tag. */
function escapeHtmlAttr(s) {
  if (s == null) return "";
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/** Return [r, g, b] 0–255 for the current CSS --accent-color. */
function getAccentRgb() {
  const v = document.documentElement.style.getPropertyValue("--accent-color") ||
    (typeof getComputedStyle !== "undefined" && getComputedStyle(document.documentElement).getPropertyValue("--accent-color")) || "";
  const m = v.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (m) {
    const hex = m[1].length === 3 ? m[1][0] + m[1][0] + m[1][1] + m[1][1] + m[1][2] + m[1][2] : m[1];
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const rgb = v.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (rgb) return [parseInt(rgb[1], 10), parseInt(rgb[2], 10), parseInt(rgb[3], 10)];
  return DEFAULT_RGB;
}

/**
 * Render a symbol: image symbols are always tinted with the current UI accent color (shape only; transparent stays transparent).
 * Path in HTML so it loads from file:// and http; tint uses canvas composite so it works without getImageData/toDataURL.
 */
function createSymbolVisual(symOrRef, altText) {
  altText = altText || (symOrRef && symOrRef.name) || "";
  if (symOrRef && symOrRef.rgb) {
    const img = document.createElement("img");
    img.src = getSymbolImageSrc(symOrRef);
    img.alt = altText;
    return img;
  }
  if (symOrRef && symOrRef.image) {
    const path = symOrRef._imageOverride || getEffectiveSymbolImageSource(symOrRef);
    const alt = escapeHtmlAttr(altText);
    const wrapper = document.createElement("div");
    wrapper.className = "symbol-mask symbol-tint";
    wrapper.setAttribute("role", "img");
    wrapper.setAttribute("aria-label", altText);
    const img = document.createElement("img");
    img.src = path;
    img.alt = alt;
    img.className = "symbol-tint-img";
    img.setAttribute("loading", "lazy");
    img.onload = function () {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      if (!w || !h) return;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.className = "symbol-tint-img";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      const rgb = getAccentRgb();
      ctx.fillStyle = "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
      ctx.fillRect(0, 0, w, h);
      wrapper.removeChild(img);
      wrapper.appendChild(canvas);
    };
    wrapper.appendChild(img);
    return wrapper;
  }
  const wrapper = document.createElement("div");
  wrapper.innerHTML = "<img src=\"\" alt=\"" + escapeHtmlAttr(altText) + "\">";
  return wrapper.firstChild;
}

if (langBtn && langDropdown) {
  function setLangButtonLabel(code) {
    langBtn.textContent = LANGUAGES[code] || LANGUAGES.en;
  }

  setLangButtonLabel(getStoredLang());
  applyTranslations(getStoredLang());

  langBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle("hidden");
  });

  langDropdown.querySelectorAll("button[data-lang]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.getAttribute("data-lang");
      localStorage.setItem(LANG_STORAGE_KEY, code);
      setLangButtonLabel(code);
      applyTranslations(code);
      if (typeof window.onLanguageChange === "function") window.onLanguageChange();
      langDropdown.classList.add("hidden");
    });
  });

  document.addEventListener("click", () => langDropdown.classList.add("hidden"));
} else {
  applyTranslations(getStoredLang());
}

// -------------------------------
// LIGHT / DARK MODE TOGGLE
// -------------------------------
const toggleBtn = document.getElementById("theme-toggle");
if (toggleBtn) {
  // Load saved mode from localStorage (if any)
  const currentTheme = localStorage.getItem("theme") || "dark";
  if (currentTheme === "light") document.body.classList.add("light-mode");
  toggleBtn.textContent = currentTheme === "light" ? "☀️" : "🌙";

  // Toggle handler
  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("light-mode");
    const isLight = document.body.classList.contains("light-mode");
    localStorage.setItem("theme", isLight ? "light" : "dark");
    toggleBtn.textContent = isLight ? "☀️" : "🌙";
  });
}

// -------------------------------
// PAGE-SPECIFIC LOGIC
// -------------------------------

// Detect which page we're on
const page = document.body.dataset.page;

/* --------------------------------
   CREATE PAGE
   Two main slots (left/right). Each slot: one main object + up to 2 effects (left and right of main).
   Drop on empty slot = main. Drop on main = effect (first left, second right). Left/right-click main = clear slot. Left-click effect = remove effect.
-------------------------------- */

if (page === "create") {
  const CREATE_IMAGE_UI_TEXTS = {
    en: {
      addCustomImage: "Add custom image",
      defaultImage: "Default image (cannot delete)",
      deleteCustomImage: "Delete selected custom image",
      tip: "Tip: use a black image with transparent background for best UI tinting.",
      close: "Close",
    },
    zh: {
      addCustomImage: "添加自定义图片",
      defaultImage: "默认图片（不可删除）",
      deleteCustomImage: "删除当前自定义图片",
      tip: "提示：使用黑色且透明背景图片可获得最佳UI着色效果。",
      close: "关闭",
    },
    es: {
      addCustomImage: "Agregar imagen personalizada",
      defaultImage: "Imagen predeterminada (no se puede eliminar)",
      deleteCustomImage: "Eliminar imagen personalizada seleccionada",
      tip: "Consejo: usa una imagen negra con fondo transparente para un mejor tinte UI.",
      close: "Cerrar",
    },
    fr: {
      addCustomImage: "Ajouter une image personnalisée",
      defaultImage: "Image par défaut (suppression impossible)",
      deleteCustomImage: "Supprimer l'image personnalisée sélectionnée",
      tip: "Astuce : utilisez une image noire avec fond transparent pour une meilleure teinte UI.",
      close: "Fermer",
    },
    ru: {
      addCustomImage: "Добавить пользовательское изображение",
      defaultImage: "Изображение по умолчанию (удалить нельзя)",
      deleteCustomImage: "Удалить выбранное пользовательское изображение",
      tip: "Совет: используйте черное изображение с прозрачным фоном для лучшего оттенка UI.",
      close: "Закрыть",
    },
    de: {
      addCustomImage: "Benutzerdefiniertes Bild hinzufügen",
      defaultImage: "Standardbild (kann nicht gelöscht werden)",
      deleteCustomImage: "Ausgewähltes benutzerdefiniertes Bild löschen",
      tip: "Tipp: Verwende ein schwarzes Bild mit transparentem Hintergrund für beste UI-Einfärbung.",
      close: "Schließen",
    },
    ja: {
      addCustomImage: "カスタム画像を追加",
      defaultImage: "デフォルト画像（削除不可）",
      deleteCustomImage: "選択中のカスタム画像を削除",
      tip: "ヒント：UIの着色をきれいにするため、黒色＋透明背景の画像を使ってください。",
      close: "閉じる",
    },
  };

  function getCreateImageUiText(key) {
    const lang = getStoredLang();
    const table = CREATE_IMAGE_UI_TEXTS[lang] || CREATE_IMAGE_UI_TEXTS.en;
    return table[key] || CREATE_IMAGE_UI_TEXTS.en[key] || "";
  }

  const grid = document.getElementById("symbol-grid");
  const slotLeft = document.getElementById("slot-left");
  const slotRight = document.getElementById("slot-right");

  // State: each slot has { main, effectLeft, effectRight } (symbol or null)
  const slots = {
    left: { main: null, effectLeft: null, effectRight: null },
    right: { main: null, effectLeft: null, effectRight: null },
  };

  // Symbol info box elements
  const infoBox = document.getElementById("symbol-info-box");
  const infoName = document.getElementById("info-name");
  const infoImageWrap = document.getElementById("info-image-wrap");
  const infoDescription = document.getElementById("info-description");
  const infoExtra = document.getElementById("info-extra");
  const infoNote = document.getElementById("info-note");
  const infoImageStateBtn = document.getElementById("info-image-state");
  const infoImageUploadBtn = document.getElementById("info-image-upload");
  const infoImagePrevBtn = document.getElementById("info-image-prev");
  const infoImageNextBtn = document.getElementById("info-image-next");
  const infoImageFileInput = document.getElementById("info-image-file");
  const infoImageNote = document.getElementById("info-image-note");
  const infoImageUploadPanel = document.getElementById("info-image-upload-panel");
  const infoImageUploadCloseBtn = document.getElementById("info-image-upload-close");
  const infoSaveBtn = document.getElementById("info-save");
  const closeInfoBtn = document.getElementById("close-info");

  const SYMBOL_NOTES_KEY = "symbolNotes";
  const SYMBOL_EXTRAS_KEY = "symbolExtras";

  function getSymbolNotes() {
    try {
      return JSON.parse(localStorage.getItem(SYMBOL_NOTES_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function getSymbolExtras() {
    try {
      return JSON.parse(localStorage.getItem(SYMBOL_EXTRAS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  let currentInfoSymbolId = null;
  let currentInfoSymbol = null;
  let pendingImageConfig = null;

  function cloneImageConfig(cfg) {
    return { selected: cfg.selected, customImages: cfg.customImages.slice() };
  }

  function getCurrentImageSource(sym, cfg) {
    if (!sym) return "";
    if (!cfg || cfg.selected === 0) return sym.image;
    return cfg.customImages[cfg.selected - 1] || sym.image;
  }

  function updateImageButtons() {
    if (!currentInfoSymbol || !pendingImageConfig) return;
    const total = 1 + pendingImageConfig.customImages.length;
    if (infoImagePrevBtn) infoImagePrevBtn.disabled = total <= 1;
    if (infoImageNextBtn) infoImageNextBtn.disabled = total <= 1;
    if (infoImageStateBtn) {
      if (pendingImageConfig.selected === 0) {
        infoImageStateBtn.textContent = "★";
        infoImageStateBtn.title = getCreateImageUiText("defaultImage");
      } else {
        infoImageStateBtn.textContent = "🗑";
        infoImageStateBtn.title = getCreateImageUiText("deleteCustomImage");
      }
    }
  }

  function updateCreateImageUiText() {
    if (infoImageUploadBtn) infoImageUploadBtn.title = getCreateImageUiText("addCustomImage");
    if (infoImageNote) infoImageNote.textContent = getCreateImageUiText("tip");
    if (infoImageUploadCloseBtn) infoImageUploadCloseBtn.textContent = getCreateImageUiText("close");
    updateImageButtons();
  }

  function renderInfoImageSelection() {
    if (!currentInfoSymbol || !pendingImageConfig) return;
    const src = getCurrentImageSource(currentInfoSymbol, pendingImageConfig);
    infoImageWrap.innerHTML = "";
    infoImageWrap.appendChild(createSymbolVisual(
      { id: currentInfoSymbol.id, image: currentInfoSymbol.image, _imageOverride: src },
      getSymbolName(currentInfoSymbol)
    ));
    updateImageButtons();
  }

  closeInfoBtn.addEventListener("click", () => {
    infoBox.classList.add("hidden");
    if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
  });
  infoBox.addEventListener("click", (e) => {
    if (e.target === infoBox) {
      infoBox.classList.add("hidden");
      if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
    }
  });

  function showSymbolInfo(sym) {
    currentInfoSymbolId = sym.id;
    currentInfoSymbol = sym;
    pendingImageConfig = cloneImageConfig(getCustomImageConfigForSymbolId(sym.id));
    updateCreateImageUiText();
    if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
    const displayName = getSymbolName(sym);
    infoName.textContent = displayName;
    infoDescription.textContent = getSymbolDescription(sym) || "";
    infoImageWrap.innerHTML = ""; // clear until we set it in setTimeout so we don’t flash the previous symbol
    // Show popup immediately so it’s responsive; load storage and image next tick to avoid blocking input
    infoNote.value = "";
    infoExtra.value = "";
    infoBox.classList.remove("hidden");
    const id = sym.id;
    setTimeout(() => {
      const notes = getSymbolNotes();
      const extras = getSymbolExtras();
      infoNote.value = notes[id] || "";
      infoExtra.value = extras[id] || "";
      renderInfoImageSelection();
      infoExtra.focus();
    }, 0);
  }

  if (infoImagePrevBtn) {
    infoImagePrevBtn.addEventListener("click", () => {
      if (!pendingImageConfig) return;
      const total = 1 + pendingImageConfig.customImages.length;
      if (total <= 1) return;
      pendingImageConfig.selected = (pendingImageConfig.selected - 1 + total) % total;
      renderInfoImageSelection();
    });
  }

  if (infoImageNextBtn) {
    infoImageNextBtn.addEventListener("click", () => {
      if (!pendingImageConfig) return;
      const total = 1 + pendingImageConfig.customImages.length;
      if (total <= 1) return;
      pendingImageConfig.selected = (pendingImageConfig.selected + 1) % total;
      renderInfoImageSelection();
    });
  }

  if (infoImageUploadBtn && infoImageFileInput) {
    infoImageUploadBtn.addEventListener("click", () => {
      if (infoImageUploadPanel) infoImageUploadPanel.classList.toggle("hidden");
    });
    if (infoImageUploadCloseBtn && infoImageUploadPanel) {
      infoImageUploadCloseBtn.addEventListener("click", () => infoImageUploadPanel.classList.add("hidden"));
    }
    infoImageFileInput.addEventListener("change", () => {
      if (!currentInfoSymbol || !pendingImageConfig) return;
      const file = infoImageFileInput.files && infoImageFileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl.startsWith("data:image/")) return;
        pendingImageConfig.customImages.push(dataUrl);
        pendingImageConfig.selected = pendingImageConfig.customImages.length; // default=0, customs start at 1
        renderInfoImageSelection();
        if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
      };
      reader.readAsDataURL(file);
      infoImageFileInput.value = "";
    });
  }

  if (infoImageStateBtn) {
    infoImageStateBtn.addEventListener("click", () => {
      if (!currentInfoSymbol || !pendingImageConfig) return;
      if (pendingImageConfig.selected === 0) return;
      const idx = pendingImageConfig.selected - 1;
      if (idx < 0 || idx >= pendingImageConfig.customImages.length) return;
      if (!confirm("Delete this custom image for this symbol?")) return;
      pendingImageConfig.customImages.splice(idx, 1);
      if (pendingImageConfig.selected > pendingImageConfig.customImages.length) {
        pendingImageConfig.selected = pendingImageConfig.customImages.length;
      }
      renderInfoImageSelection();
    });
  }

  infoSaveBtn.addEventListener("click", () => {
    if (currentInfoSymbolId == null) return;
    const notes = getSymbolNotes();
    const extras = getSymbolExtras();
    notes[currentInfoSymbolId] = infoNote.value.trim();
    extras[currentInfoSymbolId] = infoExtra.value.trim();
    localStorage.setItem(SYMBOL_NOTES_KEY, JSON.stringify(notes));
    localStorage.setItem(SYMBOL_EXTRAS_KEY, JSON.stringify(extras));
    if (currentInfoSymbol && pendingImageConfig) {
      const map = getStoredCustomSymbolImages();
      map[String(currentInfoSymbol.id)] = {
        selected: pendingImageConfig.selected,
        customImages: pendingImageConfig.customImages.slice(),
      };
      saveStoredCustomSymbolImages(map);
      if (typeof window.kanjiBuilderRefreshCreate === "function") window.kanjiBuilderRefreshCreate();
      if (typeof window.kanjiBuilderRefreshDictionary === "function") window.kanjiBuilderRefreshDictionary();
    }
    if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
    infoBox.classList.add("hidden");
  });

  // imageOnly = true for slot content (no label under image)
  function makeSymbolBox(sym, sizeClass, imageOnly) {
    const div = document.createElement("div");
    div.className = "symbol-box " + (sizeClass || "");
    div.dataset.symbolId = sym.id;
    const displayName = getSymbolName(sym);
    div.title = displayName;
    div.appendChild(createSymbolVisual(sym, displayName));
    if (!imageOnly) {
      const nameSpan = document.createElement("span");
      nameSpan.textContent = displayName;
      div.appendChild(nameSpan);
    }
    return div;
  }

  function renderSlot(slotEl, slotName) {
    const data = slots[slotName];
    slotEl.innerHTML = "";
    if (!data.main) {
      const p = document.createElement("p");
      p.className = "placeholder";
      const lang = getStoredLang();
      const tCreate = window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang].create;
      p.textContent = (tCreate && (slotName === "left" ? tCreate.mainObjectLeft : tCreate.mainObjectRight)) || "Main object (" + slotName + ")";
      slotEl.appendChild(p);
      return;
    }
    const group = document.createElement("div");
    group.className = "slot-object-group";

    // Effects column on the left: first effect on top, second on bottom (both 50% size, stacked)
    const hasEffects = data.effectLeft || data.effectRight;
    if (hasEffects) {
      const effectsColumn = document.createElement("div");
      effectsColumn.className = "slot-effects-column";
      if (data.effectLeft) {
        const wrap = document.createElement("div");
        wrap.className = "slot-effect";
        wrap.appendChild(makeSymbolBox(data.effectLeft, "effect-size", true));
        wrap.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          showSymbolInfo(data.effectLeft);
        });
        wrap.addEventListener("click", (e) => {
          e.stopPropagation();
          data.effectLeft = null;
          renderSlot(slotEl, slotName);
        });
        effectsColumn.appendChild(wrap);
      }
      if (data.effectRight) {
        const wrap = document.createElement("div");
        wrap.className = "slot-effect";
        wrap.appendChild(makeSymbolBox(data.effectRight, "effect-size", true));
        wrap.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          showSymbolInfo(data.effectRight);
        });
        wrap.addEventListener("click", (e) => {
          e.stopPropagation();
          data.effectRight = null;
          renderSlot(slotEl, slotName);
        });
        effectsColumn.appendChild(wrap);
      }
      group.appendChild(effectsColumn);
    }

    // Drop on group = add as effect
    group.addEventListener("dragover", (e) => e.preventDefault());
    group.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const id = parseInt(e.dataTransfer.getData("text/plain"));
      if (e.dataTransfer.getData("source") !== "grid") return;
      const sym = symbols.find(s => s.id === id);
      if (!sym) return;
      if (!data.effectLeft) data.effectLeft = sym;
      else if (!data.effectRight) data.effectRight = sym;
      renderSlot(slotEl, slotName);
    });

    // Main object (image only): left-click = remove from slot, right-click = show symbol info
    const mainWrap = document.createElement("div");
    mainWrap.className = "slot-main";
    mainWrap.appendChild(makeSymbolBox(data.main, "main-size", true));
    mainWrap.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showSymbolInfo(data.main);
    });
    mainWrap.addEventListener("click", (e) => {
      e.stopPropagation();
      slots[slotName] = { main: null, effectLeft: null, effectRight: null };
      renderSlot(slotEl, slotName);
    });
    group.appendChild(mainWrap);

    slotEl.appendChild(group);
  }

  // Drop anywhere in slot: empty slot = set main; slot with main = add effect
  function setupSlotDrop(slotEl, slotName) {
    slotEl.addEventListener("dragover", (e) => e.preventDefault());
    slotEl.addEventListener("drop", (e) => {
      e.preventDefault();
      const id = parseInt(e.dataTransfer.getData("text/plain"));
      if (e.dataTransfer.getData("source") !== "grid") return;
      const sym = symbols.find(s => s.id === id);
      if (!sym) return;
      const data = slots[slotName];
      if (!data.main) {
        data.main = sym;
      } else {
        // Already have main — add as effect (first left, then right)
        if (!data.effectLeft) data.effectLeft = sym;
        else if (!data.effectRight) data.effectRight = sym;
      }
      renderSlot(slotEl, slotName);
    });
  }
  setupSlotDrop(slotLeft, "left");
  setupSlotDrop(slotRight, "right");

  // Grid: create symbol boxes
  function updateGridSymbolLabels() {
    grid.querySelectorAll(".symbol-box").forEach((div) => {
      const id = parseInt(div.dataset.symbolId, 10);
      if (!id) return;
      const sym = symbols.find((s) => s.id === id);
      if (sym) {
        const name = getSymbolName(sym);
        div.title = name;
        const img = div.querySelector("img");
        const mask = div.querySelector(".symbol-mask");
        if (img) img.alt = name;
        if (mask) mask.setAttribute("aria-label", name);
        const span = div.querySelector("span");
        if (span) span.textContent = name;
      }
    });
  }

  function buildSymbolGrid() {
    grid.innerHTML = "";
    const layout = (typeof symbolGridLayout !== "undefined" && Array.isArray(symbolGridLayout)) ? symbolGridLayout : null;
    const cells = layout ? layout.flat() : symbols.map((s) => s.id);
    cells.forEach((cellId) => {
      if (!cellId) {
        const blank = document.createElement("div");
        blank.className = "symbol-box symbol-box-empty";
        blank.setAttribute("aria-hidden", "true");
        grid.appendChild(blank);
        return;
      }
      const sym = symbols.find((s) => s.id === cellId);
      if (!sym) {
        const blank = document.createElement("div");
        blank.className = "symbol-box symbol-box-empty";
        blank.setAttribute("aria-hidden", "true");
        grid.appendChild(blank);
        return;
      }
      const div = document.createElement("div");
      div.className = "symbol-box";
      div.dataset.symbolId = sym.id;
      div.setAttribute("draggable", "true");
      div.appendChild(createSymbolVisual(sym, getSymbolName(sym)));
      const nameSpan = document.createElement("span");
      nameSpan.textContent = getSymbolName(sym);
      div.appendChild(nameSpan);
      div.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        showSymbolInfo(sym);
      });
      div.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", sym.id);
        e.dataTransfer.setData("source", "grid");
      });
      div.addEventListener("click", (e) => {
        const slotName = e.shiftKey ? "right" : "left";
        const data = slots[slotName];
        const slotEl = slotName === "left" ? slotLeft : slotRight;
        if (!data.main) {
          data.main = sym;
        } else {
          if (!data.effectLeft) data.effectLeft = sym;
          else if (!data.effectRight) data.effectRight = sym;
        }
        renderSlot(slotEl, slotName);
      });
      grid.appendChild(div);
    });
  }
  buildSymbolGrid();

  window.kanjiBuilderRefreshCreate = function () {
    buildSymbolGrid();
    renderSlot(slotLeft, "left");
    renderSlot(slotRight, "right");
    // Update symbol info popup image if open so it matches new accent color
    if (infoBox && !infoBox.classList.contains("hidden") && currentInfoSymbolId != null) {
      const sym = symbols.find((s) => s.id === currentInfoSymbolId);
      if (sym) {
        infoImageWrap.innerHTML = "";
        infoImageWrap.appendChild(createSymbolVisual(sym, getSymbolName(sym)));
      }
    }
  };

  // Symbol search: filter grid by name, description, or user-added extras (using current language)
  const symbolSearchInput = document.getElementById("symbol-search");
  symbolSearchInput.addEventListener("input", () => {
    const query = symbolSearchInput.value.trim().toLowerCase();
    const extras = getSymbolExtras();
    Array.from(grid.children).forEach((div) => {
      const id = parseInt(div.dataset.symbolId, 10);
      const sym = symbols.find((s) => s.id === id);
      if (!sym) return;
      const name = getSymbolName(sym).toLowerCase();
      const desc = (getSymbolDescription(sym) || "").toLowerCase();
      const extraText = (extras[sym.id] || "").toLowerCase();
      const match =
        !query || name.includes(query) || (desc && desc.includes(query)) || (extraText && extraText.includes(query));
      div.style.display = match ? "" : "none";
    });
  });

  window.onLanguageChange = () => {
    updateGridSymbolLabels();
    renderSlot(slotLeft, "left");
    renderSlot(slotRight, "right");
    updateCreateImageUiText();
  };

  // Submit: build entry with new structure (order: leftEffect1, leftMain, leftEffect2, rightEffect1, rightMain, rightEffect2)
  const wordInput = document.getElementById("definition-input");
  const submitBtn = document.getElementById("submit-word");

  submitBtn.addEventListener("click", async () => {
    const word = wordInput.value.trim();
    if (!word) return alert("Please enter a word.");
    if (word.includes(" ")) return alert("No spaces allowed in the word.");
    const count =
      (slots.left.main ? 1 : 0) + (slots.left.effectLeft ? 1 : 0) + (slots.left.effectRight ? 1 : 0) +
      (slots.right.main ? 1 : 0) + (slots.right.effectLeft ? 1 : 0) + (slots.right.effectRight ? 1 : 0);
    if (count < 2) return alert("You need at least 2 symbols: either 1 main object and 1 effect, or 2 main objects with no effects.");

    function toRef(s) {
      return s ? { id: s.id, name: s.name, image: s.image, rgb: s.rgb } : null;
    }
    const sourceLang = getStoredLang();
    const entry = {
      _entryId: makeEntryId(),
      slots: [
        { main: toRef(slots.left.main), effectLeft: toRef(slots.left.effectLeft), effectRight: toRef(slots.left.effectRight) },
        { main: toRef(slots.right.main), effectLeft: toRef(slots.right.effectLeft), effectRight: toRef(slots.right.effectRight) },
      ],
      definition: word,
      isCore: false,
      translationSource: sourceLang,
      translations: await buildCustomTranslations(word, sourceLang),
    };

    let entries = ensureCoreWordsInDictionary();
    if (entries.length && entries[0].symbols && !entries[0].symbols[0].image && !entries[0].symbols[0].rgb) entries = [];
    entries.push(entry);
    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));

    alert(`"${word}" has been added to the dictionary!`);
    wordInput.value = "";
    slots.left = { main: null, effectLeft: null, effectRight: null };
    slots.right = { main: null, effectLeft: null, effectRight: null };
    renderSlot(slotLeft, "left");
    renderSlot(slotRight, "right");
  });
}


/* --------------------------------
   WRITE PAGE
-------------------------------- */
if (page === "write") {
  const WRITE_OUTPUT_LANG_KEY = "writeOutputLang";
  const WRITE_UI_TEXTS = {
    en: { title: "Write", input: "Input", placeholder: "Type a sentence...", outputMode: "Output:", output: "Output", universal: "Universal" },
    zh: { title: "写作", input: "输入", placeholder: "输入一句话...", outputMode: "输出：", output: "输出", universal: "通用" },
    es: { title: "Escribir", input: "Entrada", placeholder: "Escribe una frase...", outputMode: "Salida:", output: "Salida", universal: "Universal" },
    fr: { title: "Écrire", input: "Entrée", placeholder: "Écrivez une phrase...", outputMode: "Sortie :", output: "Sortie", universal: "Universel" },
    ru: { title: "Писать", input: "Ввод", placeholder: "Введите предложение...", outputMode: "Вывод:", output: "Вывод", universal: "Универсальный" },
    de: { title: "Schreiben", input: "Eingabe", placeholder: "Schreibe einen Satz...", outputMode: "Ausgabe:", output: "Ausgabe", universal: "Universal" },
    ja: { title: "書く", input: "入力", placeholder: "文を入力...", outputMode: "出力：", output: "出力", universal: "ユニバーサル" },
  };
  const writeInput = document.getElementById("write-input");
  const writeOutput = document.getElementById("write-output");
  const writeOutputLanguage = document.getElementById("write-output-language");
  const writeWordInfoBox = document.getElementById("write-word-info-box");
  const writeWordInfoTitle = document.getElementById("write-word-info-title");
  const writeWordInfoSymbols = document.getElementById("write-word-info-symbols");
  const writeWordInfoMeta = document.getElementById("write-word-info-meta");
  const writeWordInfoNote = document.getElementById("write-word-info-note");
  const writeWordInfoSaveNote = document.getElementById("write-word-info-save-note");
  const writeWordInfoClose = document.getElementById("write-word-info-close");
  ensureCoreWordsInDictionary();
  let currentWordEntryIndex = -1;

  function getWriteUiText() {
    const lang = getStoredLang();
    return WRITE_UI_TEXTS[lang] || WRITE_UI_TEXTS.en;
  }

  function updateWriteUiText() {
    const t = getWriteUiText();
    const title = document.querySelector("main h1");
    const inputLabel = document.querySelector('label[for="write-input"]');
    const outputModeLabel = document.querySelector('label[for="write-output-language"]');
    const outputTitle = document.querySelector(".write-output-section h2");
    if (title) title.textContent = t.title;
    if (inputLabel) inputLabel.textContent = t.input;
    if (writeInput) writeInput.placeholder = t.placeholder;
    if (outputModeLabel) outputModeLabel.textContent = t.outputMode;
    if (outputTitle) outputTitle.textContent = t.output;
  }

  function normalizeWord(w) {
    return normalizeDictionaryWord(w);
  }

  function getCoreMainSymbol(entry) {
    if (!entry || !entry.slots || !entry.slots.length) return null;
    return entry.slots[0] && entry.slots[0].main ? entry.slots[0].main : null;
  }

  function getEntryInputKey(entry, inputLang) {
    return normalizeWord(getEntryDisplayWord(entry, inputLang));
  }

  function getEntryOutputWord(entry, outputLang) {
    return getEntryDisplayWord(entry, outputLang);
  }

  function getWordInfoForSymbol(ref) {
    if (!ref) return "";
    if (typeof symbols !== "undefined") {
      const found = symbols.find((s) => s.id === ref.id);
      if (found) return getSymbolName(found);
    }
    return ref.name || "";
  }

  function renderEntrySymbols(entry, usePieceNamesForHover) {
    const wrap = document.createElement("div");
    wrap.className = "write-token-symbols";
    const tokenHover = entry.definition || "";
    if (entry.slots) {
      entry.slots.forEach((slot) => {
        const slotGroup = document.createElement("div");
        slotGroup.className = "entry-slot-group";
        const hasEffects = slot.effectLeft || slot.effectRight;
        if (hasEffects) {
          const effectsCol = document.createElement("div");
          effectsCol.className = "entry-effects-column";
          if (slot.effectLeft) {
            const box = document.createElement("div");
            box.className = "entry-effect";
            const pieceName = getWordInfoForSymbol(slot.effectLeft);
            box.title = usePieceNamesForHover ? pieceName : tokenHover;
            box.appendChild(createSymbolVisual(slot.effectLeft, pieceName));
            effectsCol.appendChild(box);
          }
          if (slot.effectRight) {
            const box = document.createElement("div");
            box.className = "entry-effect";
            const pieceName = getWordInfoForSymbol(slot.effectRight);
            box.title = usePieceNamesForHover ? pieceName : tokenHover;
            box.appendChild(createSymbolVisual(slot.effectRight, pieceName));
            effectsCol.appendChild(box);
          }
          slotGroup.appendChild(effectsCol);
        }
        if (slot.main) {
          const mainBox = document.createElement("div");
          mainBox.className = "entry-main";
          const pieceName = getWordInfoForSymbol(slot.main);
          mainBox.title = usePieceNamesForHover ? pieceName : tokenHover;
          mainBox.appendChild(createSymbolVisual(slot.main, pieceName));
          slotGroup.appendChild(mainBox);
        }
        wrap.appendChild(slotGroup);
      });
      return wrap;
    }
    const refs = entry.symbols || [];
    refs.forEach((ref) => {
      if (!ref || (!ref.image && !ref.rgb)) return;
      const box = document.createElement("div");
      box.className = "write-symbol-box";
      const pieceName = getWordInfoForSymbol(ref);
      box.title = usePieceNamesForHover ? pieceName : tokenHover;
      box.appendChild(createSymbolVisual(ref, pieceName));
      wrap.appendChild(box);
    });
    return wrap;
  }

  function openWordInfo(entry, entryIndex) {
    if (!writeWordInfoBox || !writeWordInfoTitle || !writeWordInfoSymbols || !writeWordInfoMeta) return;
    currentWordEntryIndex = entryIndex;
    writeWordInfoTitle.textContent = entry.definition || "Word";
    writeWordInfoSymbols.innerHTML = "";
    writeWordInfoSymbols.appendChild(renderEntrySymbols(entry, true));
    writeWordInfoMeta.textContent = entry.isCore ? "Core word" : "Custom word";
    if (writeWordInfoNote) writeWordInfoNote.value = entry.note || "";
    writeWordInfoBox.classList.remove("hidden");
  }

  function closeWordInfo() {
    currentWordEntryIndex = -1;
    if (writeWordInfoBox) writeWordInfoBox.classList.add("hidden");
  }

  if (writeWordInfoClose) writeWordInfoClose.addEventListener("click", closeWordInfo);
  if (writeWordInfoSaveNote) {
    writeWordInfoSaveNote.addEventListener("click", () => {
      if (currentWordEntryIndex < 0 || !writeWordInfoNote) return;
      const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
      if (!entries[currentWordEntryIndex]) return;
      entries[currentWordEntryIndex].note = writeWordInfoNote.value.trim();
      localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
      closeWordInfo();
      renderWriteOutput();
    });
  }
  if (writeWordInfoBox) {
    writeWordInfoBox.addEventListener("click", (e) => {
      if (e.target === writeWordInfoBox) closeWordInfo();
    });
  }

  function getOutputMode() {
    return writeOutputLanguage && writeOutputLanguage.value ? writeOutputLanguage.value : "universal";
  }

  function buildOutputLanguageOptions() {
    if (!writeOutputLanguage) return;
    const labels = Object.assign({ universal: getWriteUiText().universal }, LANGUAGES);
    const saved = localStorage.getItem(WRITE_OUTPUT_LANG_KEY) || "universal";
    writeOutputLanguage.innerHTML = "";
    Object.keys(labels).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = labels[code];
      writeOutputLanguage.appendChild(opt);
    });
    writeOutputLanguage.value = labels[saved] ? saved : "universal";
  }

  function renderWriteOutput() {
    if (!writeInput || !writeOutput) return;
    writeOutput.innerHTML = "";
    const raw = writeInput.value || "";
    const words = raw.split(/\s+/).filter(Boolean);
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    const inputLang = getStoredLang();
    const outputMode = getOutputMode();
    const byWord = {};
    entries.forEach((entry, index) => {
      const key = getEntryInputKey(entry, inputLang);
      if (key && !byWord[key]) byWord[key] = { entry, index };
    });

    words.forEach((word) => {
      const normalized = normalizeWord(word);
      const match = normalized ? byWord[normalized] : null;
      const token = document.createElement("div");
      token.className = "write-token";
      if (match && match.entry) {
        token.appendChild(renderEntrySymbols(match.entry, false));
        token.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          openWordInfo(match.entry, match.index);
        });
        if (outputMode !== "universal") {
          const caption = document.createElement("div");
          caption.className = "write-token-caption";
          caption.textContent = getEntryOutputWord(match.entry, outputMode);
          token.appendChild(caption);
        }
      } else {
        token.classList.add("write-token-text");
        token.textContent = word;
      }
      writeOutput.appendChild(token);
    });
  }

  buildOutputLanguageOptions();
  updateWriteUiText();
  if (writeOutputLanguage) {
    writeOutputLanguage.addEventListener("change", () => {
      localStorage.setItem(WRITE_OUTPUT_LANG_KEY, getOutputMode());
      renderWriteOutput();
    });
  }
  writeInput.addEventListener("input", renderWriteOutput);
  window.onLanguageChange = () => {
    updateWriteUiText();
    buildOutputLanguageOptions();
    renderWriteOutput();
  };
  renderWriteOutput();
  backfillMissingCustomTranslations().then((changed) => {
    if (changed) renderWriteOutput();
  });
}

/* --------------------------------
   TRANSFERS PAGE
-------------------------------- */
if (page === "transfers") {
  const wordSearch = document.getElementById("transfer-word-search");
  const fullDictionary = document.getElementById("transfer-full-dictionary");
  const wordList = document.getElementById("transfer-word-list");
  const exportDictionaryBtn = document.getElementById("transfer-export-dictionary");
  const importDictionaryFile = document.getElementById("transfer-import-dictionary-file");
  const importDictionaryBtn = document.getElementById("transfer-import-dictionary");

  const imageSearch = document.getElementById("transfer-image-search");
  const fullImages = document.getElementById("transfer-full-images");
  const saveImageSettings = document.getElementById("transfer-save-image-settings");
  const imageList = document.getElementById("transfer-image-list");
  const exportImagesBtn = document.getElementById("transfer-export-images");
  const importImagesFile = document.getElementById("transfer-import-images-file");
  const importImagesBtn = document.getElementById("transfer-import-images");
  const exportAllBtn = document.getElementById("transfer-export-all");
  const transferDropzone = document.getElementById("transfer-dropzone");
  const transferImportFile = document.getElementById("transfer-import-file");
  const transferImportFileBtn = document.getElementById("transfer-import-file-btn");
  const selectedWordIds = new Set();
  const selectedImageKeys = new Set();
  const expandedImageSymbols = new Set();

  function getEntries() {
    return ensureCoreWordsInDictionary().filter((e) => !e.isCore);
  }

  function getWordLabel(entry) {
    return getEntryDisplayWord(entry, getStoredLang()) || entry.definition || "";
  }

  function renderWordList() {
    const entries = getEntries();
    const q = (wordSearch.value || "").trim().toLowerCase();
    wordList.innerHTML = "";
    entries.forEach((entry) => {
      const labelWord = getWordLabel(entry);
      if (q && !labelWord.toLowerCase().includes(q)) return;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "transfer-item";
      row.textContent = labelWord;
      if (selectedWordIds.has(entry._entryId)) row.classList.add("is-selected");
      row.addEventListener("click", () => {
        if (selectedWordIds.has(entry._entryId)) selectedWordIds.delete(entry._entryId);
        else selectedWordIds.add(entry._entryId);
        renderWordList();
      });
      wordList.appendChild(row);
    });
  }

  function getSelectedWordEntries() {
    const map = {};
    getEntries().forEach((e) => (map[e._entryId] = e));
    return Array.from(selectedWordIds).map((id) => map[id]).filter(Boolean);
  }

  function exportDictionaryTxt(entries) {
    const lines = entries.map((entry) => JSON.stringify({
      definition: entry.definition,
      translations: entry.translations || {},
      slots: entry.slots || [],
      note: entry.note || "",
      isCore: false,
      translationSource: entry.translationSource || "en",
    }));
    triggerDownload("dictionary_export.txt", lines.join("\n"), "text/plain;charset=utf-8");
  }

  async function importDictionaryTxt(file) {
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const entries = ensureCoreWordsInDictionary();
    ensureEntryIds(entries);
    let added = 0;
    lines.forEach((line) => {
      try {
        const obj = JSON.parse(line);
        const incoming = {
          _entryId: makeEntryId(),
          definition: obj.definition || "",
          translations: obj.translations || {},
          slots: Array.isArray(obj.slots) ? obj.slots : [],
          note: obj.note || "",
          isCore: false,
          translationSource: obj.translationSource || "en",
        };
        if (!incoming.definition || !incoming.slots.length) return;
        const same = entries.some((e) =>
          normalizeDictionaryWord(e.definition) === normalizeDictionaryWord(incoming.definition) &&
          getEntrySignature(e) === getEntrySignature(incoming)
        );
        if (same) return; // exact duplicate skip
        entries.push(incoming);
        added++;
      } catch {
        // ignore malformed line
      }
    });
    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    alert("Imported " + added + " words.");
    renderWordList();
  }

  function getCustomImageMap() {
    const map = getStoredCustomSymbolImages();
    const out = {};
    Object.keys(map).forEach((id) => {
      const cfg = map[id] || {};
      const imgs = Array.isArray(cfg.customImages) ? cfg.customImages.filter(Boolean) : [];
      if (imgs.length) out[id] = { selected: cfg.selected || 0, customImages: imgs };
    });
    return out;
  }

  function renderImageList() {
    const map = getCustomImageMap();
    const q = (imageSearch.value || "").trim().toLowerCase();
    imageList.innerHTML = "";
    Object.keys(map).sort((a, b) => Number(a) - Number(b)).forEach((id) => {
      const sym = typeof symbols !== "undefined" ? symbols.find((s) => String(s.id) === String(id)) : null;
      const name = sym ? getSymbolName(sym) : ("Symbol " + id);
      if (q && !name.toLowerCase().includes(q)) return;
      const group = document.createElement("div");
      group.className = "transfer-image-group";

      const header = document.createElement("button");
      header.type = "button";
      header.className = "transfer-item transfer-group-header";
      header.textContent = (expandedImageSymbols.has(id) ? "▼ " : "▶ ") + name + " (" + map[id].customImages.length + ")";
      header.addEventListener("click", () => {
        if (expandedImageSymbols.has(id)) expandedImageSymbols.delete(id);
        else expandedImageSymbols.add(id);
        renderImageList();
      });
      group.appendChild(header);

      if (expandedImageSymbols.has(id)) {
        const variantsWrap = document.createElement("div");
        variantsWrap.className = "transfer-variants";
        map[id].customImages.forEach((_, idx) => {
          const key = id + "::" + idx;
          const item = document.createElement("button");
          item.type = "button";
          item.className = "transfer-item transfer-variant-item";
          item.textContent = "Image " + (idx + 1) + (map[id].selected === idx ? " (Custom default selected)" : "");
          if (selectedImageKeys.has(key)) item.classList.add("is-selected");
          item.addEventListener("click", () => {
            if (selectedImageKeys.has(key)) selectedImageKeys.delete(key);
            else selectedImageKeys.add(key);
            renderImageList();
          });
          variantsWrap.appendChild(item);
        });
        group.appendChild(variantsWrap);
      }

      imageList.appendChild(group);
    });
  }

  function getSelectedImageMapForExport() {
    const all = getCustomImageMap();
    const selected = {};
    selectedImageKeys.forEach((key) => {
      const parts = key.split("::");
      const id = parts[0];
      const idx = parseInt(parts[1], 10);
      const cfg = all[id];
      if (!cfg || !Array.isArray(cfg.customImages) || !cfg.customImages[idx]) return;
      if (!selected[id]) selected[id] = { selected: 0, customImages: [], _origIndices: [] };
      selected[id].customImages.push(cfg.customImages[idx]);
      selected[id]._origIndices.push(idx);
    });
    Object.keys(selected).forEach((id) => {
      const originalSelected = all[id] ? all[id].selected : 0;
      const pos = selected[id]._origIndices.indexOf(originalSelected);
      selected[id].selected = pos >= 0 ? pos : 0;
      delete selected[id]._origIndices;
    });
    return selected;
  }

  function exportImagesPackage(includeDict) {
    const images = getSelectedImageMapForExport();
    if (!saveImageSettings.checked) {
      Object.keys(images).forEach((id) => { images[id].selected = 0; });
    }
    const pack = { type: "kanji-builder-transfer", version: 1, images };
    if (includeDict) {
      pack.dictionary = getSelectedWordEntries().map((entry) => ({
        definition: entry.definition,
        translations: entry.translations || {},
        slots: entry.slots || [],
        note: entry.note || "",
        isCore: false,
        translationSource: entry.translationSource || "en",
      }));
    }
    triggerDownload(includeDict ? "transfer_all.json" : "images_export.json", JSON.stringify(pack, null, 2), "application/json");
  }

  async function importImagePackage(file) {
    const text = await file.text();
    const data = JSON.parse(text);
    const incomingImages = data.images || {};
    const map = getStoredCustomSymbolImages();
    Object.keys(incomingImages).forEach((id) => {
      const cfg = incomingImages[id] || {};
      if (!Array.isArray(cfg.customImages) || !cfg.customImages.length) return;
      map[id] = {
        selected: Number.isFinite(cfg.selected) ? cfg.selected : 0,
        customImages: cfg.customImages.slice(),
      };
    });
    saveStoredCustomSymbolImages(map);

    if (Array.isArray(data.dictionary) && data.dictionary.length) {
      const entries = ensureCoreWordsInDictionary();
      ensureEntryIds(entries);
      data.dictionary.forEach((obj) => {
        const incoming = {
          _entryId: makeEntryId(),
          definition: obj.definition || "",
          translations: obj.translations || {},
          slots: Array.isArray(obj.slots) ? obj.slots : [],
          note: obj.note || "",
          isCore: false,
          translationSource: obj.translationSource || "en",
        };
        if (!incoming.definition || !incoming.slots.length) return;
        const same = entries.some((e) =>
          normalizeDictionaryWord(e.definition) === normalizeDictionaryWord(incoming.definition) &&
          getEntrySignature(e) === getEntrySignature(incoming)
        );
        if (!same) entries.push(incoming);
      });
      localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    }

    alert("Import completed.");
    selectedImageKeys.clear();
    expandedImageSymbols.clear();
    renderImageList();
    renderWordList();
  }

  async function importTransferFile(file) {
    if (!file) return;
    const name = (file.name || "").toLowerCase();
    if (!name.endsWith(".json")) {
      alert("Please choose a .json transfer file.");
      return;
    }
    try {
      await importImagePackage(file);
    } catch {
      alert("Import failed. Please use a valid transfer .json file.");
    }
  }

  if (wordSearch) wordSearch.addEventListener("input", renderWordList);
  if (fullDictionary) {
    fullDictionary.addEventListener("change", () => {
      if (fullDictionary.checked) {
        getEntries().forEach((entry) => selectedWordIds.add(entry._entryId));
      } else {
        selectedWordIds.clear();
      }
      renderWordList();
    });
  }
  if (imageSearch) imageSearch.addEventListener("input", renderImageList);
  if (fullImages) {
    fullImages.addEventListener("change", () => {
      selectedImageKeys.clear();
      if (fullImages.checked) {
        const all = getCustomImageMap();
        Object.keys(all).forEach((id) => {
          all[id].customImages.forEach((_, idx) => selectedImageKeys.add(id + "::" + idx));
          expandedImageSymbols.add(id);
        });
      } else {
        expandedImageSymbols.clear();
      }
      renderImageList();
    });
  }
  if (exportDictionaryBtn) exportDictionaryBtn.addEventListener("click", () => exportDictionaryTxt(getSelectedWordEntries()));
  if (importDictionaryBtn && importDictionaryFile) {
    importDictionaryBtn.addEventListener("click", async () => {
      const f = importDictionaryFile.files && importDictionaryFile.files[0];
      if (!f) return alert("Choose a dictionary file first.");
      await importDictionaryTxt(f);
    });
  }
  if (exportImagesBtn) exportImagesBtn.addEventListener("click", () => exportImagesPackage(false));
  if (importImagesBtn && importImagesFile) {
    importImagesBtn.addEventListener("click", async () => {
      const f = importImagesFile.files && importImagesFile.files[0];
      if (!f) return alert("Choose an images file first.");
      await importImagePackage(f);
    });
  }
  if (exportAllBtn) exportAllBtn.addEventListener("click", () => exportImagesPackage(true));
  if (transferImportFileBtn && transferImportFile) {
    transferImportFileBtn.addEventListener("click", async () => {
      const f = transferImportFile.files && transferImportFile.files[0];
      if (!f) return alert("Choose a transfer .json file first.");
      await importTransferFile(f);
    });
  }
  if (transferDropzone) {
    transferDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      transferDropzone.classList.add("is-dragover");
    });
    transferDropzone.addEventListener("dragleave", () => {
      transferDropzone.classList.remove("is-dragover");
    });
    transferDropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      transferDropzone.classList.remove("is-dragover");
      const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      await importTransferFile(f);
    });
  }

  renderWordList();
  renderImageList();
}


/* --------------------------------
   DICTIONARY PAGE
-------------------------------- */
if (page === "dictionary") {
  const list = document.getElementById("dictionary-list");
  const searchBar = document.getElementById("search-bar");
  const hideCoreWordsCheckbox = document.getElementById("hide-core-words");
  const showOnlyExceptionsCheckbox = document.getElementById("show-only-exceptions");
  const PASSWORD = "admin123"; // Temporary admin password
  ensureCoreWordsInDictionary();

  function loadEntries() {
    list.innerHTML = "";
    let entries = ensureCoreWordsInDictionary();

    if (showOnlyExceptionsCheckbox && showOnlyExceptionsCheckbox.checked) {
      const groups = {};
      entries.forEach((entry) => {
        const key = normalizeDictionaryWord(getEntryDisplayWord(entry, getStoredLang()));
        if (!key) return;
        if (!groups[key]) groups[key] = new Set();
        groups[key].add(getEntrySignature(entry));
      });
      entries = entries.filter((entry) => {
        const key = normalizeDictionaryWord(getEntryDisplayWord(entry, getStoredLang()));
        return key && groups[key] && groups[key].size > 1;
      });
    }

    // Sort by symbol ID sequence (using flat list)
    entries.sort((a, b) => {
      const symsA = getSymbolsForEntry(a);
      const symsB = getSymbolsForEntry(b);
      const idsA = symsA.map(s => parseInt(s.id));
      const idsB = symsB.map(s => parseInt(s.id));
      const len = Math.max(idsA.length, idsB.length);
      for (let i = 0; i < len; i++) {
        const valA = idsA[i] ?? 0;
        const valB = idsB[i] ?? 0;
        if (valA !== valB) return valA - valB;
      }
      return 0;
    });

    entries.forEach((entry, index) => {
      if (hideCoreWordsCheckbox && hideCoreWordsCheckbox.checked && entry.isCore) return;
      const entryDiv = document.createElement("div");
      entryDiv.className = "entry";
      if (entry.isCore) entryDiv.classList.add("entry-core");

      const symbolsDiv = document.createElement("div");
      symbolsDiv.className = "entry-symbols";

      if (entry.slots) {
        // New format: same layout as create — left slot [effects column | main], right slot [effects column | main], images only
        entry.slots.forEach((slot) => {
          const slotGroup = document.createElement("div");
          slotGroup.className = "entry-slot-group";
          const hasEffects = slot.effectLeft || slot.effectRight;
          if (hasEffects) {
            const effectsCol = document.createElement("div");
            effectsCol.className = "entry-effects-column";
            if (slot.effectLeft) {
              const box = document.createElement("div");
              box.className = "entry-effect";
              const symLeft = typeof symbols !== "undefined" && symbols.find((s) => s.id === slot.effectLeft.id);
              const nameLeft = symLeft ? getSymbolName(symLeft) : (slot.effectLeft.name || "");
              box.title = nameLeft;
              box.appendChild(createSymbolVisual(slot.effectLeft, nameLeft));
              effectsCol.appendChild(box);
            }
            if (slot.effectRight) {
              const box = document.createElement("div");
              box.className = "entry-effect";
              const symRight = typeof symbols !== "undefined" && symbols.find((s) => s.id === slot.effectRight.id);
              const nameRight = symRight ? getSymbolName(symRight) : (slot.effectRight.name || "");
              box.title = nameRight;
              box.appendChild(createSymbolVisual(slot.effectRight, nameRight));
              effectsCol.appendChild(box);
            }
            slotGroup.appendChild(effectsCol);
          }
          if (slot.main) {
            const mainBox = document.createElement("div");
            mainBox.className = "entry-main";
            const symMain = typeof symbols !== "undefined" && symbols.find((s) => s.id === slot.main.id);
            const nameMain = symMain ? getSymbolName(symMain) : (slot.main.name || "");
            mainBox.title = nameMain;
            mainBox.appendChild(createSymbolVisual(slot.main, nameMain));
            slotGroup.appendChild(mainBox);
          }
          symbolsDiv.appendChild(slotGroup);
        });
      } else {
        // Old format: flat row of images only
        const symbolsToShow = getSymbolsForEntry(entry);
        symbolsToShow.forEach((ref) => {
          if (!ref || (!ref.image && !ref.rgb)) return;
          const sym = typeof symbols !== "undefined" && symbols.find((s) => s.id === ref.id);
          const displayName = sym ? getSymbolName(sym) : (ref.name || "");
          const box = document.createElement("div");
          box.className = "symbol";
          box.title = displayName;
          box.appendChild(createSymbolVisual(ref, displayName));
          symbolsDiv.appendChild(box);
        });
      }

      const defDiv = document.createElement("div");
      defDiv.className = "definition";
      defDiv.textContent = getEntryDisplayWord(entry, getStoredLang());

      entryDiv.appendChild(symbolsDiv);
      entryDiv.appendChild(defDiv);
      entryDiv.dataset.entryId = entry._entryId;

      // Right-click: open note + delete popup (read fresh from localStorage so saved notes show)
      entryDiv.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openWordContext(entry._entryId);
      });

      list.appendChild(entryDiv);
    });
  }

  // --- Word context popup (note + delete) ---
  const wordContextBox = document.getElementById("word-context-box");
  const wordContextTitle = document.getElementById("word-context-title");
  const wordContextNote = document.getElementById("word-context-note");
  const wordContextSaveNote = document.getElementById("word-context-save-note");
  const wordContextDelete = document.getElementById("word-context-delete");
  const wordContextClose = document.getElementById("word-context-close");
  const adminEditBox = document.getElementById("admin-edit-box");
  const adminEditSave = document.getElementById("admin-edit-save");
  const adminEditDelete = document.getElementById("admin-edit-delete");
  const adminEditClose = document.getElementById("admin-edit-close");
  const adminInputs = {
    en: document.getElementById("admin-edit-en"),
    zh: document.getElementById("admin-edit-zh"),
    es: document.getElementById("admin-edit-es"),
    fr: document.getElementById("admin-edit-fr"),
    ru: document.getElementById("admin-edit-ru"),
    de: document.getElementById("admin-edit-de"),
    ja: document.getElementById("admin-edit-ja"),
  };

  let currentWordEntryId = "";

  function openWordContext(entryId) {
    currentWordEntryId = entryId;
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    const idx = findEntryIndexById(entries, entryId);
    const entry = idx >= 0 ? entries[idx] : null;
    if (!entry) return;
    wordContextTitle.textContent = getEntryDisplayWord(entry, getStoredLang());
    wordContextNote.value = entry.note || "";
    wordContextBox.classList.remove("hidden");
  }

  function closeWordContext() {
    wordContextBox.classList.add("hidden");
    currentWordEntryId = "";
  }

  wordContextClose.addEventListener("click", closeWordContext);
  wordContextBox.addEventListener("click", (e) => {
    if (e.target === wordContextBox) closeWordContext();
  });

  wordContextSaveNote.addEventListener("click", () => {
    if (!currentWordEntryId) return;
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    const idx = findEntryIndexById(entries, currentWordEntryId);
    if (idx < 0) return;
    entries[idx].note = wordContextNote.value.trim();
    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    closeWordContext();
  });

  wordContextDelete.addEventListener("click", () => {
    const pw = prompt(getTranslation("dictionary.passwordPrompt"));
    if (pw === PASSWORD) {
      const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
      const idx = findEntryIndexById(entries, currentWordEntryId);
      const entry = idx >= 0 ? entries[idx] : null;
      if (!entry || !adminEditBox) return;
      const tr = entry.translations || {};
      Object.keys(adminInputs).forEach((lang) => {
        if (!adminInputs[lang]) return;
        adminInputs[lang].value = tr[lang] || getEntryDisplayWord(entry, lang) || "";
      });
      adminEditBox.classList.remove("hidden");
    } else if (pw !== null) {
      alert(getTranslation("dictionary.incorrectPassword"));
    }
  });

  if (adminEditClose) {
    adminEditClose.addEventListener("click", () => {
      if (adminEditBox) adminEditBox.classList.add("hidden");
    });
  }

  if (adminEditBox) {
    adminEditBox.addEventListener("click", (e) => {
      if (e.target === adminEditBox) adminEditBox.classList.add("hidden");
    });
  }

  if (adminEditSave) {
    adminEditSave.addEventListener("click", () => {
      const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
      const idx = findEntryIndexById(entries, currentWordEntryId);
      if (idx >= 0 && idx < entries.length) {
        const entry = entries[idx];
        entry.translations = entry.translations || {};
        Object.keys(adminInputs).forEach((lang) => {
          if (!adminInputs[lang]) return;
          entry.translations[lang] = adminInputs[lang].value.trim();
        });
        entry.definition = entry.translations.en || entry.definition;
        localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
        loadEntries();
      }
      if (adminEditBox) adminEditBox.classList.add("hidden");
      closeWordContext();
    });
  }

  if (adminEditDelete) {
    adminEditDelete.addEventListener("click", () => {
      const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
      const idx = findEntryIndexById(entries, currentWordEntryId);
      if (idx >= 0 && idx < entries.length) {
        entries.splice(idx, 1);
        localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
        loadEntries();
      }
      if (adminEditBox) adminEditBox.classList.add("hidden");
      closeWordContext();
    });
  }

  // --- Live search ---
  searchBar.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const entries = Array.from(list.getElementsByClassName("entry"));
    entries.forEach(entry => {
      const def = entry.querySelector(".definition").textContent.toLowerCase();
      entry.style.display = def.includes(query) ? "grid" : "none";
    });
  });

  if (hideCoreWordsCheckbox) {
    hideCoreWordsCheckbox.addEventListener("change", () => {
      loadEntries();
      const query = searchBar.value.toLowerCase();
      if (!query) return;
      const entriesEls = Array.from(list.getElementsByClassName("entry"));
      entriesEls.forEach((entryEl) => {
        const def = entryEl.querySelector(".definition").textContent.toLowerCase();
        entryEl.style.display = def.includes(query) ? "grid" : "none";
      });
    });
  }
  if (showOnlyExceptionsCheckbox) {
    showOnlyExceptionsCheckbox.addEventListener("change", () => {
      loadEntries();
      const query = searchBar.value.toLowerCase();
      if (!query) return;
      const entriesEls = Array.from(list.getElementsByClassName("entry"));
      entriesEls.forEach((entryEl) => {
        const def = entryEl.querySelector(".definition").textContent.toLowerCase();
        entryEl.style.display = def.includes(query) ? "grid" : "none";
      });
    });
  }

  window.onLanguageChange = () => loadEntries();
  window.kanjiBuilderRefreshDictionary = loadEntries;

  loadEntries();
  backfillMissingCustomTranslations().then((changed) => {
    if (changed) loadEntries();
  });
}

/* --------------------------------
   COMMENTS PAGE
   Handled entirely by the inline script in comments.html (Firebase).
   No duplicate localStorage-based UI here, so the page shows the correct
   format (no trash can, right-click to delete, text arrows) from load.
-------------------------------- */
if (page === "comments") {
  // Theme toggle and any other shared behavior only; comment list is rendered by comments.html
}
