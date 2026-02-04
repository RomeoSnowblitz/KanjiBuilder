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

var colorImageCache = {};
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

/**
 * Render a symbol like AlphabetApp renders video: put the path in HTML and inject with innerHTML
 * so the browser parses the relative URL (works from file:// and http). Returns an img or wrapper node.
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
    // Same pattern as AlphabetApp: <source src="videos/animated_a.mp4"> — path in HTML, parsed by browser
    const path = symOrRef.image;
    const alt = escapeHtmlAttr(altText);
    const wrapper = document.createElement("div");
    wrapper.innerHTML = "<img src=\"" + path + "\" alt=\"" + alt + "\">";
    const img = wrapper.firstChild;
    img.setAttribute("role", "img");
    img.setAttribute("aria-label", altText);
    return img;
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

  closeInfoBtn.addEventListener("click", () => infoBox.classList.add("hidden"));
  infoBox.addEventListener("click", (e) => {
    if (e.target === infoBox) infoBox.classList.add("hidden");
  });

  function showSymbolInfo(sym) {
    currentInfoSymbolId = sym.id;
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
      infoImageWrap.appendChild(createSymbolVisual(sym, displayName));
      infoExtra.focus();
    }, 0);
  }

  infoSaveBtn.addEventListener("click", () => {
    if (currentInfoSymbolId == null) return;
    const notes = getSymbolNotes();
    const extras = getSymbolExtras();
    notes[currentInfoSymbolId] = infoNote.value.trim();
    extras[currentInfoSymbolId] = infoExtra.value.trim();
    localStorage.setItem(SYMBOL_NOTES_KEY, JSON.stringify(notes));
    localStorage.setItem(SYMBOL_EXTRAS_KEY, JSON.stringify(extras));
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

  symbols.forEach(sym => {
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
      // Normal click = left slot; Shift+click = right slot. If slot has no main, set main; else add as effect.
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
  };

  // Submit: build entry with new structure (order: leftEffect1, leftMain, leftEffect2, rightEffect1, rightMain, rightEffect2)
  const wordInput = document.getElementById("definition-input");
  const submitBtn = document.getElementById("submit-word");

  submitBtn.addEventListener("click", () => {
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
    const entry = {
      slots: [
        { main: toRef(slots.left.main), effectLeft: toRef(slots.left.effectLeft), effectRight: toRef(slots.left.effectRight) },
        { main: toRef(slots.right.main), effectLeft: toRef(slots.right.effectLeft), effectRight: toRef(slots.right.effectRight) },
      ],
      definition: word,
    };

    let entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
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
   DICTIONARY PAGE
-------------------------------- */
if (page === "dictionary") {
  const list = document.getElementById("dictionary-list");
  const searchBar = document.getElementById("search-bar");
  const PASSWORD = "admin123"; // Temporary admin password

  // Get flat list of symbols for display/sort: supports both old (entry.symbols) and new (entry.slots) format
  function getSymbolsForEntry(entry) {
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

  function loadEntries() {
    list.innerHTML = "";
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");

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
      const entryDiv = document.createElement("div");
      entryDiv.className = "entry";

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
      defDiv.textContent = entry.definition;

      entryDiv.appendChild(symbolsDiv);
      entryDiv.appendChild(defDiv);
      entryDiv.dataset.entryIndex = index;

      // Right-click: open note + delete popup (read fresh from localStorage so saved notes show)
      entryDiv.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        openWordContext(index);
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

  let currentWordEntryIndex = -1;

  function openWordContext(index) {
    currentWordEntryIndex = index;
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    const entry = entries[index];
    if (!entry) return;
    wordContextTitle.textContent = entry.definition;
    wordContextNote.value = entry.note || "";
    wordContextBox.classList.remove("hidden");
  }

  function closeWordContext() {
    wordContextBox.classList.add("hidden");
    currentWordEntryIndex = -1;
  }

  wordContextClose.addEventListener("click", closeWordContext);
  wordContextBox.addEventListener("click", (e) => {
    if (e.target === wordContextBox) closeWordContext();
  });

  wordContextSaveNote.addEventListener("click", () => {
    if (currentWordEntryIndex < 0) return;
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    if (currentWordEntryIndex >= entries.length) return;
    entries[currentWordEntryIndex].note = wordContextNote.value.trim();
    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    closeWordContext();
  });

  wordContextDelete.addEventListener("click", () => {
    const pw = prompt(getTranslation("dictionary.passwordPrompt"));
    if (pw === PASSWORD) {
      const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
      if (currentWordEntryIndex >= 0 && currentWordEntryIndex < entries.length) {
        entries.splice(currentWordEntryIndex, 1);
        localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
        loadEntries();
      }
      closeWordContext();
    } else if (pw !== null) {
      alert(getTranslation("dictionary.incorrectPassword"));
    }
  });

  // --- Live search ---
  searchBar.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase();
    const entries = Array.from(list.getElementsByClassName("entry"));
    entries.forEach(entry => {
      const def = entry.querySelector(".definition").textContent.toLowerCase();
      entry.style.display = def.includes(query) ? "grid" : "none";
    });
  });

  window.onLanguageChange = () => loadEntries();

  loadEntries();
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
