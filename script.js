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
const USERNAME_STORAGE_KEY = "kanjiBuilderUsername";
const ANONYMOUS_NAME = "Anonymous";
const ADMIN_MODE_KEY = "kanjiBuilderAdminMode";
const ADMIN_PASSWORD = "admin123";
const OKAY_EXCEPTIONS_KEY = "dictionaryOkayExceptions";
const HIDDEN_WORLD_LINES_KEY = "dictionaryHiddenWorldLines";
const SYMBOL_VIEW_MODE_KEY = "symbolViewMode";

function getStoredSymbolViewMode() {
  return localStorage.getItem(SYMBOL_VIEW_MODE_KEY) === "key" ? "key" : "manual";
}

function setStoredSymbolViewMode(mode) {
  localStorage.setItem(SYMBOL_VIEW_MODE_KEY, mode === "key" ? "key" : "manual");
}

/** Apply saved Manual/Key Mode to a toggle button; returns the active mode. */
function applySymbolViewModeToToggle(toggle) {
  const mode = getStoredSymbolViewMode();
  if (!toggle) return mode;
  toggle.dataset.mode = mode;
  toggle.setAttribute("aria-pressed", mode === "key" ? "true" : "false");
  if (typeof getTranslation === "function") {
    toggle.textContent = getTranslation(mode === "key" ? "create.keyMode" : "create.manualMode");
  }
  return mode;
}

function isAdminMode() {
  return localStorage.getItem(ADMIN_MODE_KEY) === "1";
}

function setAdminMode(enabled) {
  localStorage.setItem(ADMIN_MODE_KEY, enabled ? "1" : "0");
  syncAdminModeVersionLabel();
}

function requireAdminPassword(promptPath) {
  if (isAdminMode()) return true;
  const message = (typeof getTranslation === "function" && promptPath)
    ? getTranslation(promptPath)
    : "Enter admin password:";
  const pw = prompt(message);
  if (pw === ADMIN_PASSWORD) return true;
  if (pw !== null) {
    const fail = (typeof getTranslation === "function")
      ? (getTranslation("dictionary.incorrectPassword") || getTranslation("comments.incorrectPassword") || "Incorrect password.")
      : "Incorrect password.";
    alert(fail);
  }
  return false;
}

function syncAdminModeVersionLabel() {
  document.querySelectorAll(".app-version").forEach((el) => {
    const text = (el.textContent || "").trim();
    const match = text.match(/^[vV](.*)$/);
    if (!match) return;
    el.textContent = (isAdminMode() ? "V" : "v") + match[1];
  });
}

function setupAdminModeToggle() {
  document.querySelectorAll(".app-version").forEach((version) => {
    if (version.dataset.adminToggleBound) return;
    version.dataset.adminToggleBound = "1";
    version.style.cursor = "pointer";
    version.title = "Admin mode";
    version.addEventListener("click", (event) => {
      event.preventDefault();
      if (isAdminMode()) {
        setAdminMode(false);
        return;
      }
      const pw = prompt("Enter admin password:");
      if (pw === ADMIN_PASSWORD) setAdminMode(true);
      else if (pw !== null) alert("Incorrect password.");
    });
  });
  syncAdminModeVersionLabel();
}

window.isAdminMode = isAdminMode;
window.requireAdminPassword = requireAdminPassword;
window.setAdminMode = setAdminMode;

const USERNAME_UI_TEXTS = {
  en: { empty: "[Click Here To Create A Username]", title: "Username", label: "Name:", anonymous: "Be Anonymous", save: "Save", close: "Close" },
  zh: { empty: "[点击这里创建用户名]", title: "用户名", label: "名称：", anonymous: "保持匿名", save: "保存", close: "关闭" },
  es: { empty: "[Haz clic aquí para crear un nombre]", title: "Nombre de usuario", label: "Nombre:", anonymous: "Ser anónimo", save: "Guardar", close: "Cerrar" },
  fr: { empty: "[Cliquez ici pour créer un nom]", title: "Nom d’utilisateur", label: "Nom :", anonymous: "Rester anonyme", save: "Enregistrer", close: "Fermer" },
  ru: { empty: "[Нажмите здесь, чтобы создать имя]", title: "Имя пользователя", label: "Имя:", anonymous: "Остаться анонимным", save: "Сохранить", close: "Закрыть" },
  de: { empty: "[Hier klicken, um einen Namen zu erstellen]", title: "Benutzername", label: "Name:", anonymous: "Anonym bleiben", save: "Speichern", close: "Schließen" },
  ja: { empty: "[ここをクリックしてユーザー名を作成]", title: "ユーザー名", label: "名前：", anonymous: "匿名にする", save: "保存", close: "閉じる" },
};

function getStoredUsername() {
  return (localStorage.getItem(USERNAME_STORAGE_KEY) || "").trim();
}

function getCurrentAuthorName() {
  return getStoredUsername() || ANONYMOUS_NAME;
}
window.getCurrentAuthorName = getCurrentAuthorName;

function initializeEntryAuthorship(entry, dateValue) {
  if (!entry || entry.isCore) return entry;
  const timestamp = dateValue || new Date().toISOString();
  if (!entry.createdBy) entry.createdBy = getCurrentAuthorName();
  if (!entry.createdAt) entry.createdAt = timestamp;
  if (!entry.lastEditedBy) entry.lastEditedBy = entry.createdBy;
  if (!entry.lastEditedAt) entry.lastEditedAt = entry.createdAt;
  return entry;
}

function markEntryEdited(entry, dateValue) {
  if (!entry || entry.isCore) return entry;
  initializeEntryAuthorship(entry, dateValue);
  entry.lastEditedBy = getCurrentAuthorName();
  entry.lastEditedAt = dateValue || new Date().toISOString();
  return entry;
}

const langBtn = document.getElementById("lang-btn");
const langDropdown = document.getElementById("lang-dropdown");

// -------------------------------
// UI ACCENT COLOR (left of language)
// -------------------------------
const UI_ACCENT_STORAGE_KEY = "uiAccentColor";
const UI_ACCENT_CONFIG_KEY = "uiAccentConfig";
const UI_ACCENT_SLOTS_KEY = "uiAccentSlots";
const UI_ACCENT_ACTIVE_SLOT_KEY = "uiAccentActiveSlot";
const DEFAULT_ACCENT_HEX = "#3da9fc";
const DEFAULT_RGB = [61, 169, 252];
const DEFAULT_RGB_2 = [255, 107, 107];
const RAINBOW_STOPS = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#0000ff", "#4b0082", "#9400d3"];
const RAINBOW_GRADIENT = "linear-gradient(90deg, " + RAINBOW_STOPS.join(", ") + ")";

let uiAccentCycleTimer = null;
let uiAccentCycleHue = 0;
let uiAccentActiveConfig = null;

function defaultUiAccentColorState(rgb) {
  return {
    source: "custom",
    rgb: (rgb && rgb.length === 3) ? rgb.slice() : DEFAULT_RGB.slice(),
  };
}

function defaultUiAccentConfig() {
  return {
    mode: "plain",
    color1: defaultUiAccentColorState(DEFAULT_RGB),
    color2: defaultUiAccentColorState(DEFAULT_RGB_2),
    fadeType: "NS",
    fadeScope: "screen",
  };
}

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : DEFAULT_RGB.slice();
}

function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map((x) => ("0" + Math.max(0, Math.min(255, x)).toString(16)).slice(-2)).join("");
}

function clampRgbChannel(value) {
  return Math.max(0, Math.min(255, parseInt(value, 10) || 0));
}

function normalizeUiAccentColorState(raw, fallbackRgb) {
  const base = defaultUiAccentColorState(fallbackRgb);
  if (!raw || typeof raw !== "object") return base;
  const source = raw.source === "rainbow" || raw.source === "cycle" ? raw.source : "custom";
  const rgb = Array.isArray(raw.rgb) && raw.rgb.length === 3
    ? raw.rgb.map(clampRgbChannel)
    : base.rgb.slice();
  return { source, rgb };
}

function normalizeUiAccentConfig(raw) {
  const defaults = defaultUiAccentConfig();
  if (!raw || typeof raw !== "object") {
    if (typeof raw === "string" && raw.startsWith("#")) {
      defaults.color1 = defaultUiAccentColorState(hexToRgb(raw));
      return defaults;
    }
    return defaults;
  }
  return {
    mode: raw.mode === "fade" ? "fade" : "plain",
    color1: normalizeUiAccentColorState(raw.color1, DEFAULT_RGB),
    color2: normalizeUiAccentColorState(raw.color2, DEFAULT_RGB_2),
    fadeType: ["NS", "WE", "14", "32"].includes(raw.fadeType) ? raw.fadeType : "NS",
    fadeScope: raw.fadeScope === "unit" ? "unit" : "screen",
  };
}

function getStoredUiAccentConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(UI_ACCENT_CONFIG_KEY) || "null");
    if (parsed) return normalizeUiAccentConfig(parsed);
  } catch (err) { /* ignore */ }
  const legacy = localStorage.getItem(UI_ACCENT_STORAGE_KEY);
  if (legacy) return normalizeUiAccentConfig(legacy);
  return defaultUiAccentConfig();
}

function saveUiAccentConfig(config) {
  const normalized = normalizeUiAccentConfig(config);
  localStorage.setItem(UI_ACCENT_CONFIG_KEY, JSON.stringify(normalized));
  localStorage.setItem(UI_ACCENT_STORAGE_KEY, rgbToHex(
    normalized.color1.rgb[0],
    normalized.color1.rgb[1],
    normalized.color1.rgb[2]
  ));
  return normalized;
}

function getUiAccentSlots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(UI_ACCENT_SLOTS_KEY) || "{}");
    return {
      1: parsed[1] ? normalizeUiAccentConfig(parsed[1]) : null,
      2: parsed[2] ? normalizeUiAccentConfig(parsed[2]) : null,
      3: parsed[3] ? normalizeUiAccentConfig(parsed[3]) : null,
    };
  } catch (err) {
    return { 1: null, 2: null, 3: null };
  }
}

function setUiAccentSlot(slot, config) {
  const slots = getUiAccentSlots();
  slots[slot] = normalizeUiAccentConfig(config);
  localStorage.setItem(UI_ACCENT_SLOTS_KEY, JSON.stringify(slots));
}

function getActiveUiAccentSlot() {
  const slot = parseInt(localStorage.getItem(UI_ACCENT_ACTIVE_SLOT_KEY) || "1", 10);
  return slot === 2 || slot === 3 ? slot : 1;
}

function setActiveUiAccentSlot(slot) {
  localStorage.setItem(UI_ACCENT_ACTIVE_SLOT_KEY, String(slot === 2 || slot === 3 ? slot : 1));
}

function hslToRgb(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = sat * Math.min(light, 1 - light);
  const f = (n) => light - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}

function colorStateToSolidHex(colorState, movingHue) {
  if (!colorState) return DEFAULT_ACCENT_HEX;
  if (colorState.source === "cycle") {
    const rgb = hslToRgb(movingHue || uiAccentCycleHue || 0, 90, 55);
    return rgbToHex(rgb[0], rgb[1], rgb[2]);
  }
  // Rainbow uses --accent-fade-gradient for fills/text; keep last custom RGB for
  // borders and any solid-only accents (never the old magenta placeholder).
  return rgbToHex(colorState.rgb[0], colorState.rgb[1], colorState.rgb[2]);
}

function colorStopsForState(colorState, movingHue) {
  if (!colorState) return [DEFAULT_ACCENT_HEX];
  if (colorState.source === "rainbow") return RAINBOW_STOPS.slice();
  return [colorStateToSolidHex(colorState, movingHue)];
}

function fadeTypeAngle(fadeType) {
  switch (fadeType) {
    case "WE": return "to right";
    case "14": return "to bottom right";
    case "32": return "to top right";
    case "NS":
    default: return "to bottom";
  }
}

function buildAccentBackground(config, movingHue) {
  const normalized = normalizeUiAccentConfig(config);
  const hue = typeof movingHue === "number" ? movingHue : uiAccentCycleHue;
  if (normalized.mode !== "fade") {
    if (normalized.color1.source === "rainbow") {
      return "linear-gradient(" + fadeTypeAngle(normalized.fadeType) + ", " + RAINBOW_STOPS.join(", ") + ")";
    }
    return colorStateToSolidHex(normalized.color1, hue);
  }
  const stops = colorStopsForState(normalized.color1, hue)
    .concat(colorStopsForState(normalized.color2, hue));
  return "linear-gradient(" + fadeTypeAngle(normalized.fadeType) + ", " + stops.join(", ") + ")";
}

function configUsesFadeType(config) {
  const normalized = normalizeUiAccentConfig(config);
  if (normalized.mode === "fade") return true;
  return normalized.color1.source === "rainbow" || normalized.color1.source === "cycle";
}

function configUsesFadeScope(config) {
  const normalized = normalizeUiAccentConfig(config);
  if (normalized.mode === "fade") return true;
  return normalized.color1.source === "rainbow";
}

function configUsesGradientAccent(config) {
  const normalized = normalizeUiAccentConfig(config);
  if (normalized.mode === "fade") return true;
  return normalized.color1.source === "rainbow";
}

function ensureUiAccentScreenOverlay() {
  let overlay = document.getElementById("ui-accent-screen-fx");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "ui-accent-screen-fx";
  overlay.className = "ui-accent-screen-fx hidden";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);
  return overlay;
}

function stopUiAccentCycle() {
  if (uiAccentCycleTimer) {
    cancelAnimationFrame(uiAccentCycleTimer);
    uiAccentCycleTimer = null;
  }
}

function configNeedsCycle(config) {
  if (!config) return false;
  if (config.color1 && config.color1.source === "cycle") return true;
  if (config.mode === "fade" && config.color2 && config.color2.source === "cycle") return true;
  return false;
}

function refreshAccentDependentViews() {
  if (typeof window.kanjiBuilderRefreshCreate === "function") window.kanjiBuilderRefreshCreate();
  // Dictionary accents are CSS-variable driven. Do not call kanjiBuilderRefreshDictionary
  // here: scroll/resize under fade+screen would rebuild the whole list and jump to top.
  if (typeof window.kanjiBuilderRefreshWrite === "function") window.kanjiBuilderRefreshWrite();
  if (typeof window.kanjiBuilderRefreshPlay === "function") window.kanjiBuilderRefreshPlay();
  if (typeof window.kanjiBuilderRefreshWeb === "function") window.kanjiBuilderRefreshWeb();
  if (typeof window.kanjiBuilderRefreshDraw === "function") window.kanjiBuilderRefreshDraw();
}

function applyUiAccentConfig(config, options) {
  const normalized = normalizeUiAccentConfig(config);
  uiAccentActiveConfig = normalized;
  const opts = options || {};
  const root = document.documentElement;
  const body = document.body;
  const overlay = ensureUiAccentScreenOverlay();
  const hue = typeof opts.hue === "number" ? opts.hue : uiAccentCycleHue;
  const solid1 = colorStateToSolidHex(normalized.color1, hue);
  const solid2 = colorStateToSolidHex(normalized.color2, hue);
  const fadeGradient = buildAccentBackground(normalized, hue);

  root.style.setProperty("--accent-color", solid1);
  root.style.setProperty("--accent-color-2", solid2);
  root.style.setProperty("--accent-fade-gradient", fadeGradient);

  body.classList.toggle("ui-accent-mode-fade", normalized.mode === "fade");
  body.classList.toggle("ui-accent-mode-plain", normalized.mode !== "fade");
  const useScope = configUsesFadeScope(normalized);
  const useGradient = configUsesGradientAccent(normalized);
  body.classList.toggle("ui-accent-scope-unit", useScope && normalized.fadeScope === "unit");
  body.classList.toggle("ui-accent-scope-screen", useScope && normalized.fadeScope === "screen");
  body.classList.toggle("ui-accent-rainbow-1", normalized.color1.source === "rainbow");
  body.classList.toggle("ui-accent-cycle-1", normalized.color1.source === "cycle");
  body.classList.toggle("ui-accent-gradient", useGradient);

  // Screen fade is applied via fixed background gradients on text/controls/symbols.
  // Keep overlay hidden so it does not wash out the real accent colors.
  overlay.classList.add("hidden");
  overlay.style.background = "";

  const box = document.getElementById("ui-color-box");
  if (box) {
    if (normalized.mode === "fade" || normalized.color1.source === "rainbow") {
      box.style.background = fadeGradient;
      box.style.backgroundAttachment = useScope && normalized.fadeScope === "screen" ? "fixed" : "scroll";
      box.style.backgroundColor = "";
    } else {
      box.style.background = "";
      box.style.backgroundAttachment = "";
      box.style.backgroundColor = solid1;
    }
  }

  if (!opts.skipRefresh) {
    requestAnimationFrame(refreshAccentDependentViews);
  }
}

function startUiAccentCycleIfNeeded(config) {
  stopUiAccentCycle();
  if (!configNeedsCycle(config)) return;
  const tick = () => {
    uiAccentCycleHue = (uiAccentCycleHue + 0.7) % 360;
    applyUiAccentConfig(uiAccentActiveConfig || config, { hue: uiAccentCycleHue, skipRefresh: true });
    if (Math.floor(uiAccentCycleHue) % 12 === 0) refreshAccentDependentViews();
    uiAccentCycleTimer = requestAnimationFrame(tick);
  };
  uiAccentCycleTimer = requestAnimationFrame(tick);
}

function applyUiAccentColor(hex) {
  // Back-compat for older callers: treat as plain custom color.
  const config = defaultUiAccentConfig();
  config.color1 = defaultUiAccentColorState(hexToRgb(hex));
  applyUiAccentConfig(config);
  startUiAccentCycleIfNeeded(config);
}

function getStoredUiAccent() {
  const config = getStoredUiAccentConfig();
  return rgbToHex(config.color1.rgb[0], config.color1.rgb[1], config.color1.rgb[2]);
}

function buildUiColorSourceRow(prefix, title) {
  return `
    <div class="ui-color-source-block" data-color="${prefix}">
      <div class="ui-color-source-title">${title}</div>
      <div class="ui-color-rgb-row">
        <label>R <input type="number" id="ui-color-${prefix}-r" min="0" max="255" value="0" /></label>
        <label>G <input type="number" id="ui-color-${prefix}-g" min="0" max="255" value="0" /></label>
        <label>B <input type="number" id="ui-color-${prefix}-b" min="0" max="255" value="0" /></label>
        <button type="button" class="ui-color-source-btn" data-source="rainbow" data-target="${prefix}">Rainbow</button>
        <button type="button" class="ui-color-source-btn" data-source="cycle" data-target="${prefix}">Cycle</button>
        <button type="button" class="ui-color-source-btn" data-source="custom" data-target="${prefix}">Custom</button>
      </div>
    </div>
  `;
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

  const initialConfig = getStoredUiAccentConfig();
  applyUiAccentConfig(initialConfig);
  startUiAccentCycleIfNeeded(initialConfig);

  const popup = document.createElement("div");
  popup.id = "ui-color-popup";
  popup.className = "ui-color-popup hidden";
  popup.innerHTML = `
    <div class="ui-color-popup-content">
      <h2>UI Color</h2>
      <div class="ui-color-field-row">
        <label for="ui-color-mode">Color Option</label>
        <select id="ui-color-mode">
          <option value="plain">Plain</option>
          <option value="fade">Fade</option>
        </select>
      </div>
      ${buildUiColorSourceRow("1", "Color 1")}
      <div id="ui-color-2-section" class="ui-color-fade-section hidden">
        ${buildUiColorSourceRow("2", "Color 2")}
      </div>
      <div id="ui-color-fade-controls" class="ui-color-fade-controls hidden">
        <label for="ui-color-fade-type">Fade</label>
        <select id="ui-color-fade-type">
          <option value="NS">NS (12→34)</option>
          <option value="WE">WE (13→24)</option>
          <option value="14">14 (1→4)</option>
          <option value="32">32 (3→2)</option>
        </select>
        <span class="ui-color-for-label">For</span>
        <button type="button" id="ui-color-fade-scope" class="ui-color-scope-btn">Screen</button>
      </div>
      <div class="ui-color-sample-wrap">
        <div class="ui-color-sample-grid" aria-hidden="true">
          <span>1</span><span>2</span><span>3</span><span>4</span>
        </div>
        <div id="ui-color-preview" class="ui-color-preview" title="Fade / color sample"></div>
      </div>
      <div class="ui-color-slot-row">
        <button type="button" class="ui-color-slot-btn" data-slot="1">Save 1</button>
        <button type="button" class="ui-color-slot-btn" data-slot="2">Save 2</button>
        <button type="button" class="ui-color-slot-btn" data-slot="3">Save 3</button>
      </div>
      <div class="ui-color-actions">
        <button type="button" id="ui-color-save">Save</button>
        <button type="button" class="reset-btn" id="ui-color-reset">Reset</button>
        <button type="button" id="ui-color-close">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(popup);

  const modeSelect = document.getElementById("ui-color-mode");
  const color2Section = document.getElementById("ui-color-2-section");
  const fadeControls = document.getElementById("ui-color-fade-controls");
  const fadeTypeSelect = document.getElementById("ui-color-fade-type");
  const fadeScopeBtn = document.getElementById("ui-color-fade-scope");
  const preview = document.getElementById("ui-color-preview");
  const slotButtons = Array.from(popup.querySelectorAll(".ui-color-slot-btn"));

  let draft = normalizeUiAccentConfig(initialConfig);
  let activeSlot = getActiveUiAccentSlot();
  let savedConfigWhenOpened = normalizeUiAccentConfig(initialConfig);
  let previewCycleTimer = null;
  let previewHue = 0;

  function getColorInputs(prefix) {
    return {
      r: document.getElementById("ui-color-" + prefix + "-r"),
      g: document.getElementById("ui-color-" + prefix + "-g"),
      b: document.getElementById("ui-color-" + prefix + "-b"),
    };
  }

  function readRgbFromInputs(prefix) {
    const inputs = getColorInputs(prefix);
    return [
      clampRgbChannel(inputs.r.value),
      clampRgbChannel(inputs.g.value),
      clampRgbChannel(inputs.b.value),
    ];
  }

  function writeRgbToInputs(prefix, rgb) {
    const inputs = getColorInputs(prefix);
    inputs.r.value = rgb[0];
    inputs.g.value = rgb[1];
    inputs.b.value = rgb[2];
  }

  function syncSourceButtons(prefix, source) {
    popup.querySelectorAll('.ui-color-source-btn[data-target="' + prefix + '"]').forEach((btn) => {
      btn.classList.toggle("is-active", btn.getAttribute("data-source") === source);
    });
    const inputs = getColorInputs(prefix);
    const enabled = source === "custom";
    inputs.r.disabled = !enabled;
    inputs.g.disabled = !enabled;
    inputs.b.disabled = !enabled;
  }

  function stopPreviewCycle() {
    if (previewCycleTimer) {
      cancelAnimationFrame(previewCycleTimer);
      previewCycleTimer = null;
    }
  }

  function updatePreview() {
    preview.style.background = buildAccentBackground(draft, previewHue);
    preview.style.backgroundColor = "";
  }

  function updateFadeControlVisibility() {
    const showColor2 = draft.mode === "fade";
    const showFadeType = configUsesFadeType(draft);
    color2Section.classList.toggle("hidden", !showColor2);
    fadeControls.classList.toggle("hidden", !showFadeType);
    const showScope = configUsesFadeScope(draft);
    fadeScopeBtn.classList.toggle("hidden", !showScope);
    fadeControls.querySelector(".ui-color-for-label").classList.toggle("hidden", !showScope);
  }

  function syncDraftFromForm() {
    draft.mode = modeSelect.value === "fade" ? "fade" : "plain";
    draft.color1.rgb = readRgbFromInputs("1");
    draft.color2.rgb = readRgbFromInputs("2");
    draft.fadeType = fadeTypeSelect.value;
    draft.fadeScope = fadeScopeBtn.dataset.scope === "unit" ? "unit" : "screen";
    fadeScopeBtn.textContent = draft.fadeScope === "unit" ? "Unit" : "Screen";
    syncSourceButtons("1", draft.color1.source);
    syncSourceButtons("2", draft.color2.source);
    updateFadeControlVisibility();
    updatePreview();
    applyUiAccentConfig(draft, { hue: previewHue, skipRefresh: false });
    startLivePreviewCycle();
  }

  function startLivePreviewCycle() {
    stopPreviewCycle();
    stopUiAccentCycle();
    if (!configNeedsCycle(draft)) return;
    const tick = () => {
      previewHue = (previewHue + 0.7) % 360;
      uiAccentCycleHue = previewHue;
      updatePreview();
      applyUiAccentConfig(draft, { hue: previewHue, skipRefresh: true });
      if (Math.floor(previewHue) % 12 === 0) refreshAccentDependentViews();
      previewCycleTimer = requestAnimationFrame(tick);
    };
    previewCycleTimer = requestAnimationFrame(tick);
  }

  function loadDraftIntoForm(config) {
    draft = normalizeUiAccentConfig(config);
    modeSelect.value = draft.mode;
    writeRgbToInputs("1", draft.color1.rgb);
    writeRgbToInputs("2", draft.color2.rgb);
    fadeTypeSelect.value = draft.fadeType;
    fadeScopeBtn.dataset.scope = draft.fadeScope;
    fadeScopeBtn.textContent = draft.fadeScope === "unit" ? "Unit" : "Screen";
    syncSourceButtons("1", draft.color1.source);
    syncSourceButtons("2", draft.color2.source);
    updateFadeControlVisibility();
    updateSlotButtons();
    updatePreview();
    applyUiAccentConfig(draft);
    startLivePreviewCycle();
  }

  function updateSlotButtons() {
    const slots = getUiAccentSlots();
    slotButtons.forEach((btn) => {
      const slot = parseInt(btn.getAttribute("data-slot"), 10);
      btn.classList.toggle("is-active", slot === activeSlot);
      btn.classList.toggle("has-save", !!slots[slot]);
    });
  }

  function openPopup() {
    savedConfigWhenOpened = getStoredUiAccentConfig();
    activeSlot = getActiveUiAccentSlot();
    const slots = getUiAccentSlots();
    const slotConfig = slots[activeSlot];
    loadDraftIntoForm(slotConfig || savedConfigWhenOpened);
    popup.classList.remove("hidden");
  }

  function closePopup(revertToSaved) {
    stopPreviewCycle();
    popup.classList.add("hidden");
    if (revertToSaved) {
      applyUiAccentConfig(savedConfigWhenOpened);
      startUiAccentCycleIfNeeded(savedConfigWhenOpened);
    } else {
      startUiAccentCycleIfNeeded(getStoredUiAccentConfig());
    }
  }

  modeSelect.addEventListener("change", syncDraftFromForm);
  fadeTypeSelect.addEventListener("change", syncDraftFromForm);
  fadeScopeBtn.addEventListener("click", () => {
    fadeScopeBtn.dataset.scope = fadeScopeBtn.dataset.scope === "unit" ? "screen" : "unit";
    syncDraftFromForm();
  });

  ["1", "2"].forEach((prefix) => {
    const inputs = getColorInputs(prefix);
    ["r", "g", "b"].forEach((channel) => {
      inputs[channel].addEventListener("input", () => {
        if (prefix === "1") draft.color1.source = "custom";
        else draft.color2.source = "custom";
        syncDraftFromForm();
      });
    });
  });

  popup.querySelectorAll(".ui-color-source-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-target");
      const source = btn.getAttribute("data-source");
      if (target === "1") draft.color1.source = source;
      else draft.color2.source = source;
      syncDraftFromForm();
    });
  });

  slotButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSlot = parseInt(btn.getAttribute("data-slot"), 10);
      setActiveUiAccentSlot(activeSlot);
      const slots = getUiAccentSlots();
      if (slots[activeSlot]) {
        loadDraftIntoForm(slots[activeSlot]);
        savedConfigWhenOpened = saveUiAccentConfig(slots[activeSlot]);
      } else {
        updateSlotButtons();
      }
    });
  });

  document.getElementById("ui-color-save").addEventListener("click", () => {
    syncDraftFromForm();
    const saved = saveUiAccentConfig(draft);
    setUiAccentSlot(activeSlot, saved);
    setActiveUiAccentSlot(activeSlot);
    savedConfigWhenOpened = saved;
    updateSlotButtons();
    closePopup(false);
  });

  document.getElementById("ui-color-reset").addEventListener("click", () => {
    const resetConfig = defaultUiAccentConfig();
    loadDraftIntoForm(resetConfig);
    saveUiAccentConfig(resetConfig);
    setUiAccentSlot(activeSlot, resetConfig);
    savedConfigWhenOpened = resetConfig;
    updateSlotButtons();
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

let uiAccentScreenScrollTimer = null;
window.addEventListener("scroll", () => {
  if (!uiAccentActiveConfig || uiAccentActiveConfig.mode !== "fade" || uiAccentActiveConfig.fadeScope !== "screen") {
    return;
  }
  clearTimeout(uiAccentScreenScrollTimer);
  uiAccentScreenScrollTimer = setTimeout(() => {
    refreshAccentDependentViews();
  }, 140);
}, { passive: true });
window.addEventListener("resize", () => {
  if (!uiAccentActiveConfig || uiAccentActiveConfig.mode !== "fade" || uiAccentActiveConfig.fadeScope !== "screen") {
    return;
  }
  clearTimeout(uiAccentScreenScrollTimer);
  uiAccentScreenScrollTimer = setTimeout(() => {
    refreshAccentDependentViews();
  }, 140);
});

function getStoredLang() {
  const stored = localStorage.getItem(LANG_STORAGE_KEY);
  return LANGUAGES[stored] ? stored : "en";
}

function setupUsernameBadge() {
  const main = document.querySelector("main");
  const version = main && main.querySelector(".app-version");
  if (!main || !version) return;
  const metaBar = document.createElement("div");
  metaBar.className = "page-meta-bar";
  const badge = document.createElement("button");
  badge.type = "button";
  badge.id = "app-username";
  badge.className = "app-username";
  version.parentNode.insertBefore(metaBar, version);
  metaBar.appendChild(badge);
  metaBar.appendChild(version);

  const popup = document.createElement("div");
  popup.className = "username-popup hidden";
  popup.innerHTML = `
    <div class="username-popup-content">
      <h2 id="username-popup-title">Username</h2>
      <label id="username-name-label" for="username-input">Name:</label>
      <input id="username-input" type="text" maxlength="60" />
      <label class="username-anonymous-option">
        <input id="username-anonymous" type="checkbox" />
        <span id="username-anonymous-label">Be Anonymous</span>
      </label>
      <div class="username-popup-actions">
        <button id="username-save" type="button">Save</button>
        <button id="username-close" type="button">Close</button>
      </div>
    </div>`;
  document.body.appendChild(popup);
  const input = popup.querySelector("#username-input");
  const anonymous = popup.querySelector("#username-anonymous");

  function refreshText() {
    const text = USERNAME_UI_TEXTS[getStoredLang()] || USERNAME_UI_TEXTS.en;
    const username = getStoredUsername();
    badge.textContent = username || text.empty;
    popup.querySelector("#username-popup-title").textContent = text.title;
    popup.querySelector("#username-name-label").textContent = text.label;
    popup.querySelector("#username-anonymous-label").textContent = text.anonymous;
    popup.querySelector("#username-save").textContent = text.save;
    popup.querySelector("#username-close").textContent = text.close;
  }

  function closePopup() {
    popup.classList.add("hidden");
  }

  badge.addEventListener("click", () => {
    input.value = getStoredUsername();
    anonymous.checked = !input.value;
    input.disabled = anonymous.checked;
    popup.classList.remove("hidden");
    if (!anonymous.checked) input.focus();
  });
  anonymous.addEventListener("change", () => {
    input.disabled = anonymous.checked;
    if (!anonymous.checked) input.focus();
  });
  popup.querySelector("#username-save").addEventListener("click", () => {
    const value = input.value.trim();
    if (anonymous.checked) localStorage.removeItem(USERNAME_STORAGE_KEY);
    else if (value) localStorage.setItem(USERNAME_STORAGE_KEY, value);
    else return;
    refreshText();
    closePopup();
  });
  popup.querySelector("#username-close").addEventListener("click", closePopup);
  popup.addEventListener("click", (event) => {
    if (event.target === popup) closePopup();
  });
  window.refreshUsernameUi = refreshText;
  refreshText();
}

setupUsernameBadge();
setupAdminModeToggle();

function getNested(obj, path) {
  return path.split(".").reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
}

function getTranslation(path) {
  const lang = getStoredLang();
  const t = window.TRANSLATIONS && (window.TRANSLATIONS[lang] || window.TRANSLATIONS.en);
  const val = t ? getNested(t, path) : null;
  return val != null ? val : path;
}

function formatTranslation(path, vars) {
  let text = getTranslation(path);
  if (!vars) return text;
  Object.keys(vars).forEach((key) => {
    text = String(text).split("{" + key + "}").join(String(vars[key]));
  });
  return text;
}

function formatAuthorshipTimeValue(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatFirstCreatedBy(entry) {
  return formatTranslation("common.firstCreatedBy", {
    name: (entry && entry.createdBy) || ANONYMOUS_NAME,
    time: formatAuthorshipTimeValue(entry && entry.createdAt),
  });
}

function formatLastEditedBy(entry) {
  return formatTranslation("common.lastEditedBy", {
    name: (entry && (entry.lastEditedBy || entry.createdBy)) || ANONYMOUS_NAME,
    time: formatAuthorshipTimeValue(entry && (entry.lastEditedAt || entry.createdAt)),
  });
}

function formatCreatedByLine(name, time) {
  if (time) {
    return formatTranslation("common.createdByAt", {
      name: name || ANONYMOUS_NAME,
      time,
    });
  }
  return formatTranslation("common.createdBy", { name: name || ANONYMOUS_NAME });
}

window.getStoredLang = getStoredLang;
window.getTranslation = getTranslation;
window.formatTranslation = formatTranslation;

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
  document.querySelectorAll("[data-i18n-title]").forEach((el) => {
    const val = getNested(t, el.getAttribute("data-i18n-title"));
    if (val != null) {
      el.title = val;
      if (el.hasAttribute("aria-label")) el.setAttribute("aria-label", val);
    }
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

/** Category rows from the Manual layout: head symbol + 12 cells each. */
function getSymbolCategoryRows() {
  const layout = (typeof symbolGridLayout !== "undefined" && Array.isArray(symbolGridLayout))
    ? symbolGridLayout
    : [];
  return layout.map((row, index) => {
    const cells = Array.isArray(row) ? row.slice(0, 12) : [];
    while (cells.length < 12) cells.push(null);
    const headId = cells.find((id) => id != null) || null;
    return { index, headId, cells };
  }).filter((row) => row.headId != null);
}

/**
 * Key Mode board: top = open category's 12 cells, bottom = other category heads (12).
 * Returns { topIds, bottomHeads: [{ id, categoryIndex }], openIndex }.
 */
function buildKeyModeBoard(openCategoryIndex) {
  const rows = getSymbolCategoryRows();
  if (!rows.length) return { topIds: [], bottomHeads: [], openIndex: 0 };
  const safeIndex = Math.max(0, Math.min(Number(openCategoryIndex) || 0, rows.length - 1));
  const open = rows[safeIndex];
  const bottomHeads = rows
    .filter((row) => row.index !== open.index)
    .map((row) => ({ id: row.headId, categoryIndex: row.index }));
  return {
    topIds: open.cells.slice(),
    bottomHeads,
    openIndex: open.index,
  };
}

function normalizeDictionaryWord(w) {
  return (w || "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu, "");
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
  if (Array.isArray(entry.stampSymbols)) return entry.stampSymbols;
  if (entry.categories && Array.isArray(entry.categories.is)) return entry.categories.is.slice(0, 4);
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

function createEntryCompactStamp(entry) {
  const stamp = document.createElement("div");
  stamp.className = "entry-compact-stamp";
  const refs = getSymbolsForEntry(entry).slice(0, 4).filter((ref) => ref && (ref.id != null || ref.image || ref.rgb));
  if (refs.length === 1) stamp.classList.add("is-single");
  else if (refs.length === 2) stamp.classList.add("is-pair");
  else if (refs.length === 3) stamp.classList.add("is-triple");
  refs.forEach((ref) => {
    const sym = typeof symbols !== "undefined" && symbols.find((s) => String(s.id) === String(ref.id));
    const visualRef = sym
      ? { id: sym.id, name: sym.name, image: sym.image, rgb: sym.rgb }
      : ref;
    const box = document.createElement("div");
    box.className = "compact-stamp-symbol";
    const name = sym ? getSymbolName(sym) : (ref.name || "");
    box.title = name;
    box.appendChild(createSymbolVisual(visualRef, name));
    stamp.appendChild(box);
  });
  return stamp;
}

function exportSymbolDrawingDataUrl(canvas) {
  if (!canvas) return "";
  const src = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
  const outCanvas = document.createElement("canvas");
  outCanvas.width = 128;
  outCanvas.height = 128;
  const outCtx = outCanvas.getContext("2d");
  const imageData = outCtx.createImageData(128, 128);
  for (let i = 0; i < src.data.length; i += 4) {
    if (src.data[i + 3] > 8) {
      imageData.data[i] = 0;
      imageData.data[i + 1] = 0;
      imageData.data[i + 2] = 0;
      imageData.data[i + 3] = 255;
    }
  }
  outCtx.putImageData(imageData, 0, 0);
  return outCanvas.toDataURL("image/png");
}

function symbolDrawCanvasHasInk(canvas) {
  if (!canvas) return false;
  const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 8) return true;
  }
  return false;
}

function addCustomImageToSymbol(sym, dataUrl) {
  if (!sym || sym.id == null || !dataUrl) return null;
  const cfg = getCustomImageConfigForSymbolId(sym.id);
  cfg.customImages.push(dataUrl);
  cfg.selected = cfg.customImages.length;
  const map = getStoredCustomSymbolImages();
  map[String(sym.id)] = {
    selected: cfg.selected,
    customImages: cfg.customImages.slice(),
  };
  saveStoredCustomSymbolImages(map);
  return cfg;
}

const SYMBOL_DRAW_BRUSH_SIZE = 4;

function bindSymbolDrawCanvas(canvas) {
  let drawing = false;
  let lastPoint = null;
  let strokeStarted = false;
  const undoStack = [];

  function getCtx() {
    return canvas ? canvas.getContext("2d") : null;
  }

  function snapshotCanvas() {
    const ctx = getCtx();
    if (!ctx || !canvas) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  function restoreSnapshot(imageData) {
    const ctx = getCtx();
    if (!ctx || !imageData) return;
    ctx.putImageData(imageData, 0, 0);
  }

  function getCanvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const clientX = event.touches ? event.touches[0].clientX : event.clientX;
    const clientY = event.touches ? event.touches[0].clientY : event.clientY;
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function strokeTo(point) {
    const ctx = getCtx();
    if (!ctx || !point) return;
    const size = SYMBOL_DRAW_BRUSH_SIZE;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#000";
    ctx.lineWidth = size;
    if (!lastPoint) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPoint = point;
  }

  function clearCanvas() {
    const ctx = getCtx();
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    undoStack.length = 0;
    lastPoint = null;
    strokeStarted = false;
  }

  function undoLastStroke() {
    if (!undoStack.length) return false;
    const snapshot = undoStack.pop();
    restoreSnapshot(snapshot);
    lastPoint = null;
    strokeStarted = false;
    return true;
  }

  const startDraw = (event) => {
    event.preventDefault();
    if (!strokeStarted) {
      const snap = snapshotCanvas();
      if (snap) undoStack.push(snap);
      strokeStarted = true;
    }
    drawing = true;
    lastPoint = null;
    strokeTo(getCanvasPoint(event));
  };
  const moveDraw = (event) => {
    if (!drawing) return;
    event.preventDefault();
    strokeTo(getCanvasPoint(event));
  };
  const endDraw = () => {
    drawing = false;
    lastPoint = null;
    strokeStarted = false;
  };

  const onKeyDown = (event) => {
    if (!canvas || !canvas.isConnected) return;
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey) return;
    if (event.key.toLowerCase() !== "z") return;
    if (undoLastStroke()) event.preventDefault();
  };

  canvas.addEventListener("mousedown", startDraw);
  canvas.addEventListener("mousemove", moveDraw);
  window.addEventListener("mouseup", endDraw);
  canvas.addEventListener("touchstart", startDraw, { passive: false });
  canvas.addEventListener("touchmove", moveDraw, { passive: false });
  canvas.addEventListener("touchend", endDraw);
  canvas.addEventListener("touchcancel", endDraw);
  document.addEventListener("keydown", onKeyDown);

  return {
    clearCanvas,
    undoLastStroke,
    hasInk: () => symbolDrawCanvasHasInk(canvas),
    exportDataUrl: () => exportSymbolDrawingDataUrl(canvas),
    destroy: () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("mouseup", endDraw);
    },
  };
}

const WORLD_ORIGIN_TO_LANG = {
  English: "en",
  Chinese: "zh",
  Spanish: "es",
  French: "fr",
  Russian: "ru",
  German: "de",
  Japanese: "ja",
};

const LANG_TO_WORLD_ORIGIN = {
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  fr: "French",
  ru: "Russian",
  de: "German",
  ja: "Japanese",
};

/** Non-English languages in the canonical cross-pair list order (Chinese → … → Japanese). */
const CROSS_PAIR_LANG_ORDER = ["zh", "es", "fr", "de", "ru", "ja"];

/** The 15 non-English↔non-English dictionaries, in Spanish-UI listing order after Spanish-English. */
const CROSS_DICTIONARY_PAIRS = [
  ["zh", "es"],
  ["zh", "fr"],
  ["zh", "de"],
  ["zh", "ru"],
  ["zh", "ja"],
  ["es", "fr"],
  ["es", "de"],
  ["es", "ru"],
  ["es", "ja"],
  ["fr", "de"],
  ["fr", "ru"],
  ["fr", "ja"],
  ["de", "ru"],
  ["de", "ja"],
  ["ru", "ja"],
];

function getWorldOriginNameFromCode(langCode) {
  return LANG_TO_WORLD_ORIGIN[langCode] || "";
}

function makeEnglishHubPairId(langCode) {
  if (!langCode || langCode === "en") return "";
  return langCode + "-en";
}

/** Foreign language for an English-hub local entry (es for apple↔manzana). */
function getEntryForeignHubLang(entry) {
  if (!entry || entry.isCore) return "";
  const origin = entry.originLanguage || entry.translationSource || "en";
  if (origin && origin !== "en") return origin;
  if (entry.translationLanguage && entry.translationLanguage !== "en") return entry.translationLanguage;
  const keys = Object.keys(entry.translations || {}).filter((code) => code !== "en");
  return keys[0] || "";
}

/** Pair id for dictionary filters: foreign↔English, including English-origin locals. */
function getEntryEnglishHubPairId(entry) {
  return makeEnglishHubPairId(getEntryForeignHubLang(entry));
}

/** Match key so Language↔English and English↔Language cover the same world row. */
function getEntryEnglishHubMatchKey(entry) {
  const foreign = getEntryForeignHubLang(entry);
  if (!foreign) return "";
  const english = normalizeDictionaryWord((entry.translations && entry.translations.en) || entry.definition || "");
  const translation = normalizeDictionaryWord((entry.translations && entry.translations[foreign]) || "");
  if (!english || !translation) return "";
  return foreign + "\0" + english + "\0" + translation;
}

function getWorldLineEnglishHubMatchKey(line) {
  const parts = String(line || "").split("\t");
  if (parts.length < 8) return "";
  const originCode = WORLD_ORIGIN_TO_LANG[parts[7]] || "";
  if (!originCode || originCode === "en") return "";
  const english = normalizeDictionaryWord(parts[0] || "");
  const translation = normalizeDictionaryWord(parts[1] || "");
  if (!english || !translation) return "";
  return originCode + "\0" + english + "\0" + translation;
}

function makeCrossPairId(langA, langB) {
  const order = CROSS_PAIR_LANG_ORDER;
  const ia = order.indexOf(langA);
  const ib = order.indexOf(langB);
  if (ia < 0 || ib < 0 || ia === ib) return "";
  return ia < ib ? langA + "-" + langB : langB + "-" + langA;
}

function parsePairId(pairId) {
  const parts = String(pairId || "").split("-");
  if (parts.length !== 2) return null;
  const a = parts[0];
  const b = parts[1];
  if (!LANGUAGES[a] || !LANGUAGES[b] || a === b) return null;
  return { a, b };
}

function isEnglishHubPairId(pairId) {
  const parsed = parsePairId(pairId);
  return !!(parsed && (parsed.a === "en" || parsed.b === "en"));
}

function isCrossPairId(pairId) {
  const parsed = parsePairId(pairId);
  return !!(parsed && parsed.a !== "en" && parsed.b !== "en");
}

function getPairDisplayLangs(pairId, uiLang) {
  const parsed = parsePairId(pairId);
  if (!parsed) return null;
  if (parsed.a === "en" || parsed.b === "en") {
    const other = parsed.a === "en" ? parsed.b : parsed.a;
    if (uiLang === "en") {
      return { wordLang: "en", translationLang: other, a: parsed.a, b: parsed.b };
    }
    // Non-English UI: foreign side is the word, English is the translation.
    return { wordLang: other, translationLang: "en", a: parsed.a, b: parsed.b };
  }
  if (uiLang && (parsed.a === uiLang || parsed.b === uiLang)) {
    return {
      wordLang: uiLang,
      translationLang: parsed.a === uiLang ? parsed.b : parsed.a,
      a: parsed.a,
      b: parsed.b,
    };
  }
  return { wordLang: parsed.a, translationLang: parsed.b, a: parsed.a, b: parsed.b };
}

function formatLanguagePairLabel(pairId, uiLang) {
  const display = getPairDisplayLangs(pairId, uiLang);
  if (!display) return pairId || "";
  const left = LANGUAGES[display.wordLang] || display.wordLang;
  const right = LANGUAGES[display.translationLang] || display.translationLang;
  return left + "-" + right;
}

function getOrderedDictionaryPairIds(uiLang) {
  const lang = LANGUAGES[uiLang] ? uiLang : "en";
  const pairs = [];
  const seen = new Set();
  function pushPair(id) {
    if (!id || seen.has(id)) return;
    seen.add(id);
    pairs.push(id);
  }

  if (lang === "en") {
    CROSS_PAIR_LANG_ORDER.forEach((code) => pushPair(makeEnglishHubPairId(code)));
  } else {
    pushPair(makeEnglishHubPairId(lang));
  }

  CROSS_DICTIONARY_PAIRS.forEach(([a, b]) => pushPair(makeCrossPairId(a, b)));

  if (lang !== "en") {
    CROSS_PAIR_LANG_ORDER.forEach((code) => {
      if (code === lang) return;
      pushPair(makeEnglishHubPairId(code));
    });
  }

  return pairs;
}

function getAllDictionaryPairIds() {
  const pairs = [];
  const seen = new Set();
  CROSS_PAIR_LANG_ORDER.forEach((code) => {
    const id = makeEnglishHubPairId(code);
    if (!seen.has(id)) {
      seen.add(id);
      pairs.push(id);
    }
  });
  CROSS_DICTIONARY_PAIRS.forEach(([a, b]) => {
    const id = makeCrossPairId(a, b);
    if (id && !seen.has(id)) {
      seen.add(id);
      pairs.push(id);
    }
  });
  return pairs;
}

/** Default Dictionary language filters for the current UI language. */
function getDefaultDictionaryPairIdsForUiLang(uiLang) {
  const lang = LANGUAGES[uiLang] ? uiLang : "en";
  if (lang === "en") {
    return CROSS_PAIR_LANG_ORDER.map((code) => makeEnglishHubPairId(code));
  }
  const pairs = [];
  const seen = new Set();
  function pushPair(id) {
    if (!id || seen.has(id)) return;
    seen.add(id);
    pairs.push(id);
  }
  // UI language ↔ English, then UI language ↔ every other language.
  pushPair(makeEnglishHubPairId(lang));
  CROSS_DICTIONARY_PAIRS.forEach(([a, b]) => {
    if (a === lang || b === lang) pushPair(makeCrossPairId(a, b));
  });
  return pairs;
}

function normalizeDictionaryPos(pos) {
  return String(pos || "").split(",")[0].trim().toLocaleLowerCase("en");
}

/** Split translation/pronunciation lists like "a, b, c" into separate sense alternatives. */
function splitDictionaryAlternatives(text) {
  return String(text || "")
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function getAlignedAlternative(list, index, fallback) {
  if (!list.length) return fallback || "";
  if (index >= 0 && index < list.length) return list[index];
  return list.length === 1 ? list[0] : (fallback || "");
}

let sharedEnglishHubIndex = null;
let sharedCrossPairCache = {};
let sharedHomographIndex = null;
let sharedManualHomographIndex = null;

/** Map POS labels onto a small set so い-adjective and Adjective count as one. */
function normalizeHomographPosClasses(posField) {
  const classes = new Set();
  String(posField || "")
    .split(/\s*[,&/]\s*/)
    .map((part) => part.trim().toLocaleLowerCase("en"))
    .filter(Boolean)
    .forEach((part) => {
      if (part === "noun" || part === "proper noun" || part.indexOf("noun") >= 0) classes.add("Noun");
      else if (part.indexOf("verb") >= 0 || part === "suru verb") classes.add("Verb");
      else if (part.indexOf("adj") >= 0 || part === "pre-noun adjectival") classes.add("Adjective");
      else if (part.indexOf("adv") >= 0) classes.add("Adverb");
      else if (part.indexOf("prep") >= 0) classes.add("Preposition");
      else if (part.indexOf("conj") >= 0) classes.add("Conjunction");
      else if (part.indexOf("pron") >= 0) classes.add("Pronoun");
      else if (part === "interjection") classes.add("Interjection");
      else if (part === "article" || part === "determiner") classes.add("Determiner");
      else if (part === "numeral" || part === "number") classes.add("Number");
    });
  return classes;
}

/**
 * Homographs per language (same spelling, different meanings).
 * Foreign: same translation → 2+ English glosses.
 * English: 2+ core POS classes, or 2+ languages each with 2+ distinct translations.
 */
function createHomographIndexBuilder() {
  const byLang = {};
  Object.keys(LANGUAGES).forEach((code) => {
    byLang[code] = new Set();
  });
  const foreignToEnglish = {};
  const englishPos = new Map();
  const englishLangTranslations = new Map();
  CROSS_PAIR_LANG_ORDER.forEach((code) => {
    foreignToEnglish[code] = new Map();
  });
  return { byLang, foreignToEnglish, englishPos, englishLangTranslations };
}

function ingestHomographIndexRow(builder, line) {
  const parts = String(line || "").split("\t");
  if (parts.length < 8) return;
  const langCode = WORLD_ORIGIN_TO_LANG[parts[7] || ""];
  if (!langCode || langCode === "en") return;
  const english = parts[0] || "";
  const fullTranslation = parts[1] || "";
  if (isEnglishPlaceholderTranslation(english, fullTranslation)) return;
  const englishNorm = normalizeDictionaryWord(english);
  if (!englishNorm) return;

  if (!builder.englishPos.has(englishNorm)) builder.englishPos.set(englishNorm, new Set());
  normalizeHomographPosClasses(parts[5] || "").forEach((cls) => builder.englishPos.get(englishNorm).add(cls));
  if (!builder.englishLangTranslations.has(englishNorm)) builder.englishLangTranslations.set(englishNorm, new Map());
  const langMap = builder.englishLangTranslations.get(englishNorm);
  if (!langMap.has(langCode)) langMap.set(langCode, new Set());
  const trSet = langMap.get(langCode);

  const alts = splitDictionaryAlternatives(fullTranslation);
  (alts.length ? alts : [fullTranslation]).forEach((alt) => {
    if (isEnglishPlaceholderTranslation(english, alt)) return;
    const trNorm = normalizeDictionaryWord(alt);
    if (!trNorm) return;
    trSet.add(trNorm);
    const enMap = builder.foreignToEnglish[langCode];
    if (!enMap.has(trNorm)) enMap.set(trNorm, new Set());
    enMap.get(trNorm).add(englishNorm);
  });
}

function finalizeHomographIndexBuilder(builder) {
  Object.keys(builder.foreignToEnglish).forEach((langCode) => {
    builder.foreignToEnglish[langCode].forEach((englishSet, trNorm) => {
      if (englishSet.size >= 2) builder.byLang[langCode].add(trNorm);
    });
  });
  builder.englishPos.forEach((posSet, englishNorm) => {
    if (posSet.size >= 2) {
      builder.byLang.en.add(englishNorm);
      return;
    }
    const langMap = builder.englishLangTranslations.get(englishNorm);
    if (!langMap) return;
    let multiLangs = 0;
    langMap.forEach((trs) => {
      if (trs.size >= 2) multiLangs += 1;
    });
    if (multiLangs >= 2) builder.byLang.en.add(englishNorm);
  });
  return { byLang: builder.byLang };
}

function getSharedHomographIndex() {
  if (sharedHomographIndex) return sharedHomographIndex;
  const builder = createHomographIndexBuilder();
  const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
  rows.forEach((line) => ingestHomographIndexRow(builder, line));
  sharedHomographIndex = finalizeHomographIndexBuilder(builder);
  return sharedHomographIndex;
}

async function buildSharedHomographIndexAsync(onStageProgress, yieldFn) {
  if (sharedHomographIndex) return sharedHomographIndex;
  const builder = createHomographIndexBuilder();
  const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
  const chunkSize = 4500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, rows.length);
    for (let j = i; j < end; j++) ingestHomographIndexRow(builder, rows[j]);
    if (onStageProgress) onStageProgress(Math.round((end / rows.length) * 100));
    if (yieldFn) await yieldFn();
  }
  sharedHomographIndex = finalizeHomographIndexBuilder(builder);
  return sharedHomographIndex;
}

function invalidateManualHomographIndex() {
  sharedManualHomographIndex = null;
}

/** Manual Homograph flags from Create/Edit: true marks, false clears auto stars. */
function getManualHomographIndex() {
  if (sharedManualHomographIndex) return sharedManualHomographIndex;
  const byLangTrue = {};
  const byLangFalse = {};
  Object.keys(LANGUAGES).forEach((code) => {
    byLangTrue[code] = new Set();
    byLangFalse[code] = new Set();
  });
  let entries = [];
  try {
    entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
  } catch {
    entries = [];
  }
  if (!Array.isArray(entries)) entries = [];
  entries.forEach((entry) => {
    if (!entry || entry.isCore || !entry.homographs || typeof entry.homographs !== "object") return;
    const translations = entry.translations || {};
    Object.keys(entry.homographs).forEach((lang) => {
      if (!LANGUAGES[lang]) return;
      const surface = translations[lang] || (lang === "en" ? (entry.definition || "") : "");
      const wordNorm = normalizeDictionaryWord(surface);
      if (!wordNorm) return;
      if (entry.homographs[lang]) {
        byLangTrue[lang].add(wordNorm);
        byLangFalse[lang].delete(wordNorm);
      } else {
        byLangFalse[lang].add(wordNorm);
        byLangTrue[lang].delete(wordNorm);
      }
    });
  });
  sharedManualHomographIndex = { byLangTrue, byLangFalse };
  return sharedManualHomographIndex;
}

function isHomographWord(word, lang) {
  if (!word || !lang || !LANGUAGES[lang]) return false;
  const wordNorm = normalizeDictionaryWord(word);
  if (!wordNorm) return false;
  const manual = getManualHomographIndex();
  if (manual.byLangFalse[lang] && manual.byLangFalse[lang].has(wordNorm)) return false;
  if (manual.byLangTrue[lang] && manual.byLangTrue[lang].has(wordNorm)) return true;
  const index = getSharedHomographIndex();
  const set = index.byLang[lang];
  return !!(set && set.has(wordNorm));
}

/** Auto detection only (ignores Create/Edit overrides) — used to seed editor stars. */
function isAutoHomographWord(word, lang) {
  if (!word || !lang || !LANGUAGES[lang]) return false;
  const index = getSharedHomographIndex();
  const set = index.byLang[lang];
  return !!(set && set.has(normalizeDictionaryWord(word)));
}

/** True if this surface or any comma-alternative is a Homograph in lang. */
function isHomographWordOrAlt(text, lang) {
  if (!text || !lang) return false;
  if (isHomographWord(text, lang)) return true;
  return splitDictionaryAlternatives(text).some((alt) => isHomographWord(alt, lang));
}

/**
 * Entries with one or two Homograph stars must never receive Play autofill.
 * Star on English and/or the foreign side both block.
 */
function playEntryHasHomographStar(entry) {
  if (!entry || entry.isCore) return false;
  const translations = entry.translations || {};
  const english = translations.en || entry.definition || "";
  if (isHomographWordOrAlt(english, "en")) return true;
  const foreign = getEntryForeignHubLang(entry);
  if (foreign && isHomographWordOrAlt(translations[foreign] || "", foreign)) return true;
  const origin = entry.originLanguage || entry.translationSource || "en";
  if (origin && origin !== "en" && isHomographWordOrAlt(translations[origin] || "", origin)) return true;
  return false;
}

function playTargetSurfaceIsHomograph(entry) {
  return playEntryHasHomographStar(entry);
}

function isEnglishPlaceholderTranslation(english, translation) {
  const en = String(english || "").normalize("NFKC").trim().toLocaleLowerCase("en");
  const tr = String(translation || "").normalize("NFKC").trim().toLocaleLowerCase("en");
  return !!(en && tr && en === tr);
}

function pruneEnglishPlaceholderRecords(records) {
  const list = Array.isArray(records) ? records : [];
  if (list.length < 2) return list;
  const kept = list.filter((rec) => !isEnglishPlaceholderTranslation(rec.english, rec.translation));
  return kept.length ? kept : list;
}

function createEnglishHubIndexBuilder() {
  const byLangEnglish = new Map();
  const byLangTranslation = new Map();
  CROSS_PAIR_LANG_ORDER.forEach((code) => {
    byLangEnglish.set(code, new Map());
    byLangTranslation.set(code, new Map());
  });
  return { byLangEnglish, byLangTranslation };
}

function ingestEnglishHubIndexRow(builder, line) {
  const parts = String(line || "").split("\t");
  if (parts.length < 8) return;
  const origin = parts[7] || "";
  const langCode = WORLD_ORIGIN_TO_LANG[origin];
  if (!langCode || langCode === "en") return;
  const english = parts[0] || "";
  const fullTranslation = parts[1] || "";
  const englishNorm = (english || "").normalize("NFKC").trim().toLocaleLowerCase("en");
  if (!englishNorm) return;
  const translationAlts = splitDictionaryAlternatives(fullTranslation);
  const alts = translationAlts.length ? translationAlts : [fullTranslation];
  const pinyins = splitDictionaryAlternatives(parts[2] || "");
  const hiraganas = splitDictionaryAlternatives(parts[3] || "");
  const latins = splitDictionaryAlternatives(parts[4] || "");

  alts.forEach((alt, altIndex) => {
    const record = {
      english,
      translation: alt,
      fullTranslation,
      altIndex,
      pinyin: getAlignedAlternative(pinyins, altIndex, parts[2] || ""),
      hiragana: getAlignedAlternative(hiraganas, altIndex, parts[3] || ""),
      latin: getAlignedAlternative(latins, altIndex, parts[4] || ""),
      pos: parts[5] || "",
      stamp: parts[6] || "[]",
      origin,
      langCode,
      worldLine: line,
    };
    const engMap = builder.byLangEnglish.get(langCode);
    if (engMap) {
      if (!engMap.has(englishNorm)) engMap.set(englishNorm, []);
      const bucket = engMap.get(englishNorm);
      if (bucket.length < 40) bucket.push(record);
    }
    const translationNorm = (alt || "").normalize("NFKC").trim().toLocaleLowerCase(langCode);
    if (translationNorm) {
      const trMap = builder.byLangTranslation.get(langCode);
      if (trMap) {
        if (!trMap.has(translationNorm)) trMap.set(translationNorm, []);
        const bucket = trMap.get(translationNorm);
        if (bucket.length < 40) bucket.push(record);
      }
    }
  });
}

function finalizeEnglishHubIndexBuilder(builder) {
  builder.byLangEnglish.forEach((engMap) => {
    engMap.forEach((bucket, englishNorm) => {
      engMap.set(englishNorm, pruneEnglishPlaceholderRecords(bucket));
    });
  });
  builder.byLangTranslation.forEach((trMap) => {
    trMap.forEach((bucket, translationNorm) => {
      trMap.set(translationNorm, pruneEnglishPlaceholderRecords(bucket));
    });
  });
  return {
    byLangEnglish: builder.byLangEnglish,
    byLangTranslation: builder.byLangTranslation,
  };
}

function getSharedEnglishHubIndex() {
  if (sharedEnglishHubIndex) return sharedEnglishHubIndex;
  const builder = createEnglishHubIndexBuilder();
  const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
  rows.forEach((line) => ingestEnglishHubIndexRow(builder, line));
  sharedEnglishHubIndex = finalizeEnglishHubIndexBuilder(builder);
  return sharedEnglishHubIndex;
}

async function buildSharedEnglishHubIndexAsync(onStageProgress, yieldFn) {
  if (sharedEnglishHubIndex) return sharedEnglishHubIndex;
  const builder = createEnglishHubIndexBuilder();
  const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
  const chunkSize = 4500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, rows.length);
    for (let j = i; j < end; j++) ingestEnglishHubIndexRow(builder, rows[j]);
    if (onStageProgress) onStageProgress(Math.round((end / rows.length) * 100));
    if (yieldFn) await yieldFn();
  }
  sharedEnglishHubIndex = finalizeEnglishHubIndexBuilder(builder);
  return sharedEnglishHubIndex;
}

function encodeCrossWorldLine(entry) {
  // Synthetic stable id used by Write overrides / editors.
  return [
    "CROSS",
    entry.pairId || "",
    entry.english || "",
    entry.word || "",
    entry.translation || "",
    entry.wordLang || "",
    entry.translationLang || "",
    entry.pos || "",
    entry.wordPronunciation || "",
    entry.translationPronunciation || "",
    entry.stamp || "[]",
  ].join("\t");
}

function decodeCrossWorldLine(line) {
  const parts = String(line || "").split("\t");
  if (parts[0] !== "CROSS" || parts.length < 11) return null;
  return {
    type: "cross",
    pairId: parts[1],
    english: parts[2],
    word: parts[3],
    translation: parts[4],
    wordLang: parts[5],
    translationLang: parts[6],
    pos: parts[7],
    wordPronunciation: parts[8],
    translationPronunciation: parts[9],
    stamp: parts[10] || "[]",
    worldLine: line,
    isWorld: true,
    isCross: true,
  };
}

function makeCrossEntry(left, right, pairId, wordLang, translationLang) {
  const wordRec = wordLang === left.langCode ? left : right;
  const transRec = translationLang === left.langCode ? left : right;
  const pronunciationFor = (rec, lang) => {
    if (lang === "zh") return rec.pinyin || "";
    if (lang === "ja") return rec.hiragana || "";
    if (lang === "ru") return rec.latin || "";
    return "";
  };
  const entry = {
    type: "cross",
    pairId,
    english: left.english || right.english || "",
    word: wordRec.translation || "",
    translation: transRec.translation || "",
    wordLang,
    translationLang,
    pos: wordRec.pos || transRec.pos || "",
    wordPronunciation: pronunciationFor(wordRec, wordLang),
    translationPronunciation: pronunciationFor(transRec, translationLang),
    stamp: wordRec.stamp || transRec.stamp || "[]",
    leftLine: left.worldLine,
    rightLine: right.worldLine,
    isWorld: true,
    isCross: true,
  };
  entry.worldLine = encodeCrossWorldLine(entry);
  entry.originLabel = formatLanguagePairLabel(pairId, wordLang);
  return entry;
}

function buildCrossPairEntries(pairId) {
  if (sharedCrossPairCache[pairId]) return sharedCrossPairCache[pairId];
  const parsed = parsePairId(pairId);
  if (!parsed || parsed.a === "en" || parsed.b === "en") {
    sharedCrossPairCache[pairId] = [];
    return sharedCrossPairCache[pairId];
  }
  const index = getSharedEnglishHubIndex();
  const mapA = index.byLangEnglish.get(parsed.a);
  const mapB = index.byLangEnglish.get(parsed.b);
  const entries = [];
  if (!mapA || !mapB) {
    sharedCrossPairCache[pairId] = entries;
    return entries;
  }

  mapA.forEach((rowsA, englishNorm) => {
    const rowsB = mapB.get(englishNorm);
    if (!rowsB || !rowsB.length) return;
    const samePos = [];
    const otherPos = [];
    rowsA.forEach((left) => {
      rowsB.forEach((right) => {
        const leftPos = normalizeDictionaryPos(left.pos);
        const rightPos = normalizeDictionaryPos(right.pos);
        const item = { left, right };
        if (leftPos && rightPos && leftPos === rightPos) samePos.push(item);
        else otherPos.push(item);
      });
    });
    const chosen = samePos.length ? samePos : otherPos;
    // Cap combinations per English gloss to keep Dictionary/Write responsive.
    chosen.slice(0, 24).forEach(({ left, right }) => {
      entries.push(makeCrossEntry(left, right, pairId, parsed.a, parsed.b));
    });
  });

  sharedCrossPairCache[pairId] = entries;
  return entries;
}

function getCrossEntriesForDisplay(pairId, uiLang) {
  const base = buildCrossPairEntries(pairId);
  const display = getPairDisplayLangs(pairId, uiLang);
  if (!display) return base.slice();
  return base.map((entry) => {
    if (entry.wordLang === display.wordLang) {
      return Object.assign({}, entry, {
        originLabel: formatLanguagePairLabel(pairId, uiLang),
      });
    }
    // Flip word/translation for UI language.
    const flipped = Object.assign({}, entry, {
      word: entry.translation,
      translation: entry.word,
      wordLang: entry.translationLang,
      translationLang: entry.wordLang,
      wordPronunciation: entry.translationPronunciation,
      translationPronunciation: entry.wordPronunciation,
      originLabel: formatLanguagePairLabel(pairId, uiLang),
    });
    flipped.worldLine = encodeCrossWorldLine(flipped);
    return flipped;
  });
}

function findCrossMatchesForWrite(token, inputLang, outputLang) {
  if (!token || !inputLang || !outputLang || inputLang === "en" || outputLang === "en" || outputLang === "universal") {
    return [];
  }
  if (inputLang === outputLang) return [];
  const pairId = makeCrossPairId(inputLang, outputLang);
  if (!pairId) return [];
  const index = getSharedEnglishHubIndex();
  const inputRows = (index.byLangTranslation.get(inputLang) || new Map()).get(token) || [];
  if (!inputRows.length) return [];
  const outMap = index.byLangEnglish.get(outputLang) || new Map();
  const matches = [];
  const seen = new Set();
  inputRows.forEach((inputRec) => {
    const englishNorm = (inputRec.english || "").normalize("NFKC").trim().toLocaleLowerCase("en");
    if (!englishNorm) return;
    const outputRows = outMap.get(englishNorm) || [];
    outputRows.forEach((outputRec) => {
      const entry = makeCrossEntry(inputRec, outputRec, pairId, inputLang, outputLang);
      // Force input language as word side for Write.
      const oriented = Object.assign({}, entry, {
        word: inputRec.translation || "",
        translation: outputRec.translation || "",
        wordLang: inputLang,
        translationLang: outputLang,
        wordPronunciation: inputLang === "zh" ? (inputRec.pinyin || "")
          : inputLang === "ja" ? (inputRec.hiragana || "")
            : inputLang === "ru" ? (inputRec.latin || "") : "",
        translationPronunciation: outputLang === "zh" ? (outputRec.pinyin || "")
          : outputLang === "ja" ? (outputRec.hiragana || "")
            : outputLang === "ru" ? (outputRec.latin || "") : "",
        pos: inputRec.pos || outputRec.pos || "",
      });
      oriented.worldLine = encodeCrossWorldLine(oriented);
      oriented.originLabel = formatLanguagePairLabel(pairId, inputLang);
      if (seen.has(oriented.worldLine)) return;
      seen.add(oriented.worldLine);
      matches.push({
        type: "world",
        status: "unstamped",
        english: oriented.english,
        translation: oriented.translation,
        word: oriented.word,
        origin: oriented.originLabel,
        partOfSpeech: oriented.pos,
        worldLine: oriented.worldLine,
        language: outputLang,
        definition: oriented.word,
        isWorld: true,
        isCross: true,
        cross: oriented,
      });
    });
  });
  return matches.slice(0, 40);
}

function getEntryStampStatus(entry) {
  if (!entry) return "unknown";
  if (entry.isCore) return "stamped";
  if (!getSymbolsForEntry(entry).length) return "unstamped";
  // Admin stamp approval is not available yet — only core words are stamped.
  if (entry.stamped === true || entry.approved === true) return "stamped";
  return "tempstamped";
}

function setupSharedDictionaryEditor(onSaved) {
  const dictionaryEditorBox = document.getElementById("dictionary-editor-box");
  const dictionaryEditorFrame = document.getElementById("dictionary-editor-frame");
  const dictionaryEditorSave = document.getElementById("dictionary-editor-save");
  const dictionaryEditorCancel = document.getElementById("dictionary-editor-cancel");
  if (!dictionaryEditorBox || !dictionaryEditorFrame) {
    return {
      openDictionaryEditor() {},
      closeDictionaryEditor() {},
    };
  }

  let dictionaryEditorPayload = null;

  function closeDictionaryEditor() {
    dictionaryEditorBox.classList.add("hidden");
    dictionaryEditorFrame.src = "about:blank";
    dictionaryEditorPayload = null;
  }

  function openDictionaryEditor(options) {
    sessionStorage.removeItem("createEditEntryId");
    sessionStorage.removeItem("createEditWorldLine");
    sessionStorage.removeItem("createEditWorldLanguage");
    if (options && options.entryId) sessionStorage.setItem("createEditEntryId", options.entryId);
    if (options && options.worldLine) sessionStorage.setItem("createEditWorldLine", options.worldLine);
    if (options && options.language) sessionStorage.setItem("createEditWorldLanguage", options.language);
    dictionaryEditorPayload = {
      type: "kanji-builder-load-editor",
      entryId: (options && options.entryId) || "",
      worldLine: (options && options.worldLine) || "",
      language: (options && options.language) || "",
    };
    dictionaryEditorFrame.src = "create.html?embed=1&opened=" + Date.now();
    dictionaryEditorBox.classList.remove("hidden");
  }

  function saveAndCloseDictionaryEditor() {
    if (!dictionaryEditorFrame.contentWindow) return;
    dictionaryEditorFrame.contentWindow.postMessage({ type: "kanji-builder-save-and-close" }, "*");
  }

  if (dictionaryEditorSave) dictionaryEditorSave.addEventListener("click", saveAndCloseDictionaryEditor);
  if (dictionaryEditorCancel) dictionaryEditorCancel.addEventListener("click", closeDictionaryEditor);
  dictionaryEditorFrame.addEventListener("load", () => {
    if (dictionaryEditorPayload && dictionaryEditorFrame.contentWindow) {
      dictionaryEditorFrame.contentWindow.postMessage(dictionaryEditorPayload, "*");
    }
  });
  dictionaryEditorBox.addEventListener("click", (event) => {
    if (event.target === dictionaryEditorBox) closeDictionaryEditor();
  });
  window.addEventListener("message", (event) => {
    if (event.source !== dictionaryEditorFrame.contentWindow) return;
    if (!event.data || event.data.type !== "kanji-builder-word-saved") return;
    if (event.data.entry && event.data.entry._entryId) {
      const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
      const index = findEntryIndexById(entries, event.data.entry._entryId);
      if (index >= 0) entries[index] = event.data.entry;
      else entries.push(event.data.entry);
      localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    }
    closeDictionaryEditor();
    if (typeof onSaved === "function") setTimeout(onSaved, 50);
  });

  return { openDictionaryEditor, closeDictionaryEditor, saveAndCloseDictionaryEditor };
}

function getEntryCategories(entry) {
  if (entry && entry.categories) {
    return {
      is: Array.isArray(entry.categories.is) ? entry.categories.is.slice() : [],
      unrelated: Array.isArray(entry.categories.unrelated) ? entry.categories.unrelated.slice() : [],
      isNot: Array.isArray(entry.categories.isNot) ? entry.categories.isNot.slice() : [],
    };
  }
  return { is: getSymbolsForEntry(entry), unrelated: [], isNot: [] };
}

function getEntrySignature(entry) {
  if (entry && entry.categories) {
    return ["is", "unrelated", "isNot"].map((category) => {
      const refs = Array.isArray(entry.categories[category]) ? entry.categories[category] : [];
      return category + ":" + refs.map((ref) => (ref && ref.id != null ? String(ref.id) : "x")).join("-");
    }).join("|");
  }
  const refs = getSymbolsForEntry(entry);
  return refs.map((r) => (r && r.id != null ? String(r.id) : "x")).join("-");
}

function triggerDownload(filename, content, mime) {
  const blob = content instanceof Blob
    ? content
    : new Blob([content], { type: mime || "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TRANSFER_WRITE_SENTENCES_KEY = "writeSentenceContexts";
const TRANSFER_COMMENTS_KEY = "kanjiBuilderComments";
const TRANSFER_PACKAGE_TYPE = "kanji-builder-transfer";
const TRANSFER_PACKAGE_VERSION = 3;

function loadTransferSentences() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRANSFER_WRITE_SENTENCES_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransferSentences(list) {
  localStorage.setItem(TRANSFER_WRITE_SENTENCES_KEY, JSON.stringify(Array.isArray(list) ? list : []));
}

function loadTransferComments() {
  try {
    const parsed = JSON.parse(localStorage.getItem(TRANSFER_COMMENTS_KEY) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransferComments(list) {
  localStorage.setItem(TRANSFER_COMMENTS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
}

function serializeTransferWord(entry) {
  if (!entry || entry.isCore) return null;
  return {
    schemaVersion: entry.schemaVersion || (entry.categories ? 2 : 1),
    definition: entry.definition || "",
    translations: entry.translations || {},
    slots: entry.slots || [],
    categories: entry.categories || null,
    stampSymbols: entry.stampSymbols || null,
    stamp: entry.stamp || null,
    tempStamp: entry.tempStamp || null,
    tempstamped: !!entry.tempstamped,
    stamped: !!entry.stamped,
    note: entry.note || "",
    isCore: false,
    translationSource: entry.translationSource || "en",
    originLanguage: entry.originLanguage || entry.translationSource || "en",
    translationLanguage: entry.translationLanguage || "",
    partOfSpeech: entry.partOfSpeech || [],
    compoundParts: entry.compoundParts || [],
    pinyin: entry.pinyin || "",
    hiragana: entry.hiragana || "",
    latinLetters: entry.latinLetters || "",
    createdBy: entry.createdBy || "",
    createdAt: entry.createdAt || "",
    lastEditedBy: entry.lastEditedBy || "",
    lastEditedAt: entry.lastEditedAt || "",
  };
}

function getTransferWordFingerprint(entry) {
  const word = entry && entry.isCore === false ? entry : serializeTransferWord(entry);
  if (!word) return "";
  return [
    getEntrySignature(word),
    word.createdBy || "",
    word.createdAt || "",
    word.lastEditedBy || "",
    word.lastEditedAt || "",
    normalizeDictionaryWord(word.definition || ""),
    JSON.stringify(word.translations || {}),
    JSON.stringify([].concat(word.partOfSpeech || [])),
    word.note || "",
    word.originLanguage || word.translationSource || "en",
    word.translationLanguage || "",
    word.pinyin || "",
    word.hiragana || "",
    word.latinLetters || "",
    JSON.stringify(word.compoundParts || []),
    word.tempstamped ? "1" : "0",
    word.stamped ? "1" : "0",
  ].join("\u0001");
}

function getTransferSentenceFingerprint(entry) {
  if (!entry) return "";
  return [
    entry.sentenceNorm || "",
    entry.inputLang || "",
    entry.outputLang || "",
    JSON.stringify(entry.overrides || {}),
    entry.createdBy || "",
    entry.createdAt || "",
    entry.lastEditedBy || "",
    entry.lastEditedAt || "",
    entry.sentenceText || "",
  ].join("\u0001");
}

function getTransferCommentFingerprint(entry) {
  if (!entry) return "";
  return [
    String(entry.text || "").trim(),
    entry.createdBy || "",
    String(entry.created || ""),
    entry.parentId == null ? "" : String(entry.parentId),
    Number(entry.score) || 0,
  ].join("\u0001");
}

function dataUrlToUint8Array(dataUrl) {
  const raw = String(dataUrl || "");
  const comma = raw.indexOf(",");
  const base64 = comma >= 0 ? raw.slice(comma + 1) : raw;
  try {
    const binary = atob(base64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return out;
  } catch {
    return new TextEncoder().encode(raw);
  }
}

async function hashImageDataUrl(dataUrl) {
  const bytes = dataUrlToUint8Array(dataUrl);
  if (window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === "function") {
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback non-crypto hash for older environments.
  let hash = 2166136261;
  for (let i = 0; i < bytes.length; i++) {
    hash ^= bytes[i];
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0") + ":" + bytes.length;
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function concatUint8(arrays) {
  const total = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  arrays.forEach((arr) => {
    out.set(arr, offset);
    offset += arr.length;
  });
  return out;
}

function buildStoreZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name.replace(/\\/g, "/"));
    const data = file.data instanceof Uint8Array ? file.data : encoder.encode(String(file.data || ""));
    const crc = crc32(data);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, data.length, true);
    localView.setUint32(22, data.length, true);
    localView.setUint16(26, nameBytes.length, true);
    localHeader.set(nameBytes, 30);
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, data.length, true);
    centralView.setUint32(24, data.length, true);
    centralView.setUint16(28, nameBytes.length, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);
    localParts.push(localHeader, data);
    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  });
  const centralDir = concatUint8(centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, files.length, true);
  endView.setUint16(10, files.length, true);
  endView.setUint32(12, centralDir.length, true);
  endView.setUint32(16, offset, true);
  return new Blob([concatUint8(localParts), centralDir, end], { type: "application/zip" });
}

function parseStoreZip(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const decoder = new TextDecoder();
  const files = {};
  let i = 0;
  while (i + 30 <= bytes.length) {
    const sig = view.getUint32(i, true);
    if (sig !== 0x04034b50) break;
    const compression = view.getUint16(i + 8, true);
    const compSize = view.getUint32(i + 18, true);
    const nameLen = view.getUint16(i + 26, true);
    const extraLen = view.getUint16(i + 28, true);
    const nameStart = i + 30;
    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;
    if (dataEnd > bytes.length) break;
    if (compression === 0) {
      files[name.replace(/\\/g, "/")] = bytes.subarray(dataStart, dataEnd);
    }
    i = dataEnd;
  }
  return files;
}

function uint8ToText(bytes) {
  return new TextDecoder().decode(bytes);
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

function ensureCoreWordsInDictionary() {
  if (typeof symbols === "undefined" || !Array.isArray(symbols) || !symbols.length) return [];
  let entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
  let changed = ensureEntryIds(entries);
  const activeSymbolIds = new Set(symbols.map((sym) => String(sym.id)));
  const retainedEntries = entries.filter((entry) => {
    if (!entry || !entry.isCore) return true;
    const refs = getSymbolsForEntry(entry);
    return refs.some((ref) => ref && activeSymbolIds.has(String(ref.id)));
  });
  if (retainedEntries.length !== entries.length) {
    entries = retainedEntries;
    changed = true;
  }
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

function getAccentGradientAxis(fadeType, w, h) {
  switch (fadeType) {
    case "WE":
      return { x0: 0, y0: 0, x1: w, y1: 0 };
    case "14":
      return { x0: 0, y0: 0, x1: w, y1: h };
    case "32":
      return { x0: 0, y0: h, x1: w, y1: 0 };
    case "NS":
    default:
      return { x0: 0, y0: 0, x1: 0, y1: h };
  }
}

function addAccentGradientStops(gradient, config, hue) {
  const normalized = normalizeUiAccentConfig(config);
  let stops = colorStopsForState(normalized.color1, hue);
  if (normalized.mode === "fade") {
    stops = stops.concat(colorStopsForState(normalized.color2, hue));
  } else if (normalized.color1.source === "rainbow") {
    stops = RAINBOW_STOPS.slice();
  }
  if (!stops.length) stops = [DEFAULT_ACCENT_HEX];
  if (stops.length === 1) {
    gradient.addColorStop(0, stops[0]);
    gradient.addColorStop(1, stops[0]);
    return;
  }
  stops.forEach((color, index) => {
    gradient.addColorStop(index / (stops.length - 1), color);
  });
}

/** Canvas fill style for UI accent (supports Plain/Fade, Unit/Screen). */
function getAccentCanvasFillStyle(ctx, width, height, anchorEl) {
  const config = normalizeUiAccentConfig(uiAccentActiveConfig || getStoredUiAccentConfig());
  const hue = uiAccentCycleHue;
  const needsGradient = config.mode === "fade" || config.color1.source === "rainbow";
  if (!needsGradient) {
    const rgb = hexToRgb(colorStateToSolidHex(config.color1, hue));
    return "rgb(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + ")";
  }

  let x0 = 0;
  let y0 = 0;
  let x1 = 0;
  let y1 = height;
  const useFadeAxis = config.mode === "fade" || config.color1.source === "rainbow";
  if (useFadeAxis && config.fadeScope === "screen" && anchorEl && typeof anchorEl.getBoundingClientRect === "function") {
    const rect = anchorEl.getBoundingClientRect();
    const vw = Math.max(window.innerWidth || 1, 1);
    const vh = Math.max(window.innerHeight || 1, 1);
    const scaleX = width / Math.max(rect.width, 1);
    const scaleY = height / Math.max(rect.height, 1);
    const axis = getAccentGradientAxis(config.fadeType, vw, vh);
    x0 = (axis.x0 - rect.left) * scaleX;
    y0 = (axis.y0 - rect.top) * scaleY;
    x1 = (axis.x1 - rect.left) * scaleX;
    y1 = (axis.y1 - rect.top) * scaleY;
  } else if (useFadeAxis) {
    const axis = getAccentGradientAxis(config.fadeType, width, height);
    x0 = axis.x0;
    y0 = axis.y0;
    x1 = axis.x1;
    y1 = axis.y1;
  }

  const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
  addAccentGradientStops(gradient, config, hue);
  return gradient;
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

      const paintTint = () => {
        const config = normalizeUiAccentConfig(uiAccentActiveConfig || getStoredUiAccentConfig());
        if (config.mode === "fade" && config.fadeScope === "screen" && !wrapper.isConnected) {
          requestAnimationFrame(paintTint);
          return;
        }
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
        ctx.fillStyle = getAccentCanvasFillStyle(ctx, w, h, wrapper);
        ctx.fillRect(0, 0, w, h);
        if (img.parentNode === wrapper) wrapper.removeChild(img);
        while (wrapper.firstChild) wrapper.removeChild(wrapper.firstChild);
        wrapper.appendChild(canvas);
      };
      requestAnimationFrame(paintTint);
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
      if (typeof window.refreshUsernameUi === "function") window.refreshUsernameUi();
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

// Local file:// pages can each remember a different browser zoom, which makes
// the shared navbar look bigger/smaller when switching tabs. Hint once.
(function setupPageZoomConsistencyHint() {
  const NOTICE_KEY = "kanjiBuilderZoomHintDismissed";
  if (localStorage.getItem(NOTICE_KEY) === "1") return;
  const main = document.querySelector("main");
  if (!main) return;

  const isFile = location.protocol === "file:";
  // Desktop Ctrl+/- zoom usually keeps visualViewport.scale at 1; still tip on file://.
  // Also tip if pinch/page scale is clearly off.
  const scale = (window.visualViewport && window.visualViewport.scale) || 1;
  if (!isFile && Math.abs(scale - 1) < 0.02) return;

  const notice = document.createElement("div");
  notice.className = "page-zoom-notice";
  notice.setAttribute("role", "status");
  notice.innerHTML = isFile
    ? "If this page looks bigger or smaller than other tabs, press <strong>Ctrl+0</strong> (⌘0 on Mac) on each page to reset browser zoom. Local HTML files store zoom separately."
    : "If this page looks bigger or smaller than other tabs, press <strong>Ctrl+0</strong> (⌘0 on Mac) to reset browser zoom.";
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "page-zoom-notice-dismiss";
  dismiss.setAttribute("aria-label", "Dismiss");
  dismiss.textContent = "×";
  dismiss.addEventListener("click", () => {
    localStorage.setItem(NOTICE_KEY, "1");
    notice.remove();
  });
  notice.appendChild(dismiss);

  const anchor = main.querySelector(".page-meta-bar") || main.firstElementChild;
  if (anchor && anchor.nextSibling) main.insertBefore(notice, anchor.nextSibling);
  else if (anchor) anchor.insertAdjacentElement("afterend", notice);
  else main.prepend(notice);
})();

// -------------------------------
// PAGE-SPECIFIC LOGIC
// -------------------------------

// Detect which page we're on
const page = document.body.dataset.page;

/* --------------------------------
   SHARED SYMBOL INFO BOX
   Used by Create, Draw, and Web pages when #symbol-info-box is present.
-------------------------------- */

let sharedSymbolInfoOnSaved = null;

function setupSharedSymbolInfoBox(onSaved) {
  const infoBox = document.getElementById("symbol-info-box");
  if (!infoBox) return;

  if (typeof onSaved === "function") {
    sharedSymbolInfoOnSaved = onSaved;
  }

  if (infoBox.dataset.sharedSetup === "1") return;
  infoBox.dataset.sharedSetup = "1";

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
  const infoImageFileBtn = document.getElementById("info-image-file-btn");
  const infoImageFileName = document.getElementById("info-image-file-name");
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

  if (closeInfoBtn) {
    closeInfoBtn.addEventListener("click", () => {
      infoBox.classList.add("hidden");
      if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
    });
  }
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
    if (infoImageFileBtn) {
      infoImageFileBtn.addEventListener("click", () => infoImageFileInput.click());
    }
    infoImageFileInput.addEventListener("change", () => {
      if (!currentInfoSymbol || !pendingImageConfig) return;
      const file = infoImageFileInput.files && infoImageFileInput.files[0];
      if (infoImageFileName) {
        infoImageFileName.textContent = file
          ? file.name
          : (getTranslation("create.noFileChosen") || "No file chosen");
      }
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result || "");
        if (!dataUrl.startsWith("data:image/")) return;
        pendingImageConfig.customImages.push(dataUrl);
        pendingImageConfig.selected = pendingImageConfig.customImages.length; // default=0, customs start at 1
        renderInfoImageSelection();
        if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
        if (infoImageFileName) {
          infoImageFileName.textContent = getTranslation("create.noFileChosen") || "No file chosen";
        }
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

  if (infoSaveBtn) {
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
      }
      if (typeof sharedSymbolInfoOnSaved === "function") sharedSymbolInfoOnSaved();
      if (typeof window.kanjiBuilderRefreshCreate === "function") window.kanjiBuilderRefreshCreate();
      if (typeof window.kanjiBuilderRefreshDictionary === "function") window.kanjiBuilderRefreshDictionary();
      if (typeof window.kanjiBuilderRefreshDraw === "function") window.kanjiBuilderRefreshDraw();
      if (typeof window.kanjiBuilderRefreshWeb === "function") window.kanjiBuilderRefreshWeb();
      if (infoImageUploadPanel) infoImageUploadPanel.classList.add("hidden");
      infoBox.classList.add("hidden");
    });
  }

  window.showSymbolInfo = showSymbolInfo;
  window.updateCreateImageUiText = updateCreateImageUiText;
  window.kanjiBuilderRefreshOpenSymbolInfo = function () {
    if (infoBox && !infoBox.classList.contains("hidden") && currentInfoSymbolId != null) {
      const sym = symbols.find((s) => s.id === currentInfoSymbolId);
      if (sym && infoImageWrap) {
        infoImageWrap.innerHTML = "";
        infoImageWrap.appendChild(createSymbolVisual(sym, getSymbolName(sym)));
      }
    }
  };
}

// Run once for create/draw/web when the HTML exists
setupSharedSymbolInfoBox();

/* --------------------------------
   CREATE PAGE
   Two main slots (left/right). Each slot: one main object + up to 2 effects (left and right of main).
   Drop on empty slot = main. Drop on main = effect (first left, second right). Left/right-click main = clear slot. Left-click effect = remove effect.
-------------------------------- */

if (page === "create") {
  const isEmbeddedEditor = new URLSearchParams(window.location.search).get("embed") === "1";
  if (isEmbeddedEditor) document.body.classList.add("create-embedded");

  const grid = document.getElementById("symbol-grid");
  const categoryElements = {
    is: document.getElementById("category-is"),
    unrelated: document.getElementById("category-unrelated"),
    isNot: document.getElementById("category-is-not"),
  };
  const categorySymbols = {
    is: [],
    unrelated: [],
    isNot: [],
  };
  let completedCategoryDrop = false;
  const modeToggle = document.getElementById("create-mode-toggle");
  const originLanguageSelect = document.getElementById("create-origin-language");
  const translationLanguageSelect = document.getElementById("create-translation-language");
  const originWordInput = document.getElementById("create-origin-word");
  const translatedWordInput = document.getElementById("create-translated-word");
  const originHomographStarBtn = document.getElementById("create-origin-homograph-star");
  const translatedHomographStarBtn = document.getElementById("create-translated-homograph-star");
  const posOptions = document.getElementById("create-pos-options");
  const originPronunciationRow = document.getElementById("create-origin-pronunciation-row");
  const originPronunciationLabel = document.getElementById("create-origin-pronunciation-label");
  const originPronunciationInput = document.getElementById("create-origin-pronunciation");
  const translatedPronunciationRow = document.getElementById("create-translated-pronunciation-row");
  const translatedPronunciationLabel = document.getElementById("create-translated-pronunciation-label");
  const translatedPronunciationInput = document.getElementById("create-translated-pronunciation");
  const compoundBuilder = document.getElementById("create-compound-builder");
  const compoundPartsContainer = document.getElementById("create-compound-parts");
  const compoundAddButton = document.getElementById("create-compound-add");
  const compoundSearchModal = document.getElementById("create-compound-search-modal");
  const compoundSearchInput = document.getElementById("create-compound-search-input");
  const compoundSearchResults = document.getElementById("create-compound-search-results");
  const compoundSearchClose = document.getElementById("create-compound-search-close");
  const dictionarySearchInput = document.getElementById("create-dictionary-search");
  const dictionaryResults = document.getElementById("create-dictionary-results");
  const editingStatus = document.getElementById("create-editing-status");
  const editingStatusText = document.getElementById("create-editing-status-text");
  const clearEditButton = document.getElementById("create-clear-edit");
  const submitBtn = document.getElementById("submit-word");
  let editingEntryId = "";
  let retrievedWorldLine = "";
  let compoundParts = [];

  setupSharedSymbolInfoBox(() => {
    buildSymbolGrid();
    renderCategories();
  });
  const showSymbolInfo = window.showSymbolInfo;

  function getSymbolExtras() {
    try {
      return JSON.parse(localStorage.getItem("symbolExtras") || "{}");
    } catch {
      return {};
    }
  }

  // imageOnly = true for category content (no label under image)
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

  function isSymbolUsed(symbolId) {
    return Object.values(categorySymbols).some((items) => items.some((symbol) => symbol.id === symbolId));
  }

  function updateUsedGridSymbols() {
    grid.querySelectorAll(".symbol-box[data-symbol-id]").forEach((box) => {
      const used = isSymbolUsed(parseInt(box.dataset.symbolId, 10));
      box.classList.toggle("symbol-used", used);
      box.setAttribute("draggable", used ? "false" : "true");
      box.setAttribute("aria-disabled", used ? "true" : "false");
    });
  }

  function removeSymbolFromCategories(symbolId) {
    Object.keys(categorySymbols).forEach((category) => {
      categorySymbols[category] = categorySymbols[category].filter((symbol) => symbol.id !== symbolId);
    });
  }

  function addSymbolToCategory(symbol, category, insertIndex) {
    if (!symbol || !categorySymbols[category]) return;
    removeSymbolFromCategories(symbol.id);
    const target = categorySymbols[category];
    const index = Number.isInteger(insertIndex) ? Math.max(0, Math.min(insertIndex, target.length)) : target.length;
    target.splice(index, 0, symbol);
    renderCategories();
  }

  function renderCategory(category) {
    const zone = categoryElements[category];
    if (!zone) return;
    const listEl = zone.querySelector(".category-symbol-list");
    const placeholder = zone.querySelector(".placeholder");
    listEl.innerHTML = "";
    categorySymbols[category].forEach((symbol, index) => {
      const item = document.createElement("div");
      item.className = "category-symbol-item";
      item.dataset.symbolId = symbol.id;
      item.dataset.category = category;
      item.dataset.index = index;
      item.setAttribute("draggable", "true");
      item.appendChild(makeSymbolBox(symbol, "category-symbol-size", true));
      item.addEventListener("dragstart", (event) => {
        completedCategoryDrop = false;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(symbol.id));
        event.dataTransfer.setData("source", "category");
        event.dataTransfer.setData("sourceCategory", category);
        event.dataTransfer.setData("sourceIndex", String(index));
      });
      item.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        completedCategoryDrop = true;
        const symbolId = parseInt(event.dataTransfer.getData("text/plain"), 10);
        const dragged = symbols.find((candidate) => candidate.id === symbolId);
        const sourceCategory = event.dataTransfer.getData("sourceCategory");
        const sourceIndex = parseInt(event.dataTransfer.getData("sourceIndex"), 10);
        const insertIndex = sourceCategory === category && sourceIndex < index ? index - 1 : index;
        addSymbolToCategory(dragged, category, insertIndex);
      });
      item.addEventListener("dragend", () => {
        if (!completedCategoryDrop) {
          removeSymbolFromCategories(symbol.id);
          renderCategories();
        }
        completedCategoryDrop = false;
      });
      item.addEventListener("click", () => {
        removeSymbolFromCategories(symbol.id);
        renderCategories();
      });
      item.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        showSymbolInfo(symbol);
      });
      listEl.appendChild(item);
    });
    placeholder.classList.toggle("hidden", categorySymbols[category].length > 0);
  }

  function renderCategories() {
    Object.keys(categorySymbols).forEach(renderCategory);
    updateUsedGridSymbols();
    const activeSearch = document.getElementById("symbol-search");
    if (activeSearch && activeSearch.value.trim()) activeSearch.dispatchEvent(new Event("input"));
  }

  const CREATE_ORIGIN_NAMES = { en: "English", zh: "Chinese", es: "Spanish", fr: "French", ru: "Russian", de: "German", ja: "Japanese" };
  const CREATE_PRONUNCIATION_FIELDS = {
    zh: { key: "pinyin", label: "Pinyin" },
    ja: { key: "hiragana", label: "Hiragana" },
    ru: { key: "latinLetters", label: "Latin" },
  };

  function splitPartsOfSpeech(value) {
    const source = Array.isArray(value) ? value : [value];
    return source.flatMap((item) => String(item || "").split(/\s*[,;/]\s*/)).map((item) => item.trim()).filter(Boolean);
  }

  function getSelectedPartsOfSpeech() {
    return Array.from(posOptions.querySelectorAll("input:checked")).map((input) => input.value);
  }

  function setSelectedPartsOfSpeech(values) {
    const selected = new Set(splitPartsOfSpeech(values));
    posOptions.querySelectorAll("input").forEach((input) => {
      input.checked = selected.has(input.value);
    });
    updateCompoundBuilderVisibility();
  }

  function buildPartOfSpeechOptions() {
    const values = new Set();
    (window.WORLD_DICTIONARY_ROWS || []).forEach((line) => {
      splitPartsOfSpeech(getCreateWorldField(line, 5)).forEach((value) => values.add(value));
    });
    values.add("Noun");
    values.delete("Compound");
    posOptions.innerHTML = "";
    Array.from(values).sort((a, b) => a.localeCompare(b)).concat("Compound").forEach((value) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = value;
      label.appendChild(input);
      label.appendChild(document.createTextNode(value));
      posOptions.appendChild(label);
    });
  }

  function isCompoundSelected() {
    const checkbox = Array.from(posOptions.querySelectorAll("input")).find((input) => input.value === "Compound");
    return !!(checkbox && checkbox.checked);
  }

  function updateCompoundBuilderVisibility() {
    compoundBuilder.classList.toggle("hidden", !isCompoundSelected());
  }

  function getCompoundPartLabel(part) {
    if (!part) return "";
    const secondary = part.translation || part.display || "";
    return part.english + (secondary && secondary !== part.english ? " — " + secondary : "");
  }

  function renderCompoundParts() {
    compoundPartsContainer.innerHTML = "";
    compoundParts.forEach((part, index) => {
      const row = document.createElement("div");
      const selected = document.createElement("div");
      const label = document.createElement("span");
      const remove = document.createElement("button");
      row.className = "create-compound-row";
      selected.className = "create-compound-selected";
      label.textContent = getCompoundPartLabel(part);
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove compound word");
      remove.addEventListener("click", () => {
        compoundParts.splice(index, 1);
        renderCompoundParts();
      });
      selected.appendChild(label);
      selected.appendChild(remove);
      row.appendChild(selected);
      compoundPartsContainer.appendChild(row);
    });
  }

  function getCompoundSearchMatches(query) {
    const normalized = normalizeCreatedWord(query, "en");
    if (!normalized) return [];
    const matches = [];
    const compoundLanguage = originLanguageSelect.value;
    const compoundOrigin = CREATE_ORIGIN_NAMES[compoundLanguage];
    ensureCoreWordsInDictionary().some((entry) => {
      const sourceLang = entry.originLanguage || entry.translationSource || "en";
      if (!entry.isCore && sourceLang !== "en" && sourceLang !== compoundLanguage) return false;
      const english = (entry.translations && entry.translations.en) || entry.definition || "";
      const display = sourceLang === "en"
        ? english
        : ((entry.translations && entry.translations[sourceLang]) || "");
      if (normalizeCreatedWord(english, "en").includes(normalized) ||
          normalizeCreatedWord(display, sourceLang).includes(normalized)) {
        const pronunciationConfig = CREATE_PRONUNCIATION_FIELDS[sourceLang];
        matches.push({
          type: "local",
          entryId: entry._entryId,
          english,
          display,
          translation: sourceLang === "en" ? "" : ((entry.translations && entry.translations[sourceLang]) || ""),
          pos: splitPartsOfSpeech(entry.partOfSpeech).join(" & "),
          origin: CREATE_ORIGIN_NAMES[sourceLang] || sourceLang,
          pronunciationLabel: pronunciationConfig ? pronunciationConfig.label : "",
          pronunciation: pronunciationConfig ? (entry[pronunciationConfig.key] || "") : "",
          symbols: getSymbolsForEntry(entry),
          signature: getEntrySignature(entry),
        });
      }
      return matches.length >= 100;
    });
    (window.WORLD_DICTIONARY_ROWS || []).some((line) => {
      if (matches.length >= 100) return true;
      const english = getCreateWorldField(line, 0);
      const translation = getCreateWorldField(line, 1);
      const rowOrigin = getCreateWorldField(line, 7);
      if (compoundLanguage !== "en" && rowOrigin !== compoundOrigin) return false;
      if (normalizeCreatedWord(english, "en").includes(normalized) ||
          normalizeCreatedWord(translation, compoundLanguage).includes(normalized)) {
        const parts = line.split("\t");
        const sourceLang = Object.keys(CREATE_ORIGIN_NAMES).find((code) => CREATE_ORIGIN_NAMES[code] === parts[7]) || "en";
        const pronunciationConfig = CREATE_PRONUNCIATION_FIELDS[sourceLang];
        const pronunciation = sourceLang === "zh" ? parts[2] : sourceLang === "ja" ? parts[3] : sourceLang === "ru" ? parts[4] : "";
        matches.push({
          type: "world",
          english,
          translation,
          origin: parts[7] || "",
          pos: splitPartsOfSpeech(parts[5]).join(" & "),
          partOfSpeech: splitPartsOfSpeech(parts[5]),
          pronunciationLabel: pronunciationConfig ? pronunciationConfig.label : "",
          pronunciation,
          symbols: [],
          pinyin: parts[2] || "",
          hiragana: parts[3] || "",
          latinLetters: parts[4] || "",
        });
      }
      return false;
    });
    return matches.slice(0, 100);
  }

  function buildCompoundSearchResult(match) {
    const button = document.createElement("button");
    const stamp = document.createElement("span");
    const fields = document.createElement("span");
    button.type = "button";
    button.className = "create-dictionary-result";
    stamp.className = "create-result-stamp";
    fields.className = "create-result-fields";
    (match.symbols || []).slice(0, 4).forEach((ref) => {
      const symbol = symbols.find((candidate) => String(candidate.id) === String(ref.id));
      const visual = document.createElement("span");
      visual.appendChild(createSymbolVisual(symbol || ref, symbol ? getSymbolName(symbol) : (ref.name || "")));
      stamp.appendChild(visual);
    });
    [
      [getTranslation("dictionary.english"), match.english],
      [getTranslation("dictionary.translation"), match.translation || match.display || ""],
      [getTranslation("dictionary.partOfSpeech"), match.pos || ""],
      [getTranslation("dictionary.originLanguage"), match.origin || ""],
      [match.pronunciationLabel || "", match.pronunciation || ""],
    ].forEach(([label, value]) => {
      if (!label && !value) return;
      const field = document.createElement("span");
      const title = document.createElement("strong");
      const content = document.createElement("span");
      field.className = "create-result-field";
      title.textContent = label;
      content.textContent = value;
      field.appendChild(title);
      field.appendChild(content);
      fields.appendChild(field);
    });
    button.appendChild(stamp);
    button.appendChild(fields);
    button.addEventListener("click", () => {
      compoundParts.push(Object.assign({}, match));
      renderCompoundParts();
      compoundSearchModal.classList.add("hidden");
    });
    return button;
  }

  function renderCompoundSearchResults() {
    compoundSearchResults.innerHTML = "";
    getCompoundSearchMatches(compoundSearchInput.value).forEach((match) => {
      compoundSearchResults.appendChild(buildCompoundSearchResult(match));
    });
  }

  function openCompoundSearch() {
    compoundSearchInput.value = "";
    compoundSearchResults.innerHTML = "";
    compoundSearchModal.classList.remove("hidden");
    compoundSearchInput.focus();
  }

  function closeCompoundSearch() {
    compoundSearchModal.classList.add("hidden");
  }

  function getDefaultTranslationLanguage(originLang) {
    if (originLang !== "en") return "en";
    const uiLang = getStoredLang();
    return uiLang !== "en" && LANGUAGES[uiLang] ? uiLang : "de";
  }

  function ensureDistinctLanguages(changedSelect) {
    if (originLanguageSelect.value !== translationLanguageSelect.value) return;
    const other = changedSelect === originLanguageSelect ? translationLanguageSelect : originLanguageSelect;
    const fallback = getDefaultTranslationLanguage(changedSelect.value);
    other.value = fallback === changedSelect.value
      ? (Object.keys(LANGUAGES).find((code) => code !== changedSelect.value) || "en")
      : fallback;
  }

  function applyPronunciationField(row, labelEl, inputEl, lang) {
    const config = CREATE_PRONUNCIATION_FIELDS[lang];
    row.classList.toggle("hidden", !config);
    if (config) {
      labelEl.textContent = config.label + ":";
      inputEl.placeholder = config.label;
    } else {
      inputEl.value = "";
    }
  }

  function updateManualLanguageFields() {
    applyPronunciationField(
      originPronunciationRow,
      originPronunciationLabel,
      originPronunciationInput,
      originLanguageSelect.value
    );
    applyPronunciationField(
      translatedPronunciationRow,
      translatedPronunciationLabel,
      translatedPronunciationInput,
      translationLanguageSelect.value
    );
  }

  function setEditingState(label) {
    editingStatus.classList.toggle("hidden", !label);
    editingStatusText.textContent = label || "";
  }

  function isCreateHomographStarOn(button) {
    return !!(button && button.getAttribute("aria-pressed") === "true");
  }

  function setCreateHomographStar(button, on) {
    if (!button) return;
    const filled = !!on;
    button.setAttribute("aria-pressed", filled ? "true" : "false");
    button.textContent = filled ? "★" : "☆";
    const title = getTranslation("create.homographStarTitle") || getTranslation("dictionary.HomographStarTitle") || "Homograph";
    button.title = title;
    button.setAttribute("aria-label", title);
  }

  function syncCreateHomographStarLabels() {
    setCreateHomographStar(originHomographStarBtn, isCreateHomographStarOn(originHomographStarBtn));
    setCreateHomographStar(translatedHomographStarBtn, isCreateHomographStarOn(translatedHomographStarBtn));
  }

  function clearCreateEditor(clearForm) {
    editingEntryId = "";
    retrievedWorldLine = "";
    setEditingState("");
    if (clearForm) {
      originWordInput.value = "";
      translatedWordInput.value = "";
      setCreateHomographStar(originHomographStarBtn, false);
      setCreateHomographStar(translatedHomographStarBtn, false);
      originPronunciationInput.value = "";
      translatedPronunciationInput.value = "";
      setSelectedPartsOfSpeech([]);
      compoundParts = [];
      renderCompoundParts();
      Object.keys(categorySymbols).forEach((category) => { categorySymbols[category] = []; });
      renderCategories();
    }
  }

  function resolveEntryLanguagePair(entry) {
    const translations = entry.translations || {};
    const origin = entry.originLanguage || entry.translationSource || "en";
    let translated = entry.translationLanguage || "";
    if (!translated || !LANGUAGES[translated] || translated === origin) {
      const keys = Object.keys(translations).filter((code) => LANGUAGES[code] && code !== origin);
      if (keys.includes("en")) translated = "en";
      else if (keys.length) translated = keys[0];
      else translated = getDefaultTranslationLanguage(origin);
    }
    return { origin, translated };
  }

  function loadCategoriesIntoEditor(entry) {
    const groups = getEntryCategories(entry);
    Object.keys(categorySymbols).forEach((category) => {
      categorySymbols[category] = groups[category].map((ref) =>
        symbols.find((symbol) => String(symbol.id) === String(ref.id)) || ref
      );
    });
    renderCategories();
  }

  function loadLocalEntryIntoEditor(entry) {
    if (!entry || entry.isCore) return;
    editingEntryId = entry._entryId;
    retrievedWorldLine = "";
    const pair = resolveEntryLanguagePair(entry);
    originLanguageSelect.value = LANGUAGES[pair.origin] ? pair.origin : "en";
    translationLanguageSelect.value = LANGUAGES[pair.translated] ? pair.translated : getDefaultTranslationLanguage(originLanguageSelect.value);
    ensureDistinctLanguages(originLanguageSelect);
    updateManualLanguageFields();
    const translations = entry.translations || {};
    originWordInput.value = translations[originLanguageSelect.value] ||
      (pair.origin === "en" ? (entry.definition || "") : "");
    translatedWordInput.value = translations[translationLanguageSelect.value] ||
      (pair.translated === "en" ? (translations.en || entry.definition || "") : "");
    setSelectedPartsOfSpeech(entry.partOfSpeech || []);
    compoundParts = Array.isArray(entry.compoundParts) ? entry.compoundParts.map((part) => Object.assign({}, part)) : [];
    renderCompoundParts();
    const originPronConfig = CREATE_PRONUNCIATION_FIELDS[originLanguageSelect.value];
    const translatedPronConfig = CREATE_PRONUNCIATION_FIELDS[translationLanguageSelect.value];
    originPronunciationInput.value = originPronConfig ? (entry[originPronConfig.key] || "") : "";
    translatedPronunciationInput.value = translatedPronConfig ? (entry[translatedPronConfig.key] || "") : "";
    loadCategoriesIntoEditor(entry);
    const entryHomographs = entry.homographs && typeof entry.homographs === "object" ? entry.homographs : null;
    if (entryHomographs && Object.prototype.hasOwnProperty.call(entryHomographs, originLanguageSelect.value)) {
      setCreateHomographStar(originHomographStarBtn, !!entryHomographs[originLanguageSelect.value]);
    } else {
      setCreateHomographStar(originHomographStarBtn, isHomographWord(originWordInput.value, originLanguageSelect.value));
    }
    if (entryHomographs && Object.prototype.hasOwnProperty.call(entryHomographs, translationLanguageSelect.value)) {
      setCreateHomographStar(translatedHomographStarBtn, !!entryHomographs[translationLanguageSelect.value]);
    } else {
      setCreateHomographStar(translatedHomographStarBtn, isHomographWord(translatedWordInput.value, translationLanguageSelect.value));
    }
    setEditingState("Editing: " + (originWordInput.value || translatedWordInput.value));
  }

  function loadWorldLineIntoEditor(line) {
    const sourceLang = Object.keys(CREATE_ORIGIN_NAMES).find((code) => CREATE_ORIGIN_NAMES[code] === getCreateWorldField(line, 7)) || "en";
    originLanguageSelect.value = sourceLang === "en" ? "en" : sourceLang;
    translationLanguageSelect.value = sourceLang === "en" ? getDefaultTranslationLanguage("en") : "en";
    ensureDistinctLanguages(originLanguageSelect);
    updateManualLanguageFields();
    editingEntryId = "";
    retrievedWorldLine = line;
    const english = getCreateWorldField(line, 0);
    const translation = getCreateWorldField(line, 1);
    if (sourceLang === "en") {
      originWordInput.value = english;
      translatedWordInput.value = "";
    } else {
      originWordInput.value = translation;
      translatedWordInput.value = english;
    }
    setCreateHomographStar(originHomographStarBtn, isHomographWord(originWordInput.value, originLanguageSelect.value));
    setCreateHomographStar(translatedHomographStarBtn, isHomographWord(translatedWordInput.value, translationLanguageSelect.value));
    setSelectedPartsOfSpeech(getCreateWorldField(line, 5));
    const pronunciationIndex = sourceLang === "zh" ? 2 : sourceLang === "ja" ? 3 : sourceLang === "ru" ? 4 : -1;
    const pronunciation = pronunciationIndex >= 0 ? getCreateWorldField(line, pronunciationIndex) : "";
    originPronunciationInput.value = CREATE_PRONUNCIATION_FIELDS[originLanguageSelect.value] ? pronunciation : "";
    translatedPronunciationInput.value = CREATE_PRONUNCIATION_FIELDS[translationLanguageSelect.value] ? pronunciation : "";
    compoundParts = [];
    renderCompoundParts();
    Object.keys(categorySymbols).forEach((category) => { categorySymbols[category] = []; });
    renderCategories();
    setEditingState("Retrieved: " + (originWordInput.value || translatedWordInput.value));
  }

  function renderDictionaryLookupResults() {
    const query = normalizeCreatedWord(dictionarySearchInput.value, originLanguageSelect.value);
    dictionaryResults.innerHTML = "";
    if (!query) {
      dictionaryResults.classList.add("hidden");
      return;
    }
    const sourceLang = originLanguageSelect.value;
    const matches = [];
    ensureCoreWordsInDictionary().forEach((entry) => {
      if (!entry || entry.isCore) return;
      const pair = resolveEntryLanguagePair(entry);
      const translations = entry.translations || {};
      const word = translations[sourceLang] ||
        (pair.origin === sourceLang ? (translations[pair.origin] || entry.definition || "") : "") ||
        (pair.translated === sourceLang ? (translations[pair.translated] || "") : "");
      if (!word) return;
      if (normalizeCreatedWord(word, sourceLang).includes(query)) {
        const originPronConfig = CREATE_PRONUNCIATION_FIELDS[pair.origin];
        const translatedPronConfig = CREATE_PRONUNCIATION_FIELDS[pair.translated];
        const pronunciationConfig = CREATE_PRONUNCIATION_FIELDS[sourceLang] || originPronConfig || translatedPronConfig;
        matches.push({
          type: "local",
          word,
          english: translations.en || entry.definition || "",
          translation: translations[pair.origin === "en" ? pair.translated : pair.origin] || "",
          pos: splitPartsOfSpeech(entry.partOfSpeech).join(" & "),
          origin: CREATE_ORIGIN_NAMES[pair.origin] || pair.origin,
          pronunciationLabel: pronunciationConfig ? pronunciationConfig.label : "",
          pronunciation: pronunciationConfig ? (entry[pronunciationConfig.key] || "") : "",
          symbols: getSymbolsForEntry(entry),
          entry,
        });
      }
    });
    const expectedOrigin = CREATE_ORIGIN_NAMES[sourceLang];
    (window.WORLD_DICTIONARY_ROWS || []).some((line) => {
      const origin = getCreateWorldField(line, 7);
      if (sourceLang !== "en" && origin !== expectedOrigin) return false;
      const word = getCreateWorldField(line, sourceLang === "en" ? 0 : 1);
      if (normalizeCreatedWord(word, sourceLang).includes(query)) {
        const originCode = Object.keys(CREATE_ORIGIN_NAMES).find((code) => CREATE_ORIGIN_NAMES[code] === origin) || "en";
        const pronunciationIndex = originCode === "zh" ? 2 : originCode === "ja" ? 3 : originCode === "ru" ? 4 : -1;
        const pronunciationConfig = CREATE_PRONUNCIATION_FIELDS[originCode];
        matches.push({
          type: "world",
          word,
          english: getCreateWorldField(line, 0),
          translation: getCreateWorldField(line, 1),
          pos: splitPartsOfSpeech(getCreateWorldField(line, 5)).join(" & "),
          origin,
          pronunciationLabel: pronunciationConfig ? pronunciationConfig.label : "",
          pronunciation: pronunciationIndex >= 0 ? getCreateWorldField(line, pronunciationIndex) : "",
          symbols: [],
          line,
        });
      }
      return matches.length >= 100;
    });
    matches.slice(0, 100).forEach((match) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "create-dictionary-result";
      const stamp = document.createElement("span");
      const fields = document.createElement("span");
      stamp.className = "create-result-stamp";
      fields.className = "create-result-fields";
      match.symbols.slice(0, 4).forEach((ref) => {
        const symbol = symbols.find((candidate) => String(candidate.id) === String(ref.id));
        const visual = document.createElement("span");
        visual.appendChild(createSymbolVisual(symbol || ref, symbol ? getSymbolName(symbol) : (ref.name || "")));
        stamp.appendChild(visual);
      });
      [
        [getTranslation("dictionary.english"), match.english],
        [getTranslation("dictionary.translation"), match.translation],
        [getTranslation("dictionary.partOfSpeech"), match.pos],
        [getTranslation("dictionary.originLanguage"), match.origin],
        [match.pronunciationLabel, match.pronunciation],
      ].forEach(([label, value]) => {
        if (!label && !value) return;
        const field = document.createElement("span");
        const title = document.createElement("strong");
        const content = document.createElement("span");
        title.textContent = label;
        content.textContent = value;
        field.className = "create-result-field";
        field.appendChild(title);
        field.appendChild(content);
        fields.appendChild(field);
      });
      button.appendChild(stamp);
      button.appendChild(fields);
      button.addEventListener("click", () => {
        if (match.type === "local") loadLocalEntryIntoEditor(match.entry);
        else loadWorldLineIntoEditor(match.line);
        dictionaryResults.classList.add("hidden");
      });
      dictionaryResults.appendChild(button);
    });
    dictionaryResults.classList.toggle("hidden", !dictionaryResults.children.length);
  }

  originLanguageSelect.value = getStoredLang();
  translationLanguageSelect.value = getDefaultTranslationLanguage(originLanguageSelect.value);
  ensureDistinctLanguages(originLanguageSelect);
  buildPartOfSpeechOptions();
  posOptions.addEventListener("change", updateCompoundBuilderVisibility);
  compoundAddButton.addEventListener("click", openCompoundSearch);
  compoundSearchInput.addEventListener("input", renderCompoundSearchResults);
  compoundSearchClose.addEventListener("click", closeCompoundSearch);
  compoundSearchModal.addEventListener("click", (event) => {
    if (event.target === compoundSearchModal) closeCompoundSearch();
  });
  updateManualLanguageFields();
  updateCompoundBuilderVisibility();
  originLanguageSelect.addEventListener("change", () => {
    ensureDistinctLanguages(originLanguageSelect);
    updateManualLanguageFields();
    renderDictionaryLookupResults();
  });
  translationLanguageSelect.addEventListener("change", () => {
    ensureDistinctLanguages(translationLanguageSelect);
    updateManualLanguageFields();
  });
  dictionarySearchInput.addEventListener("input", renderDictionaryLookupResults);
  clearEditButton.addEventListener("click", () => clearCreateEditor(true));
  const requestedEntryId = sessionStorage.getItem("createEditEntryId");
  const requestedWorldLine = sessionStorage.getItem("createEditWorldLine");
  const requestedWorldLanguage = sessionStorage.getItem("createEditWorldLanguage");
  sessionStorage.removeItem("createEditEntryId");
  sessionStorage.removeItem("createEditWorldLine");
  sessionStorage.removeItem("createEditWorldLanguage");
  if (requestedEntryId) {
    const requestedEntry = ensureCoreWordsInDictionary().find((entry) => entry._entryId === requestedEntryId);
    if (requestedEntry) loadLocalEntryIntoEditor(requestedEntry);
  } else if (requestedWorldLine) {
    if (LANGUAGES[requestedWorldLanguage]) originLanguageSelect.value = requestedWorldLanguage;
    updateManualLanguageFields();
    loadWorldLineIntoEditor(requestedWorldLine);
  }
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data) return;
    if (data.type === "kanji-builder-save-and-close") {
      submitBtn.click();
      return;
    }
    if (data.type !== "kanji-builder-load-editor") return;
    if (data.entryId) {
      const requestedEntry = ensureCoreWordsInDictionary().find((entry) => entry._entryId === data.entryId);
      if (requestedEntry) loadLocalEntryIntoEditor(requestedEntry);
    } else if (data.worldLine) {
      if (LANGUAGES[data.language]) originLanguageSelect.value = data.language;
      updateManualLanguageFields();
      loadWorldLineIntoEditor(data.worldLine);
    }
  });

  Object.keys(categoryElements).forEach((category) => {
    const zone = categoryElements[category];
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    });
    zone.addEventListener("drop", (event) => {
      event.preventDefault();
      if (event.target.closest(".category-symbol-item")) return;
      completedCategoryDrop = true;
      const symbolId = parseInt(event.dataTransfer.getData("text/plain"), 10);
      const symbol = symbols.find((candidate) => candidate.id === symbolId);
      addSymbolToCategory(symbol, category);
    });
  });

  grid.addEventListener("dragover", (event) => {
    if (event.dataTransfer.types && Array.from(event.dataTransfer.types).includes("source")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    }
  });
  grid.addEventListener("drop", (event) => {
    if (event.dataTransfer.getData("source") !== "category") return;
    event.preventDefault();
    completedCategoryDrop = true;
    const symbolId = parseInt(event.dataTransfer.getData("text/plain"), 10);
    if (symbolId) {
      removeSymbolFromCategories(symbolId);
      renderCategories();
    }
  });

  if (modeToggle) {
    applySymbolViewModeToToggle(modeToggle);
    modeToggle.addEventListener("click", () => {
      const next = modeToggle.dataset.mode === "key" ? "manual" : "key";
      setStoredSymbolViewMode(next);
      applySymbolViewModeToToggle(modeToggle);
      if (symbolSearchInput) symbolSearchInput.value = "";
      buildSymbolGrid();
      renderCategories();
    });
  }

  // Grid: create symbol boxes
  let keyModeOpenCategory = 0;

  function getCreateSymbolViewMode() {
    return modeToggle && modeToggle.dataset.mode === "key" ? "key" : "manual";
  }

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

  function appendCreateEmptySymbolBox() {
    const blank = document.createElement("div");
    blank.className = "symbol-box symbol-box-empty";
    blank.setAttribute("aria-hidden", "true");
    grid.appendChild(blank);
  }

  function appendCreateSymbolBox(sym, options) {
    const opts = options || {};
    const div = document.createElement("div");
    div.className = "symbol-box";
    if (opts.isKeyCategory) div.classList.add("symbol-key-category");
    if (opts.isKeyOpen) div.classList.add("symbol-key-open");
    div.dataset.symbolId = sym.id;
    if (opts.categoryIndex != null) div.dataset.keyCategoryIndex = String(opts.categoryIndex);
    div.setAttribute("draggable", opts.isKeyCategory ? "false" : "true");
    div.appendChild(createSymbolVisual(sym, getSymbolName(sym)));
    const nameSpan = document.createElement("span");
    nameSpan.textContent = getSymbolName(sym);
    div.appendChild(nameSpan);
    div.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showSymbolInfo(sym);
    });
    if (opts.isKeyCategory) {
      div.addEventListener("click", () => {
        keyModeOpenCategory = opts.categoryIndex;
        buildSymbolGrid();
        updateUsedGridSymbols();
      });
    } else {
      div.addEventListener("dragstart", (e) => {
        if (isSymbolUsed(sym.id)) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", sym.id);
        e.dataTransfer.setData("source", "grid");
      });
      div.addEventListener("click", () => {
        if (isSymbolUsed(sym.id)) return;
        addSymbolToCategory(sym, "is");
      });
    }
    grid.appendChild(div);
  }

  function buildSymbolGrid() {
    grid.innerHTML = "";
    const mode = getCreateSymbolViewMode();
    if (mode === "key") {
      grid.classList.add("symbol-grid-key");
      const board = buildKeyModeBoard(keyModeOpenCategory);
      keyModeOpenCategory = board.openIndex;
      board.topIds.forEach((cellId, cellIndex) => {
        if (!cellId) {
          appendCreateEmptySymbolBox();
          return;
        }
        const sym = symbols.find((s) => s.id === cellId);
        if (!sym) {
          appendCreateEmptySymbolBox();
          return;
        }
        appendCreateSymbolBox(sym, {
          isKeyOpen: cellIndex === 0,
        });
      });
      board.bottomHeads.forEach((head) => {
        const sym = symbols.find((s) => s.id === head.id);
        if (!sym) {
          appendCreateEmptySymbolBox();
          return;
        }
        appendCreateSymbolBox(sym, {
          isKeyCategory: true,
          categoryIndex: head.categoryIndex,
        });
      });
      updateUsedGridSymbols();
      return;
    }

    grid.classList.remove("symbol-grid-key");
    const layout = (typeof symbolGridLayout !== "undefined" && Array.isArray(symbolGridLayout)) ? symbolGridLayout : null;
    const cells = layout ? layout.flat() : symbols.map((s) => s.id);
    cells.forEach((cellId) => {
      if (!cellId) {
        appendCreateEmptySymbolBox();
        return;
      }
      const sym = symbols.find((s) => s.id === cellId);
      if (!sym) {
        appendCreateEmptySymbolBox();
        return;
      }
      appendCreateSymbolBox(sym);
    });
    updateUsedGridSymbols();
  }
  buildSymbolGrid();
  renderCategories();

  window.kanjiBuilderRefreshCreate = function () {
    buildSymbolGrid();
    renderCategories();
    // Update symbol info popup image if open so it matches new accent color
    if (typeof window.kanjiBuilderRefreshOpenSymbolInfo === "function") {
      window.kanjiBuilderRefreshOpenSymbolInfo();
    }
  };

  // Symbol search: filter grid by name, description, or user-added extras (using current language)
  const symbolSearchInput = document.getElementById("symbol-search");
  symbolSearchInput.addEventListener("input", () => {
    const query = symbolSearchInput.value.trim().toLowerCase();
    if (!query) {
      buildSymbolGrid();
      renderCategories();
      return;
    }
    // Search always shows a flat match list (works in Manual and Key Mode).
    grid.classList.remove("symbol-grid-key");
    grid.innerHTML = "";
    const extras = getSymbolExtras();
    const unusedMatches = [];
    const usedMatches = [];
    symbols.forEach((sym) => {
      const name = getSymbolName(sym).toLowerCase();
      const desc = (getSymbolDescription(sym) || "").toLowerCase();
      const extraText = (extras[sym.id] || "").toLowerCase();
      const match =
        name.includes(query) || (desc && desc.includes(query)) || (extraText && extraText.includes(query));
      if (!match) return;
      if (isSymbolUsed(sym.id)) usedMatches.push(sym);
      else unusedMatches.push(sym);
    });
    unusedMatches.concat(usedMatches).forEach((sym) => appendCreateSymbolBox(sym));
    updateUsedGridSymbols();
  });

  window.onLanguageChange = () => {
    updateGridSymbolLabels();
    renderCategories();
    if (modeToggle) {
      modeToggle.textContent = getTranslation(modeToggle.dataset.mode === "key" ? "create.keyMode" : "create.manualMode");
    }
    if (typeof window.updateCreateImageUiText === "function") window.updateCreateImageUiText();
    if (!editingEntryId && !retrievedWorldLine && !originWordInput.value.trim() && !translatedWordInput.value.trim()) {
      originLanguageSelect.value = getStoredLang();
      translationLanguageSelect.value = getDefaultTranslationLanguage(originLanguageSelect.value);
      ensureDistinctLanguages(originLanguageSelect);
    }
    updateManualLanguageFields();
    renderDictionaryLookupResults();
    symbolSearchInput.dispatchEvent(new Event("input"));
  };

  // Submit the ordered category model.
  function normalizeCreatedWord(word, lang) {
    return (word || "").normalize("NFKC").trim().toLocaleLowerCase(lang);
  }

  function getCreateWorldField(line, fieldIndex) {
    const parts = String(line || "").split("\t");
    return parts[fieldIndex] || "";
  }

  function wordAlreadyExists(word, sourceLang, entries, ignoredEntryId) {
    const normalized = normalizeCreatedWord(word, sourceLang);
    const localMatch = entries.some((entry) => entry._entryId !== ignoredEntryId &&
      normalizeCreatedWord(getEntryDisplayWord(entry, sourceLang), sourceLang) === normalized
    );
    if (localMatch) return true;
    const originByLang = { zh: "Chinese", es: "Spanish", fr: "French", ru: "Russian", de: "German", ja: "Japanese" };
    const worldRows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
    return worldRows.some((line) => {
      if (sourceLang === "en") {
        return normalizeCreatedWord(getCreateWorldField(line, 0), sourceLang) === normalized;
      }
      if (getCreateWorldField(line, 7) !== originByLang[sourceLang]) return false;
      return normalizeCreatedWord(getCreateWorldField(line, 1), sourceLang) === normalized;
    });
  }

  submitBtn.addEventListener("click", async () => {
    const originLang = originLanguageSelect.value;
    const translatedLang = translationLanguageSelect.value;
    const originWord = originWordInput.value.trim();
    const translatedWord = translatedWordInput.value.trim();
    if (!originWord) return alert("Please enter the origin word.");
    if (!translatedWord) return alert("Please enter the translated word.");
    if (originLang === translatedLang) return alert("Origin and translated languages must be different.");
    const selectedPartsOfSpeech = getSelectedPartsOfSpeech();
    if (!selectedPartsOfSpeech.length) return alert("Please select at least one part of speech.");
    if (selectedPartsOfSpeech.includes("Compound") && compoundParts.length < 2) {
      return alert("Please select at least two words for a compound.");
    }
    const originPronConfig = CREATE_PRONUNCIATION_FIELDS[originLang];
    const translatedPronConfig = CREATE_PRONUNCIATION_FIELDS[translatedLang];
    const originPronunciation = originPronunciationInput.value.trim();
    const translatedPronunciation = translatedPronunciationInput.value.trim();
    if (originPronConfig && !originPronunciation) {
      return alert("Please enter the " + originPronConfig.label + " pronunciation.");
    }
    if (translatedPronConfig && !translatedPronunciation) {
      return alert("Please enter the " + translatedPronConfig.label + " pronunciation.");
    }

    function toRef(s) {
      return s ? { id: s.id, name: s.name, image: s.image, rgb: s.rgb } : null;
    }
    let entries = ensureCoreWordsInDictionary();
    if (!retrievedWorldLine && wordAlreadyExists(originWord, originLang, entries, editingEntryId) &&
        !confirm(getTranslation("create.duplicateWarning"))) {
      return;
    }
    const categories = {
      is: categorySymbols.is.map(toRef),
      unrelated: categorySymbols.unrelated.map(toRef),
      isNot: categorySymbols.isNot.map(toRef),
    };
    const stampSymbols = categories.is.slice(0, 4);
    const customTranslations = {};
    customTranslations[originLang] = originWord;
    customTranslations[translatedLang] = translatedWord;
    const englishWord = customTranslations.en || originWord;
    let pinyin = "";
    let hiragana = "";
    let latinLetters = "";
    function assignPronunciation(lang, value) {
      if (lang === "zh") pinyin = value;
      else if (lang === "ja") hiragana = value;
      else if (lang === "ru") latinLetters = value;
    }
    assignPronunciation(originLang, originPronunciation);
    assignPronunciation(translatedLang, translatedPronunciation);
    const existingIndex = editingEntryId ? findEntryIndexById(entries, editingEntryId) : -1;
    const existing = existingIndex >= 0 ? entries[existingIndex] : null;
    const entry = Object.assign(existing || {}, {
      schemaVersion: 2,
      _entryId: existing ? existing._entryId : makeEntryId(),
      categories,
      stampSymbols,
      stamp: null,
      tempStamp: stampSymbols.length ? stampSymbols : null,
      symbols: stampSymbols,
      tempstamped: stampSymbols.length > 0,
      stamped: false,
      definition: englishWord,
      isCore: false,
      translationSource: originLang,
      originLanguage: originLang,
      translationLanguage: translatedLang,
      translations: customTranslations,
      homographs: {
        [originLang]: isCreateHomographStarOn(originHomographStarBtn),
        [translatedLang]: isCreateHomographStarOn(translatedHomographStarBtn),
      },
      partOfSpeech: selectedPartsOfSpeech,
      compoundParts: selectedPartsOfSpeech.includes("Compound") ? compoundParts.map((part) => Object.assign({}, part)) : [],
      pinyin,
      hiragana,
      latinLetters,
    });
    if (existing) markEntryEdited(entry);
    else initializeEntryAuthorship(entry);

    if (entries.length && entries[0].symbols && !entries[0].symbols[0].image && !entries[0].symbols[0].rgb) entries = [];
    if (existingIndex >= 0) entries[existingIndex] = entry;
    else entries.push(entry);
    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    invalidateManualHomographIndex();

    if (isEmbeddedEditor && window.parent !== window) {
      window.parent.postMessage({ type: "kanji-builder-word-saved", entryId: entry._entryId, entry }, "*");
      return;
    }
    alert(`"${originWord}" has been ${existing ? "updated" : "added"} in the dictionary!`);
    clearCreateEditor(true);
  });

  function toggleCreateHomographStar(button) {
    setCreateHomographStar(button, !isCreateHomographStarOn(button));
  }
  if (originHomographStarBtn) {
    originHomographStarBtn.addEventListener("click", () => toggleCreateHomographStar(originHomographStarBtn));
  }
  if (translatedHomographStarBtn) {
    translatedHomographStarBtn.addEventListener("click", () => toggleCreateHomographStar(translatedHomographStarBtn));
  }
  syncCreateHomographStarLabels();
}


/* --------------------------------
   DRAW PAGE
-------------------------------- */
if (page === "draw") {
  const canvas = document.getElementById("draw-canvas");
  const clearBtn = document.getElementById("draw-clear");
  const addBtn = document.getElementById("draw-add");
  const statusEl = document.getElementById("draw-status");
  const emptyEl = document.getElementById("draw-symbol-empty");
  const panelEl = document.getElementById("draw-symbol-panel");
  const previewEl = document.getElementById("draw-symbol-preview");
  const nameEl = document.getElementById("draw-symbol-name");
  const descEl = document.getElementById("draw-symbol-description");
  const variantListEl = document.getElementById("draw-variant-list");
  const variantCountEl = document.getElementById("draw-variant-count");
  const prevBtn = document.getElementById("draw-variant-prev");
  const nextBtn = document.getElementById("draw-variant-next");
  const useSelectedBtn = document.getElementById("draw-use-selected");
  const deleteVariantBtn = document.getElementById("draw-delete-variant");
  const gridEl = document.getElementById("draw-symbol-grid");
  const searchInput = document.getElementById("draw-symbol-search");
  const modeToggle = document.getElementById("draw-mode-toggle");
  const workspaceEl = document.getElementById("draw-workspace");
  const sideToggle = document.getElementById("draw-side-toggle");
  const DRAW_SIDE_KEY = "drawCanvasSide";

  let selectedSymbol = null;
  let viewingIndex = 0;
  let keyModeOpenCategory = 0;
  const drawController = canvas ? bindSymbolDrawCanvas(canvas) : null;

  function drawText(key, vars) {
    let text = getTranslation(key) || "";
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.replace("{" + name + "}", String(vars[name]));
      });
    }
    return text;
  }

  function setStatus(message) {
    if (statusEl) statusEl.textContent = message || "";
  }

  function clearCanvas() {
    if (drawController) drawController.clearCanvas();
    setStatus("");
  }

  function getVariantSources(sym) {
    if (!sym) return [];
    const cfg = getCustomImageConfigForSymbolId(sym.id);
    const sources = [{ index: 0, src: sym.image, label: drawText("draw.defaultLabel") }];
    cfg.customImages.forEach((src, i) => {
      sources.push({
        index: i + 1,
        src,
        label: drawText("draw.customLabel", { n: i + 1 }),
      });
    });
    return sources;
  }

  function saveConfigForSymbol(sym, cfg) {
    const map = getStoredCustomSymbolImages();
    map[String(sym.id)] = {
      selected: cfg.selected,
      customImages: cfg.customImages.slice(),
    };
    saveStoredCustomSymbolImages(map);
  }

  const variantsSectionEl = document.getElementById("draw-variants-section");

  function renderSelectedSymbol() {
    if (!selectedSymbol) {
      emptyEl.classList.remove("hidden");
      panelEl.classList.add("hidden");
      if (variantsSectionEl) variantsSectionEl.classList.add("hidden");
      if (addBtn) addBtn.disabled = true;
      if (prevBtn) prevBtn.disabled = true;
      if (nextBtn) nextBtn.disabled = true;
      if (useSelectedBtn) useSelectedBtn.disabled = true;
      if (deleteVariantBtn) deleteVariantBtn.disabled = true;
      if (variantListEl) variantListEl.innerHTML = "";
      if (variantCountEl) variantCountEl.textContent = "";
      return;
    }
    emptyEl.classList.add("hidden");
    panelEl.classList.remove("hidden");
    if (variantsSectionEl) variantsSectionEl.classList.remove("hidden");
    if (addBtn) addBtn.disabled = false;
    if (useSelectedBtn) useSelectedBtn.disabled = false;

    const name = getSymbolName(selectedSymbol);
    nameEl.textContent = name;
    descEl.textContent = getSymbolDescription(selectedSymbol) || "";

    const variants = getVariantSources(selectedSymbol);
    if (viewingIndex < 0) viewingIndex = 0;
    if (viewingIndex >= variants.length) viewingIndex = variants.length - 1;
    const active = variants[viewingIndex] || variants[0];

    previewEl.innerHTML = "";
    previewEl.appendChild(createSymbolVisual(
      { id: selectedSymbol.id, image: selectedSymbol.image, _imageOverride: active.src },
      name
    ));

    variantCountEl.textContent = (viewingIndex + 1) + " / " + variants.length;
    variantListEl.innerHTML = "";
    variants.forEach((variant) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "draw-variant-item" + (variant.index === viewingIndex ? " selected" : "");
      btn.title = variant.label;
      btn.appendChild(createSymbolVisual(
        { id: selectedSymbol.id, image: selectedSymbol.image, _imageOverride: variant.src },
        variant.label
      ));
      btn.addEventListener("click", () => {
        viewingIndex = variant.index;
        renderSelectedSymbol();
      });
      variantListEl.appendChild(btn);
    });

    const multi = variants.length > 1;
    if (prevBtn) prevBtn.disabled = !multi;
    if (nextBtn) nextBtn.disabled = !multi;
    if (deleteVariantBtn) deleteVariantBtn.disabled = viewingIndex === 0;
  }

  function selectSymbol(sym) {
    selectedSymbol = sym;
    const cfg = getCustomImageConfigForSymbolId(sym.id);
    viewingIndex = cfg.selected;
    renderSelectedSymbol();
    renderSymbolGrid(searchInput ? searchInput.value : "");
    setStatus("");
  }

  function renderSymbolGrid(query) {
    if (!gridEl || typeof symbols === "undefined") return;
    const q = (query || "").trim().toLowerCase();
    const viewMode = modeToggle && modeToggle.dataset.mode === "key" ? "key" : "manual";
    gridEl.innerHTML = "";
    gridEl.classList.toggle("symbol-grid-key", viewMode === "key" && !q);

    function appendBlank() {
      const blank = document.createElement("div");
      blank.className = "symbol-box symbol-box-empty";
      blank.setAttribute("aria-hidden", "true");
      gridEl.appendChild(blank);
    }

    function appendSymbol(sym, boxOptions) {
      if (!sym) return;
      const boxOpts = boxOptions || {};
      const name = getSymbolName(sym);
      const desc = getSymbolDescription(sym) || "";
      if (q && !name.toLowerCase().includes(q) && !desc.toLowerCase().includes(q)) return;
      const box = document.createElement("div");
      box.className = "symbol-box" + (selectedSymbol && String(selectedSymbol.id) === String(sym.id) ? " selected" : "");
      if (boxOpts.isKeyCategory) box.classList.add("symbol-key-category");
      if (boxOpts.isKeyOpen) box.classList.add("symbol-key-open");
      box.title = name;
      box.appendChild(createSymbolVisual(sym, name));
      const span = document.createElement("span");
      span.textContent = name;
      box.appendChild(span);
      if (boxOpts.isKeyCategory) {
        box.addEventListener("click", () => {
          keyModeOpenCategory = boxOpts.categoryIndex;
          renderSymbolGrid(searchInput ? searchInput.value : "");
        });
      } else {
        box.addEventListener("click", () => selectSymbol(sym));
      }
      box.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (typeof window.showSymbolInfo === "function") window.showSymbolInfo(sym);
      });
      gridEl.appendChild(box);
    }

    if (q) {
      symbols.forEach((sym) => appendSymbol(sym));
      return;
    }

    if (viewMode === "key") {
      const board = buildKeyModeBoard(keyModeOpenCategory);
      keyModeOpenCategory = board.openIndex;
      board.topIds.forEach((cellId, cellIndex) => {
        if (!cellId) { appendBlank(); return; }
        const sym = symbols.find((s) => s.id === cellId);
        if (!sym) { appendBlank(); return; }
        appendSymbol(sym, { isKeyOpen: cellIndex === 0 });
      });
      board.bottomHeads.forEach((head) => {
        const sym = symbols.find((s) => s.id === head.id);
        if (!sym) { appendBlank(); return; }
        appendSymbol(sym, { isKeyCategory: true, categoryIndex: head.categoryIndex });
      });
      return;
    }

    if (typeof symbolGridLayout !== "undefined" && Array.isArray(symbolGridLayout)) {
      symbolGridLayout.flat().forEach((cellId) => {
        if (!cellId) {
          appendBlank();
          return;
        }
        appendSymbol(symbols.find((s) => s.id === cellId));
      });
      return;
    }

    symbols.forEach((sym) => appendSymbol(sym));
  }

  if (drawController) clearCanvas();
  if (clearBtn) clearBtn.addEventListener("click", clearCanvas);

  if (modeToggle) {
    applySymbolViewModeToToggle(modeToggle);
    modeToggle.addEventListener("click", () => {
      const next = modeToggle.dataset.mode === "key" ? "manual" : "key";
      setStoredSymbolViewMode(next);
      applySymbolViewModeToToggle(modeToggle);
      if (searchInput) searchInput.value = "";
      renderSymbolGrid("");
    });
  }

  if (addBtn) {
    addBtn.addEventListener("click", () => {
      if (!selectedSymbol) {
        setStatus(drawText("draw.selectFirst"));
        return;
      }
      if (!drawController || !drawController.hasInk()) {
        setStatus(drawText("draw.canvasEmpty"));
        return;
      }
      const dataUrl = drawController.exportDataUrl();
      if (!dataUrl.startsWith("data:image/")) return;
      const cfg = getCustomImageConfigForSymbolId(selectedSymbol.id);
      cfg.customImages.push(dataUrl);
      cfg.selected = cfg.customImages.length;
      saveConfigForSymbol(selectedSymbol, cfg);
      viewingIndex = cfg.selected;
      clearCanvas();
      renderSelectedSymbol();
      renderSymbolGrid(searchInput ? searchInput.value : "");
      setStatus(drawText("draw.added"));
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      if (!selectedSymbol) return;
      const total = getVariantSources(selectedSymbol).length;
      if (total <= 1) return;
      viewingIndex = (viewingIndex - 1 + total) % total;
      renderSelectedSymbol();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (!selectedSymbol) return;
      const total = getVariantSources(selectedSymbol).length;
      if (total <= 1) return;
      viewingIndex = (viewingIndex + 1) % total;
      renderSelectedSymbol();
    });
  }

  if (useSelectedBtn) {
    useSelectedBtn.addEventListener("click", () => {
      if (!selectedSymbol) return;
      const cfg = getCustomImageConfigForSymbolId(selectedSymbol.id);
      cfg.selected = viewingIndex;
      saveConfigForSymbol(selectedSymbol, cfg);
      renderSelectedSymbol();
      renderSymbolGrid(searchInput ? searchInput.value : "");
      setStatus("");
    });
  }

  if (deleteVariantBtn) {
    deleteVariantBtn.addEventListener("click", () => {
      if (!selectedSymbol) return;
      if (viewingIndex === 0) {
        setStatus(drawText("draw.cannotDeleteDefault"));
        return;
      }
      if (!confirm(drawText("draw.confirmDelete"))) return;
      const cfg = getCustomImageConfigForSymbolId(selectedSymbol.id);
      const idx = viewingIndex - 1;
      if (idx < 0 || idx >= cfg.customImages.length) return;
      cfg.customImages.splice(idx, 1);
      if (cfg.selected > cfg.customImages.length) cfg.selected = cfg.customImages.length;
      if (viewingIndex > cfg.customImages.length) viewingIndex = cfg.customImages.length;
      saveConfigForSymbol(selectedSymbol, cfg);
      renderSelectedSymbol();
      renderSymbolGrid(searchInput ? searchInput.value : "");
      setStatus(drawText("draw.deleted"));
    });
  }

  if (searchInput) {
    searchInput.addEventListener("input", () => renderSymbolGrid(searchInput.value));
  }

  function applyDrawSide(side) {
    const next = side === "left" ? "left" : "right";
    if (workspaceEl) workspaceEl.setAttribute("data-draw-side", next);
    localStorage.setItem(DRAW_SIDE_KEY, next);
    if (sideToggle) {
      sideToggle.textContent = getTranslation(next === "left" ? "draw.sideLeft" : "draw.sideRight");
    }
  }

  if (sideToggle) {
    const savedSide = localStorage.getItem(DRAW_SIDE_KEY) === "left" ? "left" : "right";
    applyDrawSide(savedSide);
    sideToggle.addEventListener("click", () => {
      const current = workspaceEl && workspaceEl.getAttribute("data-draw-side") === "left" ? "left" : "right";
      applyDrawSide(current === "right" ? "left" : "right");
    });
  }

  window.onLanguageChange = () => {
    if (modeToggle) {
      modeToggle.textContent = getTranslation(modeToggle.dataset.mode === "key" ? "create.keyMode" : "create.manualMode");
    }
    if (sideToggle) {
      const side = workspaceEl && workspaceEl.getAttribute("data-draw-side") === "left" ? "left" : "right";
      sideToggle.textContent = getTranslation(side === "left" ? "draw.sideLeft" : "draw.sideRight");
    }
    if (typeof window.updateCreateImageUiText === "function") window.updateCreateImageUiText();
    renderSelectedSymbol();
    renderSymbolGrid(searchInput ? searchInput.value : "");
  };

  window.kanjiBuilderRefreshDraw = () => {
    renderSymbolGrid(searchInput ? searchInput.value : "");
    if (selectedSymbol) renderSelectedSymbol();
  };

  renderSelectedSymbol();
  renderSymbolGrid("");
}

/* --------------------------------
   WRITE PAGE
-------------------------------- */
if (page === "write") {
  const WRITE_INPUT_LANG_KEY = "writeInputLang";
  const WRITE_OUTPUT_LANG_KEY = "writeOutputLang";
  const WRITE_UI_TEXTS = {
    en: {
      title: "Write",
      input: "Input",
      placeholder: "Type a sentence...",
      inputMode: "Input:",
      outputMode: "Output:",
      output: "Output",
      universal: "Universal",
      infoTitle: "Write Format",
      contextTitle: "Choose a Word",
      infoStamped: "Stamped words use bold accent-colored text with a stamp.",
      infoTempstamped: "Tempstamped words use normal accent-colored text with a stamp.",
      infoUnstamped: "Unstamped words use normal accent-colored text with a blank stamp.",
      infoContext: "Context words are underlined. Bold still follows stamp status when a stamp exists. Single-click to choose another context; double-click to edit the word.",
      infoUnknown: "Unknown words use normal accent-colored text with no stamp.",
      matchesFor: "Matches for",
      noMatches: "No matching words.",
      worldWord: "World dictionary",
      localWord: "Local dictionary",
      savedSentences: "Saved Sentences",
      searchSaved: "Search saved sentences…",
      saveContexts: "Save Sentence contexts",
      contextCountOne: "{n} context",
      contextCountMany: "{n} contexts",
      noSavedMatch: "No saved sentences match your search.",
      noSavedYet: "No saved sentence contexts yet.",
      editSentence: "Edit Sentence",
    },
    zh: {
      title: "写作",
      input: "输入",
      placeholder: "输入一句话...",
      inputMode: "输入：",
      outputMode: "输出：",
      output: "输出",
      universal: "通用",
      infoTitle: "写作格式",
      contextTitle: "选择词语",
      infoStamped: "已盖章词语使用粗体主题色文字并带印章。",
      infoTempstamped: "临时盖章词语使用普通主题色文字并带印章。",
      infoUnstamped: "未盖章词语使用普通主题色文字并带空白印章。",
      infoContext: "上下文词语带下划线；若有印章，粗体仍按盖章状态显示。单击选择其他上下文，双击编辑词语。",
      infoUnknown: "未知词语使用普通主题色文字且没有印章。",
      matchesFor: "匹配：",
      noMatches: "没有匹配词语。",
      worldWord: "世界词典",
      localWord: "本地词典",
      savedSentences: "已保存的句子",
      searchSaved: "搜索已保存的句子…",
      saveContexts: "保存句子语境",
      contextCountOne: "{n} 个语境",
      contextCountMany: "{n} 个语境",
      noSavedMatch: "没有匹配的已保存句子。",
      noSavedYet: "还没有已保存的句子语境。",
      editSentence: "编辑句子",
    },
    es: {
      title: "Escribir",
      input: "Entrada",
      placeholder: "Escribe una frase...",
      inputMode: "Entrada:",
      outputMode: "Salida:",
      output: "Salida",
      universal: "Universal",
      infoTitle: "Formato de escritura",
      contextTitle: "Elegir una palabra",
      infoStamped: "Las palabras selladas usan texto en negrita del color de la UI con sello.",
      infoTempstamped: "Las palabras temporalmente selladas usan texto normal del color de la UI con sello.",
      infoUnstamped: "Las palabras sin sello usan texto normal del color de la UI con sello en blanco.",
      infoContext: "Las palabras de contexto van subrayadas. La negrita sigue el estado del sello si existe. Clic para elegir otro contexto; doble clic para editar la palabra.",
      infoUnknown: "Las palabras desconocidas usan texto normal del color de la UI sin sello.",
      matchesFor: "Coincidencias de",
      noMatches: "No hay coincidencias.",
      worldWord: "Diccionario mundial",
      localWord: "Diccionario local",
      savedSentences: "Oraciones guardadas",
      searchSaved: "Buscar oraciones guardadas…",
      saveContexts: "Guardar contextos de oraciones",
      contextCountOne: "{n} contexto",
      contextCountMany: "{n} contextos",
      noSavedMatch: "Ninguna oración guardada coincide con la búsqueda.",
      noSavedYet: "Aún no hay contextos de oraciones guardados.",
      editSentence: "Editar oración",
    },
    fr: {
      title: "Écrire",
      input: "Entrée",
      placeholder: "Écrivez une phrase...",
      inputMode: "Entrée :",
      outputMode: "Sortie :",
      output: "Sortie",
      universal: "Universel",
      infoTitle: "Format d’écriture",
      contextTitle: "Choisir un mot",
      infoStamped: "Les mots tamponnés utilisent un texte accentué en gras avec tampon.",
      infoTempstamped: "Les mots temporairement tamponnés utilisent un texte accentué normal avec tampon.",
      infoUnstamped: "Les mots non tamponnés utilisent un texte accentué normal avec tampon vide.",
      infoContext: "Les mots de contexte sont soulignés. Le gras suit encore l’état du tampon s’il existe. Clic pour choisir un autre contexte ; double-clic pour modifier le mot.",
      infoUnknown: "Les mots inconnus utilisent un texte accentué normal sans tampon.",
      matchesFor: "Correspondances pour",
      noMatches: "Aucune correspondance.",
      worldWord: "Dictionnaire mondial",
      localWord: "Dictionnaire local",
      savedSentences: "Phrases enregistrées",
      searchSaved: "Rechercher des phrases enregistrées…",
      saveContexts: "Enregistrer les contextes de phrase",
      contextCountOne: "{n} contexte",
      contextCountMany: "{n} contextes",
      noSavedMatch: "Aucune phrase enregistrée ne correspond à votre recherche.",
      noSavedYet: "Aucun contexte de phrase enregistré pour le moment.",
      editSentence: "Modifier la phrase",
    },
    ru: {
      title: "Писать",
      input: "Ввод",
      placeholder: "Введите предложение...",
      inputMode: "Ввод:",
      outputMode: "Вывод:",
      output: "Вывод",
      universal: "Универсальный",
      infoTitle: "Формат письма",
      contextTitle: "Выберите слово",
      infoStamped: "Запечатанные слова — жирный текст цвета UI со штампом.",
      infoTempstamped: "Временно запечатанные слова — обычный текст цвета UI со штампом.",
      infoUnstamped: "Незапечатанные слова — обычный текст цвета UI с пустым штампом.",
      infoContext: "Контекстные слова подчёркнуты. Жирность по-прежнему зависит от статуса штампа. Один клик — выбрать другой контекст; двойной клик — редактировать слово.",
      infoUnknown: "Неизвестные слова — обычный текст цвета UI без штампа.",
      matchesFor: "Совпадения для",
      noMatches: "Совпадений нет.",
      worldWord: "Мировой словарь",
      localWord: "Локальный словарь",
      savedSentences: "Сохранённые предложения",
      searchSaved: "Поиск сохранённых предложений…",
      saveContexts: "Сохранить контексты предложений",
      contextCountOne: "{n} контекст",
      contextCountMany: "{n} контекстов",
      noSavedMatch: "Нет сохранённых предложений по вашему запросу.",
      noSavedYet: "Пока нет сохранённых контекстов предложений.",
      editSentence: "Редактировать предложение",
    },
    de: {
      title: "Schreiben",
      input: "Eingabe",
      placeholder: "Schreibe einen Satz...",
      inputMode: "Eingabe:",
      outputMode: "Ausgabe:",
      output: "Ausgabe",
      universal: "Universal",
      infoTitle: "Schreibformat",
      contextTitle: "Wort wählen",
      infoStamped: "Gestempelte Wörter: fetter UI-Farbtext mit Stempel.",
      infoTempstamped: "Tempgestempelte Wörter: normaler UI-Farbtext mit Stempel.",
      infoUnstamped: "Ungestempelte Wörter: normaler UI-Farbtext mit leerem Stempel.",
      infoContext: "Kontextwörter sind unterstrichen. Fett folgt weiterhin dem Stempelstatus. Einfachklick wählt einen anderen Kontext; Doppelklick öffnet die Wortbearbeitung.",
      infoUnknown: "Unbekannte Wörter: normaler UI-Farbtext ohne Stempel.",
      matchesFor: "Treffer für",
      noMatches: "Keine Treffer.",
      worldWord: "Weltwörterbuch",
      localWord: "Lokales Wörterbuch",
      savedSentences: "Gespeicherte Sätze",
      searchSaved: "Gespeicherte Sätze suchen…",
      saveContexts: "Satzkontexte speichern",
      contextCountOne: "{n} Kontext",
      contextCountMany: "{n} Kontexte",
      noSavedMatch: "Keine gespeicherten Sätze passen zur Suche.",
      noSavedYet: "Noch keine gespeicherten Satzkontexte.",
      editSentence: "Satz bearbeiten",
    },
    ja: {
      title: "書く",
      input: "入力",
      placeholder: "文を入力...",
      inputMode: "入力：",
      outputMode: "出力：",
      output: "出力",
      universal: "ユニバーサル",
      infoTitle: "書く形式",
      contextTitle: "単語を選択",
      infoStamped: "スタンプ済みは太字のUI色文字＋スタンプ。",
      infoTempstamped: "仮スタンプは通常のUI色文字＋スタンプ。",
      infoUnstamped: "未スタンプは通常のUI色文字＋空白スタンプ。",
      infoContext: "文脈候補は下線付き。太字はスタンプ状態に従います。クリックで他の文脈を選択、ダブルクリックで単語を編集。",
      infoUnknown: "未知語は通常のUI色文字でスタンプなし。",
      matchesFor: "一致：",
      noMatches: "一致する単語がありません。",
      worldWord: "世界辞書",
      localWord: "ローカル辞書",
      savedSentences: "保存した文",
      searchSaved: "保存した文を検索…",
      saveContexts: "文の文脈を保存",
      contextCountOne: "{n} 件の文脈",
      contextCountMany: "{n} 件の文脈",
      noSavedMatch: "検索に一致する保存文がありません。",
      noSavedYet: "保存された文の文脈はまだありません。",
      editSentence: "文を編集",
    },
  };

  const writeInput = document.getElementById("write-input");
  const writeInputDisplay = document.getElementById("write-input-display");
  const writeOutput = document.getElementById("write-output");
  const writeInputLanguage = document.getElementById("write-input-language");
  const writeOutputLanguage = document.getElementById("write-output-language");
  const writeInfoBtn = document.getElementById("write-info-btn");
  const writeInfoBox = document.getElementById("write-info-box");
  const writeInfoList = document.getElementById("write-info-list");
  const writeInfoClose = document.getElementById("write-info-close");
  const writeContextBox = document.getElementById("write-context-box");
  const writeContextTitle = document.getElementById("write-context-title");
  const writeContextResults = document.getElementById("write-context-results");
  const writeContextEdit = document.getElementById("write-context-edit");
  const writeContextClose = document.getElementById("write-context-close");
  const writeWordInfoBox = document.getElementById("write-word-info-box");
  const writeWordInfoTitle = document.getElementById("write-word-info-title");
  const writeWordInfoSymbols = document.getElementById("write-word-info-symbols");
  const writeWordInfoMeta = document.getElementById("write-word-info-meta");
  const writeWordInfoNote = document.getElementById("write-word-info-note");
  const writeWordInfoEdit = document.getElementById("write-word-info-edit");
  const writeWordInfoSaveNote = document.getElementById("write-word-info-save-note");
  const writeWordInfoClose = document.getElementById("write-word-info-close");

  ensureCoreWordsInDictionary();
  const WRITE_SENTENCE_CTX_KEY = "writeSentenceContexts";
  const tokenOverrides = {};
  const dirtySentenceKeys = new Set();
  let currentWriteModel = { words: [], sentenceInfos: [] };
  let currentWordEntryId = "";
  let activeTokenIndex = -1;
  let activeMatches = [];
  let contextPickerTarget = "write";
  let editingSentenceId = "";
  let editTokenOverrides = {};
  const writeSaveContextsBtn = document.getElementById("write-save-contexts");
  const writeSaveContextsStatus = document.getElementById("write-save-contexts-status");
  const writeSentenceSearch = document.getElementById("write-sentence-search");
  const writeSavedSentences = document.getElementById("write-saved-sentences");
  const writeSentenceEditBox = document.getElementById("write-sentence-edit-box");
  const writeSentenceEditTitle = document.getElementById("write-sentence-edit-title");
  const writeSentenceEditMeta = document.getElementById("write-sentence-edit-meta");
  const writeSentenceEditText = document.getElementById("write-sentence-edit-text");
  const writeSentenceEditTokens = document.getElementById("write-sentence-edit-tokens");
  const writeSentenceEditSave = document.getElementById("write-sentence-edit-save");
  const writeSentenceEditDelete = document.getElementById("write-sentence-edit-delete");
  const writeSentenceEditClose = document.getElementById("write-sentence-edit-close");
  const { openDictionaryEditor } = setupSharedDictionaryEditor(() => renderWrite());

  function getWriteUiText() {
    return WRITE_UI_TEXTS[getStoredLang()] || WRITE_UI_TEXTS.en;
  }

  function normalizeSentence(text) {
    return (text || "").normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("en");
  }

  function makeSentenceKey(norm, inputLang, outputLang) {
    return (norm || "") + "\0" + (inputLang || "") + "\0" + (outputLang || "");
  }

  function splitIntoSentences(text) {
    const source = String(text || "").replace(/\r\n/g, "\n");
    const sentences = [];
    source.split(/\n+/).forEach((para) => {
      const trimmed = para.trim();
      if (!trimmed) return;
      const re = /[^.!?。！？]+(?:[.!?。！？]+)?/g;
      let match;
      let found = false;
      while ((match = re.exec(trimmed)) !== null) {
        const sentence = match[0].trim();
        if (!sentence) continue;
        sentences.push(sentence);
        found = true;
      }
      if (!found) sentences.push(trimmed);
    });
    return sentences;
  }

  function buildWriteModel(text) {
    const words = String(text || "").split(/\s+/).filter(Boolean);
    const sentenceTexts = splitIntoSentences(text || "");
    const sentenceInfos = [];
    let wordIndex = 0;
    sentenceTexts.forEach((sentenceText) => {
      const sentenceWords = sentenceText.split(/\s+/).filter(Boolean);
      const tokens = [];
      for (let i = 0; i < sentenceWords.length && wordIndex < words.length; i += 1) {
        tokens.push({
          globalIndex: wordIndex,
          localIndex: i,
          rawWord: words[wordIndex],
        });
        wordIndex += 1;
      }
      if (!tokens.length) return;
      sentenceInfos.push({
        text: sentenceText,
        norm: normalizeSentence(sentenceText),
        tokens,
      });
    });
    if (wordIndex < words.length) {
      const leftovers = words.slice(wordIndex);
      sentenceInfos.push({
        text: leftovers.join(" "),
        norm: normalizeSentence(leftovers.join(" ")),
        tokens: leftovers.map((rawWord, localIndex) => ({
          globalIndex: wordIndex + localIndex,
          localIndex,
          rawWord,
        })),
      });
    }
    return { words, sentenceInfos };
  }

  function loadSavedSentenceContexts() {
    try {
      const parsed = JSON.parse(localStorage.getItem(WRITE_SENTENCE_CTX_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function saveSentenceContextsList(list) {
    localStorage.setItem(WRITE_SENTENCE_CTX_KEY, JSON.stringify(list));
  }

  function findSavedSentenceContext(norm, inputLang, outputLang) {
    return loadSavedSentenceContexts().find((entry) => (
      entry
      && entry.sentenceNorm === norm
      && entry.inputLang === inputLang
      && entry.outputLang === outputLang
    )) || null;
  }

  function findSentenceInfoForGlobalIndex(globalIndex, model) {
    const source = model || currentWriteModel;
    return (source.sentenceInfos || []).find((info) => (
      info.tokens.some((token) => token.globalIndex === globalIndex)
    )) || null;
  }

  function markSentenceDirtyForGlobalIndex(globalIndex) {
    const info = findSentenceInfoForGlobalIndex(globalIndex);
    if (!info) return;
    dirtySentenceKeys.add(makeSentenceKey(info.norm, getInputMode(), getOutputMode()));
    updateSaveContextsButton();
  }

  function updateSaveContextsButton() {
    if (!writeSaveContextsBtn) return;
    const hasDirty = dirtySentenceKeys.size > 0;
    writeSaveContextsBtn.classList.toggle("hidden", !hasDirty);
    if (!hasDirty && writeSaveContextsStatus) writeSaveContextsStatus.textContent = "";
  }

  function formatAuthorshipLine(entry) {
    if (!entry) return "";
    const createdBy = entry.createdBy || ANONYMOUS_NAME;
    const createdAt = entry.createdAt ? formatAuthorshipTimeValue(entry.createdAt) : "";
    const editedBy = entry.lastEditedBy || createdBy;
    const editedAt = entry.lastEditedAt ? formatAuthorshipTimeValue(entry.lastEditedAt) : createdAt;
    let line = formatCreatedByLine(createdBy, createdAt);
    if (editedBy !== createdBy || editedAt !== createdAt) {
      line += " · " + formatTranslation("common.editedBy", { name: editedBy });
      if (editedAt) line += " · " + editedAt;
    }
    return line;
  }

  function collectSentenceOverrides(sentenceInfo, inputLang, outputMode, overrideMap) {
    const existing = findSavedSentenceContext(sentenceInfo.norm, inputLang, outputMode);
    const overrides = Object.assign({}, (existing && existing.overrides) || {});
    let touched = false;
    sentenceInfo.tokens.forEach(({ globalIndex, localIndex, rawWord }) => {
      if (!Object.prototype.hasOwnProperty.call(overrideMap, globalIndex)
        && !Object.prototype.hasOwnProperty.call(overrideMap, String(globalIndex))) {
        return;
      }
      touched = true;
      const override = overrideMap[globalIndex];
      if (!override) {
        delete overrides[String(localIndex)];
        return;
      }
      const matches = getMatchesForToken(rawWord, inputLang, outputMode);
      const defaultMatch = matches[0] || null;
      const isDefault = !!(defaultMatch && (
        (override.type === "local" && override.entryId === defaultMatch.entryId)
        || (override.type === "world" && sameWorldSense(defaultMatch, override))
      ));
      if (isDefault) {
        delete overrides[String(localIndex)];
        return;
      }
      overrides[String(localIndex)] = Object.assign({}, override);
    });
    if (!touched && !Object.keys(overrides).length) return null;
    if (!Object.keys(overrides).length) return null;
    return overrides;
  }

  function upsertSavedSentenceContext(payload) {
    const list = loadSavedSentenceContexts();
    const idx = list.findIndex((entry) => (
      entry
      && entry.sentenceNorm === payload.sentenceNorm
      && entry.inputLang === payload.inputLang
      && entry.outputLang === payload.outputLang
    ));
    const now = new Date().toISOString();
    const author = getCurrentAuthorName();
    if (idx >= 0) {
      const existing = list[idx];
      existing.sentenceText = payload.sentenceText;
      existing.sentenceNorm = payload.sentenceNorm;
      existing.overrides = payload.overrides;
      existing.lastEditedBy = author;
      existing.lastEditedAt = now;
      if (!existing.createdBy) existing.createdBy = author;
      if (!existing.createdAt) existing.createdAt = now;
      if (!existing.id) existing.id = "wsc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
      list[idx] = existing;
    } else {
      list.push({
        id: "wsc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8),
        sentenceText: payload.sentenceText,
        sentenceNorm: payload.sentenceNorm,
        inputLang: payload.inputLang,
        outputLang: payload.outputLang,
        overrides: payload.overrides,
        createdBy: author,
        createdAt: now,
        lastEditedBy: author,
        lastEditedAt: now,
      });
    }
    saveSentenceContextsList(list);
  }

  function saveDirtySentenceContexts() {
    const model = buildWriteModel(writeInput ? writeInput.value : "");
    const inputLang = getInputMode();
    const outputMode = getOutputMode();
    let savedCount = 0;
    model.sentenceInfos.forEach((sentenceInfo) => {
      const key = makeSentenceKey(sentenceInfo.norm, inputLang, outputMode);
      if (!dirtySentenceKeys.has(key)) return;
      const overrides = collectSentenceOverrides(sentenceInfo, inputLang, outputMode, tokenOverrides);
      if (!overrides) {
        dirtySentenceKeys.delete(key);
        return;
      }
      upsertSavedSentenceContext({
        sentenceText: sentenceInfo.text,
        sentenceNorm: sentenceInfo.norm,
        inputLang,
        outputLang: outputMode,
        overrides,
      });
      savedCount += 1;
      dirtySentenceKeys.delete(key);
    });
    updateSaveContextsButton();
    if (writeSaveContextsStatus) {
      writeSaveContextsStatus.textContent = savedCount
        ? ("Saved " + savedCount + " sentence context" + (savedCount === 1 ? "" : "s") + ".")
        : "No changed sentence contexts to save.";
    }
    renderSavedSentencesList();
    renderWrite();
  }

  function renderSavedSentencesList() {
    if (!writeSavedSentences) return;
    const query = ((writeSentenceSearch && writeSentenceSearch.value) || "").trim().toLowerCase();
    const list = loadSavedSentenceContexts()
      .slice()
      .sort((a, b) => String(b.lastEditedAt || b.createdAt || "").localeCompare(String(a.lastEditedAt || a.createdAt || "")));
    writeSavedSentences.innerHTML = "";
    const filtered = list.filter((entry) => {
      if (!query) return true;
      const hay = [
        entry.sentenceText || "",
        entry.inputLang || "",
        entry.outputLang || "",
        entry.createdBy || "",
        entry.lastEditedBy || "",
      ].join(" ").toLowerCase();
      return hay.includes(query);
    });
    if (!filtered.length) {
      const empty = document.createElement("p");
      empty.className = "write-saved-sentences-empty";
      empty.textContent = query
        ? (getWriteUiText().noSavedMatch || "No saved sentences match your search.")
        : (getWriteUiText().noSavedYet || "No saved sentence contexts yet.");
      writeSavedSentences.appendChild(empty);
      return;
    }
    filtered.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "write-saved-sentence";
      const title = document.createElement("strong");
      title.textContent = entry.sentenceText || entry.sentenceNorm || "";
      const meta = document.createElement("span");
      const langLabel = (entry.inputLang || "?") + " → " + (entry.outputLang || "?");
      const overrideCount = entry.overrides ? Object.keys(entry.overrides).length : 0;
      const t = getWriteUiText();
      const contextLabel = (overrideCount === 1
        ? (t.contextCountOne || "{n} context")
        : (t.contextCountMany || "{n} contexts")).split("{n}").join(String(overrideCount));
      meta.textContent = langLabel + " · " + contextLabel
        + (formatAuthorshipLine(entry) ? " · " + formatAuthorshipLine(entry) : "");
      button.appendChild(title);
      button.appendChild(meta);
      button.addEventListener("click", () => openSentenceEditor(entry.id));
      writeSavedSentences.appendChild(button);
    });
  }

  function closeSentenceEditor() {
    editingSentenceId = "";
    editTokenOverrides = {};
    contextPickerTarget = "write";
    if (writeSentenceEditBox) writeSentenceEditBox.classList.add("hidden");
  }

  function openSentenceEditor(entryId) {
    const entry = loadSavedSentenceContexts().find((item) => item && item.id === entryId);
    if (!entry || !writeSentenceEditBox) return;
    editingSentenceId = entryId;
    editTokenOverrides = {};
    Object.keys(entry.overrides || {}).forEach((localKey) => {
      editTokenOverrides[Number(localKey)] = Object.assign({}, entry.overrides[localKey]);
    });
    if (writeSentenceEditTitle) writeSentenceEditTitle.textContent = getWriteUiText().editSentence || "Edit Sentence";
    if (writeSentenceEditMeta) writeSentenceEditMeta.textContent = formatAuthorshipLine(entry);
    if (writeSentenceEditText) writeSentenceEditText.value = entry.sentenceText || "";
    renderSentenceEditorTokens();
    writeSentenceEditBox.classList.remove("hidden");
  }

  function resolveEditTokenState(rawWord, localIndex, inputLang, outputMode) {
    const matches = getMatchesForToken(rawWord, inputLang, outputMode);
    const override = editTokenOverrides[localIndex];
    let selected = null;
    if (override) {
      if (override.type === "local") {
        selected = matches.find((match) => match.entryId === override.entryId) || null;
      } else if (override.type === "world") {
        selected = matches.find((match) => sameWorldSense(match, override)) || null;
      }
      if (!selected) delete editTokenOverrides[localIndex];
    }
    if (!selected && matches.length) selected = matches[0];
    return {
      rawWord,
      matches,
      selected,
      ambiguous: matches.length > 1,
      inputAmbiguous: matches.length > 1,
      outputAmbiguous: false,
      status: selected ? selected.status : "unknown",
    };
  }

  function renderSentenceEditorTokens() {
    if (!writeSentenceEditTokens || !writeSentenceEditText) return;
    writeSentenceEditTokens.innerHTML = "";
    const entry = loadSavedSentenceContexts().find((item) => item && item.id === editingSentenceId);
    if (!entry) return;
    const inputLang = entry.inputLang || "en";
    const outputMode = entry.outputLang || "universal";
    const words = String(writeSentenceEditText.value || "").split(/\s+/).filter(Boolean);
    words.forEach((word, localIndex) => {
      const state = resolveEditTokenState(word, localIndex, inputLang, outputMode);
      const token = document.createElement("button");
      token.type = "button";
      applyTokenClasses(token, state);
      token.classList.add("write-output-token");
      const stampStatus = state.selected ? state.selected.status : "unknown";
      if (stampStatus === "unstamped") token.appendChild(createCompactStamp(null, true));
      else if (stampStatus === "stamped" || stampStatus === "tempstamped") {
        token.appendChild(createCompactStamp(state.selected.entry || state.selected, false));
      }
      const caption = document.createElement("span");
      caption.className = "write-token-caption";
      caption.textContent = outputMode !== "universal" && state.selected
        ? (getEntryOutputWord(state.selected.entry || state.selected, outputMode) || word)
        : word;
      token.appendChild(caption);
      token.addEventListener("click", () => {
        if (!(state.matches && state.matches.length > 1)) return;
        contextPickerTarget = "sentence-edit";
        activeTokenIndex = localIndex;
        activeMatches = state.matches.slice();
        const t = getWriteUiText();
        writeContextTitle.textContent = t.matchesFor + " " + state.rawWord;
        renderContextResults(activeMatches, inputLang);
        writeContextBox.classList.remove("hidden");
      });
      writeSentenceEditTokens.appendChild(token);
    });
  }

  function saveSentenceEditor() {
    if (!editingSentenceId || !writeSentenceEditText) return;
    const list = loadSavedSentenceContexts();
    const idx = list.findIndex((item) => item && item.id === editingSentenceId);
    if (idx < 0) return;
    const entry = list[idx];
    const sentenceText = writeSentenceEditText.value.trim();
    if (!sentenceText) {
      alert("Sentence text cannot be empty.");
      return;
    }
    const words = sentenceText.split(/\s+/).filter(Boolean);
    const overrides = {};
    words.forEach((word, localIndex) => {
      const override = editTokenOverrides[localIndex];
      if (!override) return;
      const matches = getMatchesForToken(word, entry.inputLang || "en", entry.outputLang || "universal");
      const defaultMatch = matches[0] || null;
      const isDefault = !!(defaultMatch && (
        (override.type === "local" && override.entryId === defaultMatch.entryId)
        || (override.type === "world" && sameWorldSense(defaultMatch, override))
      ));
      if (isDefault) return;
      overrides[String(localIndex)] = Object.assign({}, override);
    });
    if (!Object.keys(overrides).length) {
      list.splice(idx, 1);
      saveSentenceContextsList(list);
      closeSentenceEditor();
      renderSavedSentencesList();
      renderWrite();
      return;
    }
    entry.sentenceText = sentenceText;
    entry.sentenceNorm = normalizeSentence(sentenceText);
    entry.overrides = overrides;
    markEntryEdited(entry);
    list[idx] = entry;
    saveSentenceContextsList(list);
    closeSentenceEditor();
    renderSavedSentencesList();
    renderWrite();
  }

  function deleteSentenceEditor() {
    if (!editingSentenceId) return;
    if (!confirm("Delete this saved sentence context?")) return;
    const list = loadSavedSentenceContexts().filter((item) => item && item.id !== editingSentenceId);
    saveSentenceContextsList(list);
    closeSentenceEditor();
    renderSavedSentencesList();
    renderWrite();
  }

  function stripWriteLookupPunctuation(rawWord) {
    // Keep letters/numbers plus word-related marks (English/French apostrophes, hyphens).
    // Strip surrounding punctuation such as ()[]{}",.;:!?«» etc. from dictionary lookup.
    let text = String(rawWord || "");
    const stripEdge = /^[^\p{L}\p{N}'\u2019\u02BC\uFF07\-]+|[^\p{L}\p{N}'\u2019\u02BC\uFF07\-]+$/gu;
    let prev = "";
    while (text !== prev) {
      prev = text;
      text = text.replace(stripEdge, "");
    }
    return text;
  }

  function normalizeWord(w, lang) {
    const stripped = stripWriteLookupPunctuation(w);
    return (stripped || "").normalize("NFKC").trim().toLocaleLowerCase(lang || "en");
  }

  function getInputMode() {
    return writeInputLanguage && writeInputLanguage.value ? writeInputLanguage.value : "en";
  }

  function getOutputMode() {
    return writeOutputLanguage && writeOutputLanguage.value ? writeOutputLanguage.value : "universal";
  }

  function updateWriteUiText() {
    const t = getWriteUiText();
    const title = document.querySelector("main h1");
    const inputLabel = document.querySelector('label[for="write-input"]');
    const inputModeLabel = document.querySelector('label[for="write-input-language"]');
    const outputModeLabel = document.querySelector('label[for="write-output-language"]');
    const outputTitle = document.querySelector(".write-output-section h2");
    const savedTitle = document.querySelector(".write-saved-sentences-section h2");
    if (title) title.textContent = t.title;
    if (inputLabel) inputLabel.textContent = t.input;
    if (writeInput) writeInput.placeholder = t.placeholder;
    if (inputModeLabel) inputModeLabel.textContent = t.inputMode;
    if (outputModeLabel) outputModeLabel.textContent = t.outputMode;
    if (outputTitle) outputTitle.textContent = t.output;
    if (savedTitle) savedTitle.textContent = t.savedSentences || "Saved Sentences";
    if (writeSentenceSearch) writeSentenceSearch.placeholder = t.searchSaved || "Search saved sentences…";
    if (writeSaveContextsBtn) writeSaveContextsBtn.textContent = t.saveContexts || "Save Sentence contexts";
    if (writeInfoBox) {
      const infoTitle = writeInfoBox.querySelector("h2");
      if (infoTitle) infoTitle.textContent = t.infoTitle;
    }
    if (writeContextTitle && writeContextBox && writeContextBox.classList.contains("hidden")) {
      writeContextTitle.textContent = t.contextTitle;
    }
    if (writeInfoList) {
      writeInfoList.innerHTML = "";
      [t.infoStamped, t.infoTempstamped, t.infoUnstamped, t.infoContext, t.infoUnknown].forEach((line) => {
        const item = document.createElement("li");
        item.textContent = line;
        writeInfoList.appendChild(item);
      });
    }
    renderSavedSentencesList();
  }

  function buildLanguageSelect(selectEl, includeUniversal, storageKey, defaultValue) {
    if (!selectEl) return;
    const labels = includeUniversal
      ? Object.assign({ universal: getWriteUiText().universal }, LANGUAGES)
      : Object.assign({}, LANGUAGES);
    const saved = localStorage.getItem(storageKey) || defaultValue;
    selectEl.innerHTML = "";
    Object.keys(labels).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = labels[code];
      selectEl.appendChild(opt);
    });
    selectEl.value = labels[saved] ? saved : defaultValue;
  }

  function getEntryInputKey(entry, inputLang) {
    if (!entry) return "";
    if (entry.isCore) return normalizeWord(getEntryDisplayWord(entry, inputLang), inputLang);
    const translated = entry.translations && entry.translations[inputLang];
    const source = entry.originLanguage || entry.translationSource || "en";
    return normalizeWord(translated || (source === inputLang ? entry.definition : ""), inputLang);
  }

  function getEntryOutputWord(entry, outputLang) {
    if (!entry || outputLang === "universal") return "";
    if (entry.isCross || (entry.worldLine && String(entry.worldLine).startsWith("CROSS\t"))) {
      const cross = entry.cross || decodeCrossWorldLine(entry.worldLine) || entry;
      if (cross.translationLang === outputLang) return cross.translation || "";
      if (cross.wordLang === outputLang) return cross.word || "";
      return cross.translation || cross.word || "";
    }
    if (entry.isWorld) {
      if (outputLang === "en") return entry.english || "";
      // Selected comma-alternative (or full translation when there is only one).
      if (entry.translation) return entry.translation;
      if (WORLD_ORIGIN_TO_LANG[entry.origin] === outputLang) return entry.translation || entry.english || "";
      return entry.translation || entry.english || "";
    }
    return getEntryDisplayWord(entry, outputLang);
  }

  function getWorldOriginName(langCode) {
    return getWorldOriginNameFromCode(langCode);
  }

  let worldWriteIndex = null;
  function getWorldWriteIndex() {
    if (worldWriteIndex) return worldWriteIndex;
    const byEnglishOrigin = new Map();
    const byTranslationOrigin = new Map();
    const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
    rows.forEach((line) => {
      const parts = String(line || "").split("\t");
      if (parts.length < 8) return;
      const english = parts[0] || "";
      const translation = parts[1] || "";
      const origin = parts[7] || "";
      const originLang = WORLD_ORIGIN_TO_LANG[origin];
      if (!originLang) return;
      const englishNorm = normalizeWord(english, "en");
      if (englishNorm) {
        const englishKey = origin + "\0" + englishNorm;
        if (!byEnglishOrigin.has(englishKey)) byEnglishOrigin.set(englishKey, []);
        const englishBucket = byEnglishOrigin.get(englishKey);
        if (englishBucket.length < 40) englishBucket.push(line);
      }
      const alts = splitDictionaryAlternatives(translation);
      const altList = alts.length ? alts : (translation ? [translation] : []);
      altList.forEach((alt, altIndex) => {
        const translationNorm = normalizeWord(alt, originLang);
        if (!translationNorm) return;
        const translationKey = origin + "\0" + translationNorm;
        if (!byTranslationOrigin.has(translationKey)) byTranslationOrigin.set(translationKey, []);
        const translationBucket = byTranslationOrigin.get(translationKey);
        if (translationBucket.length < 40) {
          translationBucket.push({ line, altIndex, alt });
        }
      });
    });
    worldWriteIndex = { byEnglishOrigin, byTranslationOrigin };
    return worldWriteIndex;
  }

  function worldLineToMatch(line, altIndex) {
    const cross = decodeCrossWorldLine(line);
    if (cross) {
      return {
        type: "world",
        status: "unstamped",
        english: cross.english || "",
        translation: cross.translation || "",
        word: cross.word || "",
        origin: cross.originLabel || formatLanguagePairLabel(cross.pairId, cross.wordLang),
        partOfSpeech: cross.pos || "",
        worldLine: line,
        altIndex: typeof altIndex === "number" ? altIndex : 0,
        language: cross.translationLang || "en",
        definition: cross.word || cross.english || "",
        isWorld: true,
        isCross: true,
        cross,
      };
    }
    const parts = String(line || "").split("\t");
    if (parts.length < 8) return null;
    const origin = parts[7] || "";
    const fullTranslation = parts[1] || "";
    const alts = splitDictionaryAlternatives(fullTranslation);
    const altList = alts.length ? alts : [fullTranslation];
    const index = typeof altIndex === "number" ? altIndex : 0;
    const safeIndex = Math.max(0, Math.min(index, altList.length - 1));
    const latins = splitDictionaryAlternatives(parts[4] || "");
    const pinyins = splitDictionaryAlternatives(parts[2] || "");
    const hiraganas = splitDictionaryAlternatives(parts[3] || "");
    return {
      type: "world",
      status: "unstamped",
      english: parts[0] || "",
      translation: altList[safeIndex] || fullTranslation,
      fullTranslation,
      altIndex: safeIndex,
      altCount: altList.length,
      pinyin: getAlignedAlternative(pinyins, safeIndex, parts[2] || ""),
      hiragana: getAlignedAlternative(hiraganas, safeIndex, parts[3] || ""),
      latin: getAlignedAlternative(latins, safeIndex, parts[4] || ""),
      origin,
      partOfSpeech: parts[5] || "",
      worldLine: line,
      language: WORLD_ORIGIN_TO_LANG[origin] || "en",
      definition: parts[0] || "",
      isWorld: true,
    };
  }

  function expandWorldLineToMatches(line) {
    const cross = decodeCrossWorldLine(line);
    if (cross) return [worldLineToMatch(line, 0)].filter(Boolean);
    const parts = String(line || "").split("\t");
    if (parts.length < 8) return [];
    const alts = splitDictionaryAlternatives(parts[1] || "");
    const altList = alts.length ? alts : [parts[1] || ""];
    return altList.map((_, altIndex) => worldLineToMatch(line, altIndex)).filter(Boolean);
  }

  function sameWorldSense(match, override) {
    if (!match || !override) return false;
    if (match.worldLine !== override.worldLine) return false;
    const matchAlt = typeof match.altIndex === "number" ? match.altIndex : 0;
    const overrideAlt = typeof override.altIndex === "number" ? override.altIndex : 0;
    return matchAlt === overrideAlt;
  }

  function getWorldMatches(token, inputLang, outputMode) {
    if (inputLang !== "en" && outputMode && outputMode !== "universal" && outputMode !== "en" && outputMode !== inputLang) {
      return findCrossMatchesForWrite(token, inputLang, outputMode);
    }
    const index = getWorldWriteIndex();
    if (inputLang === "en") {
      const outputOrigin = outputMode && outputMode !== "universal" ? getWorldOriginName(outputMode) : "";
      if (!outputOrigin) return [];
      const lines = index.byEnglishOrigin.get(outputOrigin + "\0" + token) || [];
      return lines.flatMap((line) => expandWorldLineToMatches(line));
    }

    const inputOrigin = getWorldOriginName(inputLang);
    if (!inputOrigin) return [];
    const refs = index.byTranslationOrigin.get(inputOrigin + "\0" + token) || [];
    const matches = [];
    const seenLines = new Set();
    refs.forEach((ref) => {
      const line = typeof ref === "string" ? ref : ref.line;
      if (!line || seenLines.has(line)) return;
      seenLines.add(line);
      expandWorldLineToMatches(line).forEach((match) => matches.push(match));
    });
    // Prefer the alternative that matches what the user typed.
    matches.sort((a, b) => {
      const aHit = normalizeWord(a.translation, inputLang) === token ? 0 : 1;
      const bHit = normalizeWord(b.translation, inputLang) === token ? 0 : 1;
      return aHit - bHit;
    });
    return matches;
  }

  function getLocalMatches(token, inputLang) {
    const entries = ensureCoreWordsInDictionary();
    const matches = [];
    entries.forEach((entry) => {
      const key = getEntryInputKey(entry, inputLang);
      if (!key || key !== token) return;
      matches.push({
        type: "local",
        status: getEntryStampStatus(entry),
        entry,
        entryId: entry._entryId,
        definition: entry.definition || "",
      });
    });
    return matches;
  }

  function getMatchesForToken(rawWord, inputLang, outputMode) {
    const token = normalizeWord(rawWord, inputLang);
    if (!token) return [];
    return getLocalMatches(token, inputLang).concat(getWorldMatches(token, inputLang, outputMode));
  }

  function resolveTokenState(rawWord, index, inputLang, outputMode, sentenceInfo) {
    const matches = getMatchesForToken(rawWord, inputLang, outputMode);
    let override = tokenOverrides[index] || null;
    if (!override && sentenceInfo) {
      const localToken = sentenceInfo.tokens.find((token) => token.globalIndex === index);
      const saved = findSavedSentenceContext(sentenceInfo.norm, inputLang, outputMode);
      if (localToken && saved && saved.overrides) {
        const savedOverride = saved.overrides[String(localToken.localIndex)];
        if (savedOverride) override = savedOverride;
      }
    }
    let selected = null;
    if (override) {
      if (override.type === "local") {
        selected = matches.find((match) => match.entryId === override.entryId) || null;
      } else if (override.type === "world") {
        selected = matches.find((match) => sameWorldSense(match, override)) || null;
      }
      if (!selected && tokenOverrides[index]) delete tokenOverrides[index];
    }
    // Prefer a default sense when several exist; user can click to change context.
    if (!selected && matches.length) selected = matches[0];
    // Context is shared input spelling (e.g. English "love" → many Chinese senses).
    const inputAmbiguous = matches.length > 1;
    const status = selected ? selected.status : "unknown";
    return {
      rawWord,
      matches,
      selected,
      ambiguous: inputAmbiguous,
      inputAmbiguous,
      outputAmbiguous: false,
      status,
    };
  }

  function createCompactStamp(entryOrMatch, blank) {
    const stamp = document.createElement("div");
    stamp.className = "write-compact-stamp" + (blank ? " is-blank" : "");
    if (blank || !entryOrMatch) return stamp;
    const entry = entryOrMatch.entry || entryOrMatch;
    const refs = getSymbolsForEntry(entry).slice(0, 4).filter((ref) => ref && (ref.image || ref.rgb));
    if (refs.length === 1) stamp.classList.add("is-single");
    else if (refs.length === 2) stamp.classList.add("is-pair");
    else if (refs.length === 3) stamp.classList.add("is-triple");
    refs.forEach((ref) => {
      const cell = document.createElement("div");
      cell.className = "write-compact-stamp-symbol";
      const sym = typeof symbols !== "undefined" && symbols.find((s) => s.id === ref.id);
      const name = sym ? getSymbolName(sym) : (ref.name || "");
      cell.title = name;
      cell.appendChild(createSymbolVisual(ref, name));
      stamp.appendChild(cell);
    });
    return stamp;
  }

  function applyTokenClasses(el, state) {
    el.classList.add("write-token");
    el.classList.add("write-token-" + (state.status || "unknown"));
    if (state.ambiguous) el.classList.add("write-token-context");
    if (state.status === "stamped") el.classList.add("is-bold");
  }

  function openWordEditorForState(state) {
    if (state.selected && state.selected.type === "local") {
      openDictionaryEditor({ entryId: state.selected.entryId });
      return;
    }
    if (state.selected && state.selected.isCross) {
      const cross = state.selected.cross || decodeCrossWorldLine(state.selected.worldLine);
      const sourceLine = (cross && (cross.leftLine || cross.rightLine)) || null;
      if (sourceLine) {
        openDictionaryEditor({ worldLine: sourceLine, language: getInputMode() });
        return;
      }
    }
    if (state.selected && state.selected.type === "world") {
      openDictionaryEditor({
        worldLine: state.selected.worldLine,
        language: state.selected.language || getInputMode(),
      });
      return;
    }
    openDictionaryEditor({ language: getInputMode() });
  }

  function openWordInfo(entry) {
    if (!writeWordInfoBox || !entry || entry.isWorld) return;
    currentWordEntryId = entry._entryId || "";
    writeWordInfoTitle.textContent = getEntryDisplayWord(entry, getInputMode()) || entry.definition || "Word";
    writeWordInfoSymbols.innerHTML = "";
    writeWordInfoSymbols.appendChild(createCompactStamp(entry, false));
    writeWordInfoMeta.textContent = entry.isCore ? "Core word" : getEntryStampStatus(entry);
    if (writeWordInfoNote) writeWordInfoNote.value = entry.note || "";
    writeWordInfoBox.classList.remove("hidden");
  }

  function closeWordInfo() {
    currentWordEntryId = "";
    if (writeWordInfoBox) writeWordInfoBox.classList.add("hidden");
  }

  function renderContextResults(matches, displayLang) {
    const t = getWriteUiText();
    const outputMode = getOutputMode();
    writeContextResults.innerHTML = "";
    if (!matches.length) {
      const empty = document.createElement("p");
      empty.textContent = t.noMatches;
      writeContextResults.appendChild(empty);
      return;
    }
    matches.forEach((match) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "write-context-result";
      const stamp = createCompactStamp(match.entry || match, match.status === "unstamped");
      const meta = document.createElement("div");
      meta.className = "write-context-result-meta";
      const title = document.createElement("strong");
      const detail = document.createElement("span");
      if (match.type === "local") {
        const inputLabel = getEntryDisplayWord(match.entry, displayLang) || match.definition;
        const outputLabel = outputMode !== "universal"
          ? getEntryDisplayWord(match.entry, outputMode)
          : "";
        title.textContent = outputLabel && outputLabel !== inputLabel
          ? inputLabel + " → " + outputLabel
          : inputLabel;
        detail.textContent = t.localWord + " · " + match.status;
      } else {
        let inputLabel;
        let outputLabel;
        if (match.isCross) {
          inputLabel = match.word || match.definition || match.english || "";
          outputLabel = outputMode !== "universal" ? (match.translation || "") : "";
        } else {
          inputLabel = displayLang === "en" || getInputMode() === "en"
            ? match.english
            : (match.translation || match.english);
          outputLabel = outputMode === "en"
            ? match.english
            : (outputMode !== "universal" ? (match.translation || "") : "");
        }
        title.textContent = outputLabel && outputLabel !== inputLabel
          ? inputLabel + " → " + outputLabel
          : (outputLabel || inputLabel || match.english || "");
        detail.textContent = t.worldWord + " · " + (match.origin || "") + (match.partOfSpeech ? " · " + match.partOfSpeech : "");
      }
      meta.appendChild(title);
      meta.appendChild(detail);
      button.appendChild(stamp);
      button.appendChild(meta);
      button.addEventListener("click", () => {
        if (activeTokenIndex < 0) return;
        const override = match.type === "local"
          ? { type: "local", entryId: match.entryId }
          : {
            type: "world",
            worldLine: match.worldLine,
            altIndex: typeof match.altIndex === "number" ? match.altIndex : 0,
          };
        if (contextPickerTarget === "sentence-edit") {
          editTokenOverrides[activeTokenIndex] = override;
          writeContextBox.classList.add("hidden");
          contextPickerTarget = "write";
          renderSentenceEditorTokens();
          return;
        }
        tokenOverrides[activeTokenIndex] = override;
        markSentenceDirtyForGlobalIndex(activeTokenIndex);
        writeContextBox.classList.add("hidden");
        renderWrite();
      });
      writeContextResults.appendChild(button);
    });
  }

  function openContextPicker(state, index) {
    contextPickerTarget = "write";
    activeTokenIndex = index;
    // Always list senses that share the same input spelling (e.g. all Chinese for English "love").
    activeMatches = state.matches.slice();
    const inputLang = getInputMode();
    const t = getWriteUiText();
    writeContextTitle.textContent = t.matchesFor + " " + state.rawWord;
    renderContextResults(activeMatches, inputLang);
    writeContextBox.classList.remove("hidden");
  }

  function isContextToken(state) {
    return !!(state && (state.inputAmbiguous || (state.matches && state.matches.length > 1)));
  }

  function handleTokenClick(state, index) {
    if (isContextToken(state)) {
      openContextPicker(state, index);
      return;
    }
    if (state.selected && state.selected.type === "local") {
      openWordInfo(state.selected.entry);
      return;
    }
    openWordEditorForState(state);
  }

  function handleTokenEdit(state) {
    openWordEditorForState(state);
  }

  function bindTokenInteractions(token, state, index) {
    let clickTimer = null;
    token.addEventListener("click", (event) => {
      if (event.detail > 1) return;
      if (!isContextToken(state)) {
        handleTokenClick(state, index);
        return;
      }
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        openContextPicker(state, index);
      }, 250);
    });
    token.addEventListener("dblclick", (event) => {
      event.preventDefault();
      clearTimeout(clickTimer);
      handleTokenEdit(state);
    });
    token.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      handleTokenEdit(state);
    });
  }

  function buildInputToken(state, index) {
    const token = document.createElement("button");
    token.type = "button";
    applyTokenClasses(token, state);
    token.classList.add("write-input-token");
    token.textContent = state.rawWord;
    bindTokenInteractions(token, state, index);
    return token;
  }

  function buildOutputToken(state, index) {
    const token = document.createElement("button");
    token.type = "button";
    applyTokenClasses(token, state);
    token.classList.add("write-output-token");
    const outputMode = getOutputMode();
    const stampStatus = state.selected ? state.selected.status : "unknown";

    if (stampStatus === "unstamped") {
      token.appendChild(createCompactStamp(null, true));
    } else if (stampStatus === "stamped" || stampStatus === "tempstamped") {
      token.appendChild(createCompactStamp(state.selected.entry || state.selected, false));
    }

    const caption = document.createElement("span");
    caption.className = "write-token-caption";
    if (outputMode !== "universal") {
      caption.textContent = state.selected
        ? getEntryOutputWord(state.selected.entry || state.selected, outputMode) || state.rawWord
        : state.rawWord;
    } else {
      caption.textContent = state.rawWord;
    }
    token.appendChild(caption);

    bindTokenInteractions(token, state, index);
    return token;
  }

  function renderWrite() {
    if (!writeInput || !writeOutput || !writeInputDisplay) return;
    writeOutput.innerHTML = "";
    writeInputDisplay.innerHTML = "";
    currentWriteModel = buildWriteModel(writeInput.value || "");
    const words = currentWriteModel.words;
    const inputLang = getInputMode();
    const outputMode = getOutputMode();
    Object.keys(tokenOverrides).forEach((key) => {
      if (Number(key) >= words.length) delete tokenOverrides[key];
    });
    const stillDirty = new Set();
    dirtySentenceKeys.forEach((key) => {
      const parts = String(key).split("\0");
      if (parts.length < 3) return;
      const stillExists = currentWriteModel.sentenceInfos.some((info) => (
        makeSentenceKey(info.norm, inputLang, outputMode) === key
      ));
      if (stillExists && parts[1] === inputLang && parts[2] === outputMode) stillDirty.add(key);
    });
    dirtySentenceKeys.clear();
    stillDirty.forEach((key) => dirtySentenceKeys.add(key));
    updateSaveContextsButton();
    words.forEach((word, index) => {
      const sentenceInfo = findSentenceInfoForGlobalIndex(index, currentWriteModel);
      const state = resolveTokenState(word, index, inputLang, outputMode, sentenceInfo);
      writeInputDisplay.appendChild(buildInputToken(state, index));
      writeOutput.appendChild(buildOutputToken(state, index));
    });
  }

  let writeRenderTimer = null;
  function scheduleRenderWrite() {
    clearTimeout(writeRenderTimer);
    writeRenderTimer = setTimeout(renderWrite, 320);
  }

  buildLanguageSelect(writeInputLanguage, false, WRITE_INPUT_LANG_KEY, getStoredLang());
  buildLanguageSelect(writeOutputLanguage, true, WRITE_OUTPUT_LANG_KEY, "universal");
  updateWriteUiText();
  renderSavedSentencesList();

  if (writeInputLanguage) {
    writeInputLanguage.addEventListener("change", () => {
      localStorage.setItem(WRITE_INPUT_LANG_KEY, getInputMode());
      Object.keys(tokenOverrides).forEach((key) => delete tokenOverrides[key]);
      dirtySentenceKeys.clear();
      updateSaveContextsButton();
      renderWrite();
    });
  }
  if (writeOutputLanguage) {
    writeOutputLanguage.addEventListener("change", () => {
      localStorage.setItem(WRITE_OUTPUT_LANG_KEY, getOutputMode());
      Object.keys(tokenOverrides).forEach((key) => delete tokenOverrides[key]);
      dirtySentenceKeys.clear();
      updateSaveContextsButton();
      renderWrite();
    });
  }
  writeInput.addEventListener("input", scheduleRenderWrite);
  if (writeSaveContextsBtn) writeSaveContextsBtn.addEventListener("click", saveDirtySentenceContexts);
  if (writeSentenceSearch) writeSentenceSearch.addEventListener("input", renderSavedSentencesList);
  if (writeSentenceEditText) writeSentenceEditText.addEventListener("input", renderSentenceEditorTokens);
  if (writeSentenceEditSave) writeSentenceEditSave.addEventListener("click", saveSentenceEditor);
  if (writeSentenceEditDelete) writeSentenceEditDelete.addEventListener("click", deleteSentenceEditor);
  if (writeSentenceEditClose) writeSentenceEditClose.addEventListener("click", closeSentenceEditor);
  if (writeSentenceEditBox) {
    writeSentenceEditBox.addEventListener("click", (event) => {
      if (event.target === writeSentenceEditBox) closeSentenceEditor();
    });
  }

  if (writeInfoBtn && writeInfoBox) {
    writeInfoBtn.addEventListener("click", () => writeInfoBox.classList.remove("hidden"));
  }
  if (writeInfoClose) writeInfoClose.addEventListener("click", () => writeInfoBox.classList.add("hidden"));
  if (writeInfoBox) {
    writeInfoBox.addEventListener("click", (event) => {
      if (event.target === writeInfoBox) writeInfoBox.classList.add("hidden");
    });
  }
  if (writeContextClose) {
    writeContextClose.addEventListener("click", () => {
      writeContextBox.classList.add("hidden");
      contextPickerTarget = "write";
    });
  }
  if (writeContextEdit) {
    writeContextEdit.addEventListener("click", () => {
      const selected = activeMatches[0];
      writeContextBox.classList.add("hidden");
      contextPickerTarget = "write";
      if (!selected) {
        openDictionaryEditor({ language: getInputMode() });
        return;
      }
      openWordEditorForState({ selected, matches: activeMatches, status: selected.status });
    });
  }
  if (writeContextBox) {
    writeContextBox.addEventListener("click", (event) => {
      if (event.target === writeContextBox) {
        writeContextBox.classList.add("hidden");
        contextPickerTarget = "write";
      }
    });
  }
  if (writeWordInfoClose) writeWordInfoClose.addEventListener("click", closeWordInfo);
  if (writeWordInfoEdit) {
    writeWordInfoEdit.addEventListener("click", () => {
      if (!currentWordEntryId) return;
      closeWordInfo();
      openDictionaryEditor({ entryId: currentWordEntryId });
    });
  }
  if (writeWordInfoSaveNote) {
    writeWordInfoSaveNote.addEventListener("click", () => {
      if (!currentWordEntryId || !writeWordInfoNote) return;
      const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
      const idx = findEntryIndexById(entries, currentWordEntryId);
      if (idx < 0) return;
      entries[idx].note = writeWordInfoNote.value.trim();
      markEntryEdited(entries[idx]);
      localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
      closeWordInfo();
      renderWrite();
    });
  }
  if (writeWordInfoBox) {
    writeWordInfoBox.addEventListener("click", (event) => {
      if (event.target === writeWordInfoBox) closeWordInfo();
    });
  }

  window.onLanguageChange = () => {
    updateWriteUiText();
    buildLanguageSelect(writeInputLanguage, false, WRITE_INPUT_LANG_KEY, getInputMode());
    buildLanguageSelect(writeOutputLanguage, true, WRITE_OUTPUT_LANG_KEY, getOutputMode());
    renderWrite();
    renderSavedSentencesList();
  };
  window.kanjiBuilderRefreshWrite = renderWrite;
  renderWrite();
}

/* --------------------------------
   TRANSFERS PAGE
-------------------------------- */
if (page === "transfers") {
  const TRANSFERS_UI_TEXTS = {
    en: {
      title: "Transfers",
      exportTitle: "Export",
      exportHint: "Export All packs dictionary words, symbol images, saved sentences, and comments into one folder archive.",
      exportAll: "Export All",
      advancedSettings: "Advanced Settings",
      exportSelected: "Export Selected",
      dictSection: "Dictionary",
      imageSection: "Images",
      sentenceSection: "Sentences",
      commentSection: "Comments",
      wordSearchPlaceholder: "Search words…",
      imageSearchPlaceholder: "Search symbols…",
      sentenceSearchPlaceholder: "Search sentences…",
      commentSearchPlaceholder: "Search comments…",
      fullDictionary: "Select all words",
      fullImages: "Select all images",
      fullSentences: "Select all sentences",
      fullComments: "Select all comments",
      imageHint: "Click a symbol to open variants, then select images to export.",
      imageLabel: "Image",
      customDefaultSelected: "selected default",
      langAll: "All languages",
      importTitle: "Import",
      importHint: "Import a transfer folder archive (.zip), a folder, or a legacy .json package. Exact duplicates are skipped.",
      dropzone: "Drop transfer file or folder here",
      importFile: "Import File",
      importFolder: "Import Folder",
      chooseTransferFileFirst: "Choose a transfer file first.",
      importFailed: "Import failed. Please use a valid transfer package.",
      nothingSelected: "Select at least one item to export.",
      exportDone: "Export ready.",
      importSummary: "Imported {words} words, {images} images, {sentences} sentences, {comments} comments. Skipped {skipped} duplicates.",
    },
    zh: {
      title: "传输", exportTitle: "导出", exportHint: "全部导出会把词典词条、符号图片、已保存句子和评论打包成一个文件夹压缩包。",
      exportAll: "全部导出", advancedSettings: "高级设置", exportSelected: "导出所选",
      dictSection: "词典", imageSection: "图片", sentenceSection: "句子", commentSection: "评论",
      wordSearchPlaceholder: "搜索单词…", imageSearchPlaceholder: "搜索符号…", sentenceSearchPlaceholder: "搜索句子…", commentSearchPlaceholder: "搜索评论…",
      fullDictionary: "全选单词", fullImages: "全选图片", fullSentences: "全选句子", fullComments: "全选评论",
      imageHint: "点击符号展开变体，再选择要导出的图片。", imageLabel: "图片", customDefaultSelected: "当前默认", langAll: "全部语言",
      importTitle: "导入", importHint: "可导入传输文件夹压缩包（.zip）、文件夹或旧版 .json。完全相同的条目会跳过。",
      dropzone: "将传输文件或文件夹拖到这里", importFile: "导入文件", importFolder: "导入文件夹",
      chooseTransferFileFirst: "请先选择传输文件。", importFailed: "导入失败。请使用有效的传输包。",
      nothingSelected: "请至少选择一项再导出。", exportDone: "导出已准备好。",
      importSummary: "已导入 {words} 个词、{images} 张图、{sentences} 句、{comments} 条评论。跳过 {skipped} 个重复项。",
    },
    es: {
      title: "Transferencias", exportTitle: "Exportar", exportHint: "Exportar todo empaqueta palabras, imagenes, oraciones y comentarios en un archivo de carpeta.",
      exportAll: "Exportar todo", advancedSettings: "Ajustes avanzados", exportSelected: "Exportar seleccion",
      dictSection: "Diccionario", imageSection: "Imagenes", sentenceSection: "Oraciones", commentSection: "Comentarios",
      wordSearchPlaceholder: "Buscar palabras…", imageSearchPlaceholder: "Buscar simbolos…", sentenceSearchPlaceholder: "Buscar oraciones…", commentSearchPlaceholder: "Buscar comentarios…",
      fullDictionary: "Seleccionar todas las palabras", fullImages: "Seleccionar todas las imagenes", fullSentences: "Seleccionar todas las oraciones", fullComments: "Seleccionar todos los comentarios",
      imageHint: "Haz clic en un simbolo para abrir variantes y seleccionar imagenes.", imageLabel: "Imagen", customDefaultSelected: "predeterminada", langAll: "Todos los idiomas",
      importTitle: "Importar", importHint: "Importa un archivo .zip de carpeta, una carpeta o un .json antiguo. Los duplicados exactos se omiten.",
      dropzone: "Suelta el archivo o carpeta aqui", importFile: "Importar archivo", importFolder: "Importar carpeta",
      chooseTransferFileFirst: "Elige primero un archivo de transferencia.", importFailed: "Error al importar. Usa un paquete valido.",
      nothingSelected: "Selecciona al menos un elemento.", exportDone: "Exportacion lista.",
      importSummary: "Se importaron {words} palabras, {images} imagenes, {sentences} oraciones, {comments} comentarios. Se omitieron {skipped} duplicados.",
    },
    fr: {
      title: "Transferts", exportTitle: "Exporter", exportHint: "Tout exporter regroupe mots, images, phrases et commentaires dans une archive dossier.",
      exportAll: "Tout exporter", advancedSettings: "Parametres avances", exportSelected: "Exporter la selection",
      dictSection: "Dictionnaire", imageSection: "Images", sentenceSection: "Phrases", commentSection: "Commentaires",
      wordSearchPlaceholder: "Rechercher des mots…", imageSearchPlaceholder: "Rechercher des symboles…", sentenceSearchPlaceholder: "Rechercher des phrases…", commentSearchPlaceholder: "Rechercher des commentaires…",
      fullDictionary: "Tout selectionner (mots)", fullImages: "Tout selectionner (images)", fullSentences: "Tout selectionner (phrases)", fullComments: "Tout selectionner (commentaires)",
      imageHint: "Cliquez un symbole pour ouvrir les variantes, puis selectionnez les images.", imageLabel: "Image", customDefaultSelected: "par defaut", langAll: "Toutes les langues",
      importTitle: "Importer", importHint: "Importez une archive .zip, un dossier ou un ancien .json. Les doublons exacts sont ignores.",
      dropzone: "Deposez le fichier ou dossier ici", importFile: "Importer un fichier", importFolder: "Importer un dossier",
      chooseTransferFileFirst: "Choisissez d'abord un fichier de transfert.", importFailed: "Echec de l'import. Utilisez un paquet valide.",
      nothingSelected: "Selectionnez au moins un element.", exportDone: "Export pret.",
      importSummary: "Import : {words} mots, {images} images, {sentences} phrases, {comments} commentaires. {skipped} doublons ignores.",
    },
    ru: {
      title: "Передача", exportTitle: "Экспорт", exportHint: "Экспорт всего упаковывает слова, изображения, предложения и комментарии в один архив-папку.",
      exportAll: "Экспорт всего", advancedSettings: "Дополнительно", exportSelected: "Экспорт выбранного",
      dictSection: "Словарь", imageSection: "Изображения", sentenceSection: "Предложения", commentSection: "Комментарии",
      wordSearchPlaceholder: "Поиск слов…", imageSearchPlaceholder: "Поиск символов…", sentenceSearchPlaceholder: "Поиск предложений…", commentSearchPlaceholder: "Поиск комментариев…",
      fullDictionary: "Выбрать все слова", fullImages: "Выбрать все изображения", fullSentences: "Выбрать все предложения", fullComments: "Выбрать все комментарии",
      imageHint: "Нажмите символ, чтобы открыть варианты и выбрать изображения.", imageLabel: "Изображение", customDefaultSelected: "по умолчанию", langAll: "Все языки",
      importTitle: "Импорт", importHint: "Импортируйте .zip-архив, папку или старый .json. Точные дубликаты пропускаются.",
      dropzone: "Перетащите файл или папку сюда", importFile: "Импорт файла", importFolder: "Импорт папки",
      chooseTransferFileFirst: "Сначала выберите файл передачи.", importFailed: "Ошибка импорта. Используйте корректный пакет.",
      nothingSelected: "Выберите хотя бы один элемент.", exportDone: "Экспорт готов.",
      importSummary: "Импортировано: слов {words}, изображений {images}, предложений {sentences}, комментариев {comments}. Пропущено дубликатов: {skipped}.",
    },
    de: {
      title: "Transfers", exportTitle: "Export", exportHint: "Alles exportieren packt Wörter, Bilder, Sätze und Kommentare in ein Ordner-Archiv.",
      exportAll: "Alles exportieren", advancedSettings: "Erweiterte Einstellungen", exportSelected: "Auswahl exportieren",
      dictSection: "Wörterbuch", imageSection: "Bilder", sentenceSection: "Sätze", commentSection: "Kommentare",
      wordSearchPlaceholder: "Wörter suchen…", imageSearchPlaceholder: "Symbole suchen…", sentenceSearchPlaceholder: "Sätze suchen…", commentSearchPlaceholder: "Kommentare suchen…",
      fullDictionary: "Alle Wörter auswählen", fullImages: "Alle Bilder auswählen", fullSentences: "Alle Sätze auswählen", fullComments: "Alle Kommentare auswählen",
      imageHint: "Symbol anklicken, Varianten öffnen und Bilder auswählen.", imageLabel: "Bild", customDefaultSelected: "Standard", langAll: "Alle Sprachen",
      importTitle: "Import", importHint: "Importiere ein .zip-Ordnerarchiv, einen Ordner oder ein altes .json. Exakte Duplikate werden übersprungen.",
      dropzone: "Transferdatei oder Ordner hier ablegen", importFile: "Datei importieren", importFolder: "Ordner importieren",
      chooseTransferFileFirst: "Bitte zuerst eine Transferdatei wählen.", importFailed: "Import fehlgeschlagen. Bitte ein gültiges Paket verwenden.",
      nothingSelected: "Bitte mindestens einen Eintrag auswählen.", exportDone: "Export bereit.",
      importSummary: "Importiert: {words} Wörter, {images} Bilder, {sentences} Sätze, {comments} Kommentare. {skipped} Duplikate übersprungen.",
    },
    ja: {
      title: "転送", exportTitle: "エクスポート", exportHint: "すべてエクスポートは辞書・画像・保存文・コメントを1つのフォルダアーカイブにまとめます。",
      exportAll: "すべてエクスポート", advancedSettings: "詳細設定", exportSelected: "選択をエクスポート",
      dictSection: "辞書", imageSection: "画像", sentenceSection: "文", commentSection: "コメント",
      wordSearchPlaceholder: "単語を検索…", imageSearchPlaceholder: "シンボルを検索…", sentenceSearchPlaceholder: "文を検索…", commentSearchPlaceholder: "コメントを検索…",
      fullDictionary: "単語をすべて選択", fullImages: "画像をすべて選択", fullSentences: "文をすべて選択", fullComments: "コメントをすべて選択",
      imageHint: "シンボルをクリックしてバリアントを開き、画像を選択します。", imageLabel: "画像", customDefaultSelected: "既定", langAll: "すべての言語",
      importTitle: "インポート", importHint: "フォルダの .zip、フォルダ、または旧 .json をインポートできます。完全一致はスキップします。",
      dropzone: "転送ファイルまたはフォルダをドロップ", importFile: "ファイルをインポート", importFolder: "フォルダをインポート",
      chooseTransferFileFirst: "先に転送ファイルを選択してください。", importFailed: "インポートに失敗しました。有効なパッケージを使ってください。",
      nothingSelected: "少なくとも1つ選択してください。", exportDone: "エクスポートの準備ができました。",
      importSummary: "インポート: 単語 {words}、画像 {images}、文 {sentences}、コメント {comments}。重複スキップ {skipped}。",
    },
  };

  function getTransfersText() {
    return TRANSFERS_UI_TEXTS[getStoredLang()] || TRANSFERS_UI_TEXTS.en;
  }
  function formatTransfersText(template, data) {
    let out = template || "";
    Object.keys(data || {}).forEach((k) => {
      out = out.replaceAll("{" + k + "}", String(data[k]));
    });
    return out;
  }

  const exportAllBtn = document.getElementById("transfer-export-all");
  const advancedToggle = document.getElementById("transfer-advanced-toggle");
  const exportSelectedBtn = document.getElementById("transfer-export-selected");
  const advancedPanel = document.getElementById("transfer-advanced");
  const wordSearch = document.getElementById("transfer-word-search");
  const fullDictionary = document.getElementById("transfer-full-dictionary");
  const wordList = document.getElementById("transfer-word-list");
  const langFilters = document.getElementById("transfer-lang-filters");
  const imageSearch = document.getElementById("transfer-image-search");
  const fullImages = document.getElementById("transfer-full-images");
  const imageList = document.getElementById("transfer-image-list");
  const sentenceSearch = document.getElementById("transfer-sentence-search");
  const fullSentences = document.getElementById("transfer-full-sentences");
  const sentenceList = document.getElementById("transfer-sentence-list");
  const commentSearch = document.getElementById("transfer-comment-search");
  const fullComments = document.getElementById("transfer-full-comments");
  const commentList = document.getElementById("transfer-comment-list");
  const transferDropzone = document.getElementById("transfer-dropzone");
  const transferImportFile = document.getElementById("transfer-import-file");
  const transferImportFolder = document.getElementById("transfer-import-folder");
  const transferImportFileBtn = document.getElementById("transfer-import-file-btn");
  const transferImportFolderBtn = document.getElementById("transfer-import-folder-btn");

  const selectedWordIds = new Set();
  const selectedImageKeys = new Set();
  const selectedSentenceIds = new Set();
  const selectedCommentIds = new Set();
  const expandedImageSymbols = new Set();
  let activeLangFilter = "all";

  function getEntries() {
    return ensureCoreWordsInDictionary().filter((e) => !e.isCore);
  }
  function getWordLabel(entry) {
    return getEntryDisplayWord(entry, getStoredLang()) || entry.definition || "";
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

  function updateTransfersUiText() {
    const t = getTransfersText();
    const setText = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };
    setText("transfers-title", t.title);
    setText("transfers-export-title", t.exportTitle);
    setText("transfers-export-hint", t.exportHint);
    if (exportAllBtn) exportAllBtn.textContent = t.exportAll;
    if (advancedToggle) advancedToggle.textContent = t.advancedSettings;
    if (exportSelectedBtn) exportSelectedBtn.textContent = t.exportSelected;
    setText("transfers-dict-section-title", t.dictSection);
    setText("transfers-image-section-title", t.imageSection);
    setText("transfers-sentence-section-title", t.sentenceSection);
    setText("transfers-comment-section-title", t.commentSection);
    if (wordSearch) wordSearch.placeholder = t.wordSearchPlaceholder;
    if (imageSearch) imageSearch.placeholder = t.imageSearchPlaceholder;
    if (sentenceSearch) sentenceSearch.placeholder = t.sentenceSearchPlaceholder;
    if (commentSearch) commentSearch.placeholder = t.commentSearchPlaceholder;
    setText("transfers-full-dictionary-label", t.fullDictionary);
    setText("transfers-full-images-label", t.fullImages);
    setText("transfers-full-sentences-label", t.fullSentences);
    setText("transfers-full-comments-label", t.fullComments);
    setText("transfers-image-hint", t.imageHint);
    setText("transfers-import-title", t.importTitle);
    setText("transfers-import-hint", t.importHint);
    if (transferDropzone) transferDropzone.textContent = t.dropzone;
    if (transferImportFileBtn) transferImportFileBtn.textContent = t.importFile;
    if (transferImportFolderBtn) transferImportFolderBtn.textContent = t.importFolder;
    renderLangFilters();
  }

  function renderLangFilters() {
    if (!langFilters) return;
    const t = getTransfersText();
    const langs = ["all"].concat(Object.keys(LANGUAGES));
    langFilters.innerHTML = "";
    langs.forEach((code) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "transfer-lang-chip" + (activeLangFilter === code ? " is-active" : "");
      btn.textContent = code === "all" ? t.langAll : (LANGUAGES[code] || code);
      btn.addEventListener("click", () => {
        activeLangFilter = code;
        renderLangFilters();
        renderWordList();
      });
      langFilters.appendChild(btn);
    });
  }

  function renderWordList() {
    if (!wordList) return;
    const q = (wordSearch && wordSearch.value || "").trim().toLowerCase();
    wordList.innerHTML = "";
    getEntries().forEach((entry) => {
      const origin = entry.originLanguage || entry.translationSource || "en";
      if (activeLangFilter !== "all" && origin !== activeLangFilter) return;
      const labelWord = getWordLabel(entry);
      if (q && !labelWord.toLowerCase().includes(q)) return;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "transfer-item";
      row.textContent = labelWord + (origin && origin !== "en" ? " · " + (LANGUAGES[origin] || origin) : "");
      if (selectedWordIds.has(entry._entryId)) row.classList.add("is-selected");
      row.addEventListener("click", () => {
        if (selectedWordIds.has(entry._entryId)) selectedWordIds.delete(entry._entryId);
        else selectedWordIds.add(entry._entryId);
        renderWordList();
      });
      wordList.appendChild(row);
    });
  }

  function renderImageList() {
    if (!imageList) return;
    const map = getCustomImageMap();
    const q = (imageSearch && imageSearch.value || "").trim().toLowerCase();
    const t = getTransfersText();
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
          item.textContent = t.imageLabel + " " + (idx + 1) + (map[id].selected === idx ? " (" + t.customDefaultSelected + ")" : "");
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

  function renderSentenceList() {
    if (!sentenceList) return;
    const q = (sentenceSearch && sentenceSearch.value || "").trim().toLowerCase();
    sentenceList.innerHTML = "";
    loadTransferSentences().forEach((entry) => {
      if (!entry || !entry.id) return;
      const label = (entry.sentenceText || entry.sentenceNorm || "") +
        " [" + (entry.inputLang || "?") + "→" + (entry.outputLang || "?") + "]";
      if (q && !label.toLowerCase().includes(q)) return;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "transfer-item";
      row.textContent = label;
      if (selectedSentenceIds.has(entry.id)) row.classList.add("is-selected");
      row.addEventListener("click", () => {
        if (selectedSentenceIds.has(entry.id)) selectedSentenceIds.delete(entry.id);
        else selectedSentenceIds.add(entry.id);
        renderSentenceList();
      });
      sentenceList.appendChild(row);
    });
  }

  function renderCommentList() {
    if (!commentList) return;
    const q = (commentSearch && commentSearch.value || "").trim().toLowerCase();
    const comments = loadTransferComments();
    const byId = new Map(comments.map((c) => [String(c.id), c]));
    commentList.innerHTML = "";
    comments.forEach((entry) => {
      if (!entry || entry.id == null) return;
      const parent = entry.parentId != null ? byId.get(String(entry.parentId)) : null;
      const label = (entry.parentId != null ? "↳ " : "") +
        (entry.createdBy || "Anonymous") + ": " + (entry.text || "") +
        " (" + (Number(entry.score) || 0) + ")" +
        (parent ? " · @" + (parent.createdBy || "Anonymous") : "");
      if (q && !label.toLowerCase().includes(q)) return;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "transfer-item";
      row.textContent = label;
      const id = String(entry.id);
      if (selectedCommentIds.has(id)) row.classList.add("is-selected");
      row.addEventListener("click", () => {
        if (selectedCommentIds.has(id)) selectedCommentIds.delete(id);
        else selectedCommentIds.add(id);
        renderCommentList();
      });
      commentList.appendChild(row);
    });
  }

  function getSelectedWords(all) {
    const entries = getEntries();
    if (all) return entries.map(serializeTransferWord).filter(Boolean);
    const map = {};
    entries.forEach((e) => { map[e._entryId] = e; });
    return Array.from(selectedWordIds).map((id) => serializeTransferWord(map[id])).filter(Boolean);
  }

  function getSelectedImages(all) {
    const source = getCustomImageMap();
    const selected = {};
    if (all) {
      Object.keys(source).forEach((id) => {
        selected[id] = {
          selected: source[id].selected || 0,
          customImages: source[id].customImages.slice(),
        };
      });
      return selected;
    }
    selectedImageKeys.forEach((key) => {
      const parts = key.split("::");
      const id = parts[0];
      const idx = parseInt(parts[1], 10);
      const cfg = source[id];
      if (!cfg || !cfg.customImages[idx]) return;
      if (!selected[id]) selected[id] = { selected: 0, customImages: [], _orig: [] };
      selected[id].customImages.push(cfg.customImages[idx]);
      selected[id]._orig.push(idx);
    });
    Object.keys(selected).forEach((id) => {
      const originalSelected = source[id] ? source[id].selected : 0;
      const pos = selected[id]._orig.indexOf(originalSelected);
      selected[id].selected = pos >= 0 ? pos : 0;
      delete selected[id]._orig;
    });
    return selected;
  }

  function getSelectedSentences(all) {
    const list = loadTransferSentences();
    if (all) return list.slice();
    return list.filter((entry) => entry && selectedSentenceIds.has(entry.id));
  }

  function getSelectedComments(all) {
    const list = loadTransferComments();
    if (all) return list.slice();
    const selected = new Set(selectedCommentIds);
    // Include parents of selected replies so threads stay intact.
    list.forEach((entry) => {
      if (!entry || !selected.has(String(entry.id))) return;
      let parentId = entry.parentId;
      while (parentId != null) {
        selected.add(String(parentId));
        const parent = list.find((c) => String(c.id) === String(parentId));
        parentId = parent ? parent.parentId : null;
      }
    });
    return list.filter((entry) => entry && selected.has(String(entry.id)));
  }

  async function buildTransferZipFiles(payload) {
    const encoder = new TextEncoder();
    const files = [];
    const sections = [];
    if (payload.dictionary && payload.dictionary.length) sections.push("dictionary");
    if (payload.images && Object.keys(payload.images).length) sections.push("images");
    if (payload.sentences && payload.sentences.length) sections.push("sentences");
    if (payload.comments && payload.comments.length) sections.push("comments");

    files.push({
      name: "manifest.json",
      data: encoder.encode(JSON.stringify({
        type: TRANSFER_PACKAGE_TYPE,
        version: TRANSFER_PACKAGE_VERSION,
        sections,
        exportedAt: new Date().toISOString(),
      }, null, 2)),
    });

    if (sections.includes("dictionary")) {
      const lines = payload.dictionary.map((word) => JSON.stringify(word)).join("\n");
      files.push({ name: "dictionary/words.jsonl", data: encoder.encode(lines) });
    }

    if (sections.includes("images")) {
      const imageIndex = {};
      const ids = Object.keys(payload.images);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const cfg = payload.images[id];
        const variants = [];
        for (let idx = 0; idx < cfg.customImages.length; idx++) {
          const dataUrl = cfg.customImages[idx];
          const hash = await hashImageDataUrl(dataUrl);
          const fileName = idx + ".dataurl";
          const rel = "images/" + id + "/" + fileName;
          files.push({ name: rel, data: encoder.encode(String(dataUrl)) });
          variants.push({ file: fileName, hash });
        }
        imageIndex[id] = { selected: cfg.selected || 0, variants };
      }
      files.push({
        name: "images/index.json",
        data: encoder.encode(JSON.stringify(imageIndex, null, 2)),
      });
    }

    if (sections.includes("sentences")) {
      files.push({
        name: "sentences/sentences.json",
        data: encoder.encode(JSON.stringify(payload.sentences, null, 2)),
      });
    }

    if (sections.includes("comments")) {
      files.push({
        name: "comments/comments.json",
        data: encoder.encode(JSON.stringify(payload.comments, null, 2)),
      });
    }

    return files;
  }

  async function exportTransferPackage(options) {
    const all = !!(options && options.all);
    const dictionary = getSelectedWords(all);
    const images = getSelectedImages(all);
    const sentences = getSelectedSentences(all);
    const comments = getSelectedComments(all);
    if (!dictionary.length && !Object.keys(images).length && !sentences.length && !comments.length) {
      alert(getTransfersText().nothingSelected);
      return;
    }
    const files = await buildTransferZipFiles({ dictionary, images, sentences, comments });
    const blob = buildStoreZip(files);
    triggerDownload("kanji-builder-transfer.zip", blob);
  }

  function normalizePackageFromLegacyJson(data) {
    return {
      dictionary: Array.isArray(data.dictionary) ? data.dictionary : [],
      images: data.images && typeof data.images === "object" ? data.images : {},
      sentences: Array.isArray(data.sentences) ? data.sentences : [],
      comments: Array.isArray(data.comments) ? data.comments : [],
    };
  }

  async function packageFromZipBytes(buffer) {
    const zipFiles = parseStoreZip(buffer);
    const names = Object.keys(zipFiles);
    if (!names.length) throw new Error("empty zip");
    const readText = (path) => {
      const exact = zipFiles[path];
      if (exact) return uint8ToText(exact);
      const match = names.find((name) => name === path || name.endsWith("/" + path) || name.endsWith(path));
      return match ? uint8ToText(zipFiles[match]) : "";
    };
    const findBySuffix = (suffix) => names.filter((name) => name.replace(/\\/g, "/").endsWith(suffix));

    let dictionary = [];
    const wordsText = readText("dictionary/words.jsonl") || readText("words.jsonl");
    if (wordsText) {
      wordsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
        try { dictionary.push(JSON.parse(line)); } catch { /* ignore */ }
      });
    }

    const images = {};
    const indexText = readText("images/index.json");
    if (indexText) {
      const index = JSON.parse(indexText);
      Object.keys(index || {}).forEach((id) => {
        const cfg = index[id] || {};
        const variants = Array.isArray(cfg.variants) ? cfg.variants : [];
        const customImages = variants.map((variant) => {
          const file = variant && variant.file ? String(variant.file) : "";
          return readText("images/" + id + "/" + file) || readText(id + "/" + file);
        }).filter(Boolean);
        if (customImages.length) {
          images[id] = {
            selected: Number.isFinite(cfg.selected) ? cfg.selected : 0,
            customImages,
          };
        }
      });
    } else {
      // Folder of raw dataurl files without index.
      findBySuffix(".dataurl").forEach((path) => {
        const parts = path.replace(/\\/g, "/").split("/");
        const file = parts[parts.length - 1];
        const id = parts[parts.length - 2];
        if (!id || !file) return;
        if (!images[id]) images[id] = { selected: 0, customImages: [] };
        images[id].customImages.push(uint8ToText(zipFiles[path]));
      });
    }

    let sentences = [];
    const sentencesText = readText("sentences/sentences.json") || readText("sentences.json");
    if (sentencesText) {
      try {
        const parsed = JSON.parse(sentencesText);
        if (Array.isArray(parsed)) sentences = parsed;
      } catch { /* ignore */ }
    }

    let comments = [];
    const commentsText = readText("comments/comments.json") || readText("comments.json");
    if (commentsText) {
      try {
        const parsed = JSON.parse(commentsText);
        if (Array.isArray(parsed)) comments = parsed;
      } catch { /* ignore */ }
    }

    // Legacy single JSON stored inside zip.
    const legacyJsonName = names.find((name) => /(^|\/)(transfer_all|images_export)\.json$/i.test(name) || name === "package.json");
    if (legacyJsonName && !dictionary.length && !Object.keys(images).length) {
      try {
        return normalizePackageFromLegacyJson(JSON.parse(uint8ToText(zipFiles[legacyJsonName])));
      } catch { /* ignore */ }
    }

    return { dictionary, images, sentences, comments };
  }

  async function packageFromFileList(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) throw new Error("no files");
    if (files.length === 1 && /\.zip$/i.test(files[0].name || "")) {
      return packageFromZipBytes(await files[0].arrayBuffer());
    }
    if (files.length === 1 && /\.json$/i.test(files[0].name || "")) {
      return normalizePackageFromLegacyJson(JSON.parse(await files[0].text()));
    }

    const byPath = {};
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = (file.webkitRelativePath || file.name || "").replace(/\\/g, "/");
      byPath[path] = file;
    }
    const paths = Object.keys(byPath);
    const findPath = (suffix) => paths.find((p) => p === suffix || p.endsWith("/" + suffix));
    const readText = async (suffix) => {
      const path = findPath(suffix);
      return path ? await byPath[path].text() : "";
    };

    let dictionary = [];
    const wordsText = await readText("dictionary/words.jsonl") || await readText("words.jsonl");
    if (wordsText) {
      wordsText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).forEach((line) => {
        try { dictionary.push(JSON.parse(line)); } catch { /* ignore */ }
      });
    }

    const images = {};
    const indexText = await readText("images/index.json");
    if (indexText) {
      const index = JSON.parse(indexText);
      const ids = Object.keys(index || {});
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const cfg = index[id] || {};
        const variants = Array.isArray(cfg.variants) ? cfg.variants : [];
        const customImages = [];
        for (let v = 0; v < variants.length; v++) {
          const fileName = variants[v] && variants[v].file ? String(variants[v].file) : "";
          const text = await readText("images/" + id + "/" + fileName);
          if (text) customImages.push(text);
        }
        if (customImages.length) {
          images[id] = {
            selected: Number.isFinite(cfg.selected) ? cfg.selected : 0,
            customImages,
          };
        }
      }
    }

    let sentences = [];
    const sentencesText = await readText("sentences/sentences.json");
    if (sentencesText) {
      try {
        const parsed = JSON.parse(sentencesText);
        if (Array.isArray(parsed)) sentences = parsed;
      } catch { /* ignore */ }
    }

    let comments = [];
    const commentsText = await readText("comments/comments.json");
    if (commentsText) {
      try {
        const parsed = JSON.parse(commentsText);
        if (Array.isArray(parsed)) comments = parsed;
      } catch { /* ignore */ }
    }

    return { dictionary, images, sentences, comments };
  }

  async function importTransferPackage(pkg) {
    let addedWords = 0;
    let addedImages = 0;
    let addedSentences = 0;
    let addedComments = 0;
    let skipped = 0;

    if (Array.isArray(pkg.dictionary) && pkg.dictionary.length) {
      const entries = ensureCoreWordsInDictionary();
      ensureEntryIds(entries);
      const existing = new Set(entries.filter((e) => !e.isCore).map(getTransferWordFingerprint));
      pkg.dictionary.forEach((obj) => {
        const incoming = Object.assign({}, serializeTransferWord(obj), { _entryId: makeEntryId(), isCore: false });
        if (!incoming.definition) return;
        const fp = getTransferWordFingerprint(incoming);
        if (existing.has(fp)) {
          skipped++;
          return;
        }
        existing.add(fp);
        entries.push(incoming);
        addedWords++;
      });
      localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    }

    if (pkg.images && typeof pkg.images === "object") {
      const map = getStoredCustomSymbolImages();
      const ids = Object.keys(pkg.images);
      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        const incoming = pkg.images[id] || {};
        const incomingImages = Array.isArray(incoming.customImages) ? incoming.customImages.filter(Boolean) : [];
        if (!incomingImages.length) continue;
        if (!map[id]) map[id] = { selected: 0, customImages: [] };
        const existingHashes = new Set();
        for (let e = 0; e < map[id].customImages.length; e++) {
          existingHashes.add(await hashImageDataUrl(map[id].customImages[e]));
        }
        for (let n = 0; n < incomingImages.length; n++) {
          const hash = await hashImageDataUrl(incomingImages[n]);
          if (existingHashes.has(hash)) {
            skipped++;
            continue;
          }
          existingHashes.add(hash);
          map[id].customImages.push(incomingImages[n]);
          addedImages++;
        }
        if (Number.isFinite(incoming.selected)) {
          map[id].selected = Math.max(0, Math.min(incoming.selected, map[id].customImages.length));
        }
      }
      saveStoredCustomSymbolImages(map);
    }

    if (Array.isArray(pkg.sentences) && pkg.sentences.length) {
      const list = loadTransferSentences();
      const existing = new Set(list.map(getTransferSentenceFingerprint));
      pkg.sentences.forEach((entry) => {
        if (!entry) return;
        const incoming = Object.assign({}, entry);
        if (!incoming.id) incoming.id = "wsc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        const fp = getTransferSentenceFingerprint(incoming);
        if (existing.has(fp)) {
          skipped++;
          return;
        }
        existing.add(fp);
        list.push(incoming);
        addedSentences++;
      });
      saveTransferSentences(list);
    }

    if (Array.isArray(pkg.comments) && pkg.comments.length) {
      const list = loadTransferComments();
      const existing = new Set(list.map(getTransferCommentFingerprint));
      const usedIds = new Set(list.map((c) => String(c.id)));
      const idMap = {};
      pkg.comments.forEach((entry) => {
        if (!entry) return;
        const incoming = Object.assign({}, entry);
        const fp = getTransferCommentFingerprint(incoming);
        if (existing.has(fp)) {
          skipped++;
          return;
        }
        const oldId = incoming.id != null ? String(incoming.id) : "";
        if (!oldId || usedIds.has(oldId)) {
          incoming.id = "c_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
        }
        if (oldId) idMap[oldId] = String(incoming.id);
        existing.add(fp);
        usedIds.add(String(incoming.id));
        list.push(incoming);
        addedComments++;
      });
      list.forEach((entry) => {
        if (!entry || entry.parentId == null) return;
        const mapped = idMap[String(entry.parentId)];
        if (mapped) entry.parentId = mapped;
      });
      saveTransferComments(list);
    }

    alert(formatTransfersText(getTransfersText().importSummary, {
      words: addedWords,
      images: addedImages,
      sentences: addedSentences,
      comments: addedComments,
      skipped,
    }));
    renderWordList();
    renderImageList();
    renderSentenceList();
    renderCommentList();
  }

  async function importFromFiles(fileList) {
    try {
      const pkg = await packageFromFileList(fileList);
      await importTransferPackage(pkg);
    } catch (err) {
      console.error(err);
      alert(getTransfersText().importFailed);
    }
  }

  if (advancedToggle && advancedPanel) {
    advancedToggle.addEventListener("click", () => {
      advancedPanel.classList.toggle("hidden");
      if (exportSelectedBtn) exportSelectedBtn.classList.toggle("hidden", advancedPanel.classList.contains("hidden"));
    });
  }
  if (exportAllBtn) exportAllBtn.addEventListener("click", () => exportTransferPackage({ all: true }));
  if (exportSelectedBtn) exportSelectedBtn.addEventListener("click", () => exportTransferPackage({ all: false }));

  if (wordSearch) wordSearch.addEventListener("input", renderWordList);
  if (imageSearch) imageSearch.addEventListener("input", renderImageList);
  if (sentenceSearch) sentenceSearch.addEventListener("input", renderSentenceList);
  if (commentSearch) commentSearch.addEventListener("input", renderCommentList);

  if (fullDictionary) {
    fullDictionary.addEventListener("change", () => {
      selectedWordIds.clear();
      if (fullDictionary.checked) {
        getEntries().forEach((entry) => {
          const origin = entry.originLanguage || entry.translationSource || "en";
          if (activeLangFilter === "all" || origin === activeLangFilter) selectedWordIds.add(entry._entryId);
        });
      }
      renderWordList();
    });
  }
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
  if (fullSentences) {
    fullSentences.addEventListener("change", () => {
      selectedSentenceIds.clear();
      if (fullSentences.checked) loadTransferSentences().forEach((entry) => entry && entry.id && selectedSentenceIds.add(entry.id));
      renderSentenceList();
    });
  }
  if (fullComments) {
    fullComments.addEventListener("change", () => {
      selectedCommentIds.clear();
      if (fullComments.checked) loadTransferComments().forEach((entry) => entry && entry.id != null && selectedCommentIds.add(String(entry.id)));
      renderCommentList();
    });
  }

  if (transferImportFileBtn && transferImportFile) {
    transferImportFileBtn.addEventListener("click", () => transferImportFile.click());
    transferImportFile.addEventListener("change", async () => {
      if (!transferImportFile.files || !transferImportFile.files.length) return;
      await importFromFiles(transferImportFile.files);
      transferImportFile.value = "";
    });
  }
  if (transferImportFolderBtn && transferImportFolder) {
    transferImportFolderBtn.addEventListener("click", () => transferImportFolder.click());
    transferImportFolder.addEventListener("change", async () => {
      if (!transferImportFolder.files || !transferImportFolder.files.length) return;
      await importFromFiles(transferImportFolder.files);
      transferImportFolder.value = "";
    });
  }
  if (transferDropzone) {
    transferDropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      transferDropzone.classList.add("is-dragover");
    });
    transferDropzone.addEventListener("dragleave", () => transferDropzone.classList.remove("is-dragover"));
    transferDropzone.addEventListener("drop", async (e) => {
      e.preventDefault();
      transferDropzone.classList.remove("is-dragover");
      const files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) await importFromFiles(files);
    });
  }

  updateTransfersUiText();
  renderWordList();
  renderImageList();
  renderSentenceList();
  renderCommentList();
  window.onLanguageChange = () => {
    updateTransfersUiText();
    renderWordList();
    renderImageList();
    renderSentenceList();
    renderCommentList();
  };
}




/* --------------------------------
   DICTIONARY PAGE
-------------------------------- */
if (page === "dictionary") {
  const DICTIONARY_PAGE_SIZE = 1000;
  const CORE_PRONUNCIATION_OVERRIDES = {
    zh: {
      "Semi Solid": ["dictionary.pinyin", "bàn gù tǐ"],
      Creator: ["dictionary.pinyin", "chuàng zào zhě"],
      Square: ["dictionary.pinyin", "fāng xíng"],
      Aggressive: ["dictionary.pinyin", "gōng jī xìng"],
      Bone: ["dictionary.pinyin", "gǔ"],
      Interlock: ["dictionary.pinyin", "hù suǒ"],
      Slip: ["dictionary.pinyin", "huá dòng"],
      Amphibian: ["dictionary.pinyin", "liǎng qī dòng wù"],
      Animal: ["dictionary.pinyin", "lù dì dòng wù"],
      Magenta: ["dictionary.pinyin", "pǐn hóng sè"],
      Reptile: ["dictionary.pinyin", "pá xíng dòng wù"],
      Cyan: ["dictionary.pinyin", "qīng sè"],
      Curve: ["dictionary.pinyin", "qū xiàn"],
      Cord: ["dictionary.pinyin", "shéng"],
      Human: ["dictionary.pinyin", "rén tǐ"],
      Playful: ["dictionary.pinyin", "wán lè"],
      Micro: ["dictionary.pinyin", "wēi xiǎo"],
      Crushed: ["dictionary.pinyin", "yā suì"],
      Stripe: ["dictionary.pinyin", "tiáo wén"],
      Gravity: ["dictionary.pinyin", "zhòng lì"],
      "Plant Product": ["dictionary.pinyin", "zhí wù zhì pǐn"],
      "Winged Creature": ["dictionary.pinyin", "yǒu yì shēng wù"],
      "Water Creature": ["dictionary.pinyin", "shuǐ shēng shēng wù"],
      Sticky: ["dictionary.pinyin", "zhān"],
    },
    ja: {
      Reptile: ["dictionary.hiragana", "はちゅうるい"],
      Cyan: ["dictionary.hiragana", "しあん"],
      Sexy: ["dictionary.hiragana", "せくしー"],
      Negative: ["dictionary.hiragana", "ねがてぃぶ"],
      Positive: ["dictionary.hiragana", "ぽじてぃぶ"],
      Magenta: ["dictionary.hiragana", "まぜんた"],
      Crushed: ["dictionary.hiragana", "おしつぶす"],
      Wishful: ["dictionary.hiragana", "がんぼう"],
      Surprise: ["dictionary.hiragana", "おどろき"],
      Curve: ["dictionary.hiragana", "きょくせん"],
      Tilt: ["dictionary.hiragana", "かたむき"],
      Aggressive: ["dictionary.hiragana", "こうげきてき"],
      Brown: ["dictionary.hiragana", "ちゃ"],
      Fight: ["dictionary.hiragana", "たたかう"],
      Creator: ["dictionary.hiragana", "そうぞうしゃ"],
      Playful: ["dictionary.hiragana", "あそびごころ"],
      "Water Creature": ["dictionary.hiragana", "すいせいせいぶつ"],
      "Winged Creature": ["dictionary.hiragana", "つばさのあるせいぶつ"],
      Animal: ["dictionary.hiragana", "りくじょうどうぶつ"],
      Amphibian: ["dictionary.hiragana", "りょうせいるい"],
      Interlock: ["dictionary.hiragana", "れんけつ"],
      "Semi Solid": ["dictionary.hiragana", "はんこたい"],
      Reflect: ["dictionary.hiragana", "はんしゃ"],
      Sticky: ["dictionary.hiragana", "ねばる"],
      "Plant Product": ["dictionary.hiragana", "しょくぶつせいひん"],
      Stripe: ["dictionary.hiragana", "しま"],
      Micro: ["dictionary.hiragana", "びしょう"],
    },
  };
  const list = document.getElementById("dictionary-list");
  const searchBar = document.getElementById("search-bar");
  const hideCoreWordsCheckbox = document.getElementById("hide-core-words");
  const checkExceptionsCheckbox = document.getElementById("check-exceptions");
  const exceptionsModeSelect = document.getElementById("exceptions-mode-select");
  const exceptionsCountsEl = document.getElementById("dictionary-exceptions-counts");
  const stampFilter = document.getElementById("dictionary-stamp-filter");
  const languageFilter = document.getElementById("dictionary-language-filter");
  const languageOptions = document.getElementById("dictionary-language-options");
  const resultsStatus = document.getElementById("dictionary-results-status");
  const pagePrevButtons = [
    document.getElementById("dictionary-page-prev-top"),
    document.getElementById("dictionary-page-prev-bottom"),
  ].filter(Boolean);
  const pageNextButtons = [
    document.getElementById("dictionary-page-next-top"),
    document.getElementById("dictionary-page-next-bottom"),
  ].filter(Boolean);
  const pageInputs = [
    document.getElementById("dictionary-page-input-top"),
    document.getElementById("dictionary-page-input-bottom"),
  ].filter(Boolean);
  const pageTotals = [
    document.getElementById("dictionary-page-total-top"),
    document.getElementById("dictionary-page-total-bottom"),
  ].filter(Boolean);
  const worldDictionaryRows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
  const worldOrderCache = { en: worldDictionaryRows };
  const selectedPairs = new Set();
  const PASSWORD = ADMIN_PASSWORD;
  const EXCEPTION_LEVEL_ORDER = { red: 0, yellow: 1, blue: 2, green: 3 };
  const approvedExceptions = loadApprovedExceptionsMap();
  const hiddenWorldLines = new Set(JSON.parse(localStorage.getItem(HIDDEN_WORLD_LINES_KEY) || "[]"));
  let activeExceptionGroup = null;
  let activeExceptionItem = null;
  let currentPage = 1;
  let searchTimer = null;
  let coreCatalogIndex = null;
  let dictionaryLoadingCount = 0;
  const dictionaryLoadingEl = document.getElementById("dictionary-loading");
  const dictionaryLoadingLabel = document.getElementById("dictionary-loading-label");
  const dictionaryLoadingBarOverall = document.getElementById("dictionary-loading-bar-overall");
  const dictionaryLoadingPercent = document.getElementById("dictionary-loading-percent");
  let dictionaryLoadingLabelKey = "";
  let dictionaryLoadingOverall = 0;
  let dictionaryLoadingOverallTarget = 0;
  let dictionaryLoadingOverallCurrent = 0;
  let dictionaryLoadingAnimHandle = 0;
  const DICTIONARY_LOAD_YIELD_MS = 14;
  const DICTIONARY_WORLD_CHUNK = 4000;
  let dictionaryLoadToken = 0;
  let dictionaryViewCache = null;

  function yieldDictionaryUi(ms) {
    const delay = ms == null ? DICTIONARY_LOAD_YIELD_MS : ms;
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => window.setTimeout(resolve, delay));
    });
  }

  function paintDictionaryLoadingBars() {
    if (dictionaryLoadingBarOverall) {
      dictionaryLoadingBarOverall.style.width = dictionaryLoadingOverallCurrent.toFixed(1) + "%";
    }
    if (dictionaryLoadingPercent) {
      const shown = Math.round(dictionaryLoadingOverallCurrent);
      dictionaryLoadingPercent.textContent =
        formatDictionaryText("dictionary.loadingProgress", { percent: shown }) || (shown + "%");
    }
  }

  function tickDictionaryLoadingAnimation() {
    const ease = 0.12;
    dictionaryLoadingOverallCurrent += (dictionaryLoadingOverallTarget - dictionaryLoadingOverallCurrent) * ease;
    paintDictionaryLoadingBars();
    const overallDone = Math.abs(dictionaryLoadingOverallTarget - dictionaryLoadingOverallCurrent) < 0.35;
    if (!overallDone && dictionaryLoadingCount > 0) {
      dictionaryLoadingAnimHandle = window.requestAnimationFrame(tickDictionaryLoadingAnimation);
      return;
    }
    dictionaryLoadingAnimHandle = 0;
    dictionaryLoadingOverallCurrent = dictionaryLoadingOverallTarget;
    paintDictionaryLoadingBars();
  }

  function ensureDictionaryLoadingAnimation() {
    if (!dictionaryLoadingAnimHandle && dictionaryLoadingCount > 0) {
      dictionaryLoadingAnimHandle = window.requestAnimationFrame(tickDictionaryLoadingAnimation);
    }
  }

  function setDictionaryLoadingProgress(stagePercent, labelKey, overallPercent) {
    if (!dictionaryLoadingEl) return;
    let overall = Math.max(0, Math.min(100, Math.round(
      overallPercent == null ? (stagePercent == null ? 0 : stagePercent) : overallPercent
    )));
    overall = Math.max(dictionaryLoadingOverall, overall);
    dictionaryLoadingOverall = overall;
    dictionaryLoadingOverallTarget = overall;
    if (labelKey && labelKey !== dictionaryLoadingLabelKey) {
      dictionaryLoadingLabelKey = labelKey;
    }
    if (dictionaryLoadingLabel) {
      dictionaryLoadingLabel.textContent =
        getTranslation(labelKey || dictionaryLoadingLabelKey || "dictionary.loadingWords") || "Loading words…";
    }
    ensureDictionaryLoadingAnimation();
    dictionaryLoadingEl.setAttribute("aria-busy", overall < 100 ? "true" : "false");
  }

  function showDictionaryLoading(labelKey) {
    dictionaryLoadingCount += 1;
    if (!dictionaryLoadingEl) return;
    dictionaryLoadingEl.classList.remove("hidden");
    dictionaryLoadingLabelKey = labelKey || "dictionary.loadingWords";
    if (dictionaryLoadingCount === 1) {
      dictionaryLoadingOverall = 0;
      dictionaryLoadingOverallTarget = 0;
      dictionaryLoadingOverallCurrent = 0;
      if (dictionaryLoadingBarOverall) dictionaryLoadingBarOverall.style.width = "0%";
      if (dictionaryLoadingPercent) {
        dictionaryLoadingPercent.textContent =
          formatDictionaryText("dictionary.loadingProgress", { percent: 0 }) || "0%";
      }
      ensureDictionaryLoadingAnimation();
    }
    if (dictionaryLoadingLabel) {
      dictionaryLoadingLabel.textContent =
        getTranslation(dictionaryLoadingLabelKey) || "Loading words…";
    }
    dictionaryLoadingEl.setAttribute("aria-busy", "true");
  }

  function hideDictionaryLoading() {
    dictionaryLoadingCount = Math.max(0, dictionaryLoadingCount - 1);
    if (dictionaryLoadingCount > 0 || !dictionaryLoadingEl) return;
    if (dictionaryLoadingAnimHandle) {
      window.cancelAnimationFrame(dictionaryLoadingAnimHandle);
      dictionaryLoadingAnimHandle = 0;
    }
    dictionaryLoadingEl.classList.add("hidden");
    dictionaryLoadingEl.setAttribute("aria-busy", "false");
    dictionaryLoadingLabelKey = "";
    dictionaryLoadingOverall = 0;
    dictionaryLoadingOverallTarget = 0;
    dictionaryLoadingOverallCurrent = 0;
    if (dictionaryLoadingBarOverall) dictionaryLoadingBarOverall.style.width = "0%";
  }

  ensureCoreWordsInDictionary();

  function formatDictionaryText(path, values) {
    let text = getTranslation(path);
    Object.keys(values || {}).forEach((key) => {
      text = text.replaceAll("{" + key + "}", String(values[key]));
    });
    return text;
  }

  function applyUiLanguageDictionaryDefaults() {
    selectedPairs.clear();
    getDefaultDictionaryPairIdsForUiLang(getStoredLang()).forEach((id) => selectedPairs.add(id));
  }

  function isWorldDictionarySelected() {
    const all = getAllDictionaryPairIds();
    return all.length > 0 && all.every((id) => selectedPairs.has(id));
  }

  function setWorldDictionarySelected(on) {
    selectedPairs.clear();
    if (on) {
      getAllDictionaryPairIds().forEach((id) => selectedPairs.add(id));
    } else {
      getDefaultDictionaryPairIdsForUiLang(getStoredLang()).forEach((id) => selectedPairs.add(id));
    }
  }

  function buildLanguageOptions() {
    if (!languageOptions) return;
    languageOptions.innerHTML = "";
    const uiLang = getStoredLang();

    const worldLabel = document.createElement("label");
    worldLabel.className = "dictionary-language-world";
    const worldCheckbox = document.createElement("input");
    worldCheckbox.type = "checkbox";
    worldCheckbox.checked = isWorldDictionarySelected();
    worldCheckbox.addEventListener("change", () => {
      setWorldDictionarySelected(worldCheckbox.checked);
      buildLanguageOptions();
      currentPage = 1;
      loadEntries();
    });
    worldLabel.appendChild(worldCheckbox);
    worldLabel.appendChild(document.createTextNode(
      getTranslation("dictionary.worldDictionary") || "World Dictionary"
    ));
    languageOptions.appendChild(worldLabel);

    getOrderedDictionaryPairIds(uiLang).forEach((pairId) => {
      const label = document.createElement("label");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = pairId;
      checkbox.checked = selectedPairs.has(pairId);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) selectedPairs.add(pairId);
        else selectedPairs.delete(pairId);
        buildLanguageOptions();
        currentPage = 1;
        loadEntries();
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(formatLanguagePairLabel(pairId, uiLang)));
      languageOptions.appendChild(label);
    });
  }

  function buildExceptionsModeSelect() {
    if (!exceptionsModeSelect) return;
    const saved = exceptionsModeSelect.value || "symbols";
    exceptionsModeSelect.innerHTML = "";
    const symbolsOpt = document.createElement("option");
    symbolsOpt.value = "symbols";
    symbolsOpt.textContent = getTranslation("dictionary.exceptionsSymbols") || "Symbols";
    exceptionsModeSelect.appendChild(symbolsOpt);
    const starsOpt = document.createElement("option");
    starsOpt.value = "stars";
    starsOpt.textContent = getTranslation("dictionary.exceptionsStars") || "Star";
    exceptionsModeSelect.appendChild(starsOpt);
    Object.keys(LANGUAGES).forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LANGUAGES[code];
      exceptionsModeSelect.appendChild(opt);
    });
    const allowed = saved === "symbols" || saved === "stars" || LANGUAGES[saved];
    exceptionsModeSelect.value = allowed ? saved : "symbols";
  }

  function getEntryOriginLang(entry) {
    if (!entry) return "en";
    if (entry.isCore) return "core";
    return entry.originLanguage || entry.translationSource || "en";
  }

  function getStampSymbolKey(entry) {
    return getSymbolsForEntry(entry)
      .slice(0, 4)
      .map((ref) => (ref && ref.id != null ? String(ref.id) : "x"))
      .join("-");
  }

  function loadApprovedExceptionsMap() {
    let raw;
    try {
      raw = JSON.parse(localStorage.getItem(OKAY_EXCEPTIONS_KEY) || "{}");
    } catch {
      raw = {};
    }
    const map = {};
    if (Array.isArray(raw)) {
      raw.forEach((key) => {
        const value = String(key || "");
        map[value] = value.startsWith("red\0") ? "blue" : "green";
      });
    } else if (raw && typeof raw === "object") {
      Object.keys(raw).forEach((key) => {
        const level = raw[key];
        if (level === "blue" || level === "green") map[key] = level;
        else if (String(key).startsWith("red\0")) map[key] = "blue";
        else map[key] = "green";
      });
    }
    return map;
  }

  function saveApprovedExceptions() {
    localStorage.setItem(OKAY_EXCEPTIONS_KEY, JSON.stringify(approvedExceptions));
  }

  function resolveExceptionLevel(baseLevel, key) {
    const approved = approvedExceptions[key];
    if (approved === "blue" || approved === "green") return approved;
    return baseLevel;
  }

  function getExceptionLevelLabel(level) {
    const path = {
      red: "dictionary.redException",
      yellow: "dictionary.yellowException",
      blue: "dictionary.blueException",
      green: "dictionary.greenException",
    }[level];
    const fallback = {
      red: "Red Exception",
      yellow: "Yellow Exception",
      blue: "Blue Exception",
      green: "Green Exception",
    }[level] || "Exception";
    return (path && getTranslation(path)) || fallback;
  }

  function saveHiddenWorldLines() {
    localStorage.setItem(HIDDEN_WORLD_LINES_KEY, JSON.stringify(Array.from(hiddenWorldLines)));
  }

  function exceptionItemId(item) {
    if (!item) return "";
    if (item.type === "local") return "local:" + item.entryId;
    return "world:" + item.worldLine;
  }

  function worldStampKey(stampField) {
    const status = getWorldStampStatus(stampField);
    if (status === "unstamped") return "";
    return String(stampField || "").trim();
  }

  function collectLanguageExceptionCandidates(checkLang) {
    const items = [];
    const coveredWorldKeys = new Set();
    ensureCoreWordsInDictionary().forEach((entry) => {
      if (entry.isCore) return;
      const foreignHub = getEntryForeignHubLang(entry);
      const origin = getEntryOriginLang(entry);
      // Include Language-English and English-Language locals for this hub language.
      if (origin !== checkLang && foreignHub !== checkLang) return;
      const english = normalizeDictionaryWord((entry.translations && entry.translations.en) || entry.definition || "");
      const translation = normalizeDictionaryWord(
        (entry.translations && entry.translations[checkLang]) || entry.definition || ""
      );
      if (!english) return;
      const matchKey = getEntryEnglishHubMatchKey(entry);
      if (matchKey) coveredWorldKeys.add(matchKey);
      items.push({
        type: "local",
        entry,
        entryId: entry._entryId,
        english: (entry.translations && entry.translations.en) || entry.definition || "",
        translation: (entry.translations && entry.translations[checkLang]) || "",
        englishNorm: english,
        translationNorm: translation,
        stampKey: getStampSymbolKey(entry),
        originCode: checkLang,
        pos: [].concat(entry.partOfSpeech || []).join(", "),
      });
    });
    worldDictionaryRows.forEach((line) => {
      if (hiddenWorldLines.has(line)) return;
      if (coveredWorldKeys.has(getWorldLineEnglishHubMatchKey(line))) return;
      const parts = String(line || "").split("\t");
      if (parts.length < 8) return;
      const originCode = WORLD_ORIGIN_TO_LANG[parts[7]];
      if (originCode !== checkLang) return;
      const englishNorm = normalizeDictionaryWord(parts[0] || "");
      const translationNorm = normalizeDictionaryWord(parts[1] || "");
      if (!englishNorm) return;
      items.push({
        type: "world",
        worldLine: line,
        english: parts[0] || "",
        translation: parts[1] || "",
        englishNorm,
        translationNorm,
        stampKey: worldStampKey(parts[6]),
        originCode,
        origin: parts[7] || "",
        pos: parts[5] || "",
        pinyin: parts[2] || "",
        hiragana: parts[3] || "",
        latin: parts[4] || "",
      });
    });
    return items;
  }

  function itemHasPosToken(item, token) {
    const pos = String((item && item.pos) || "");
    return pos.split(/\s*[,&/]\s*/).some((part) => part.trim() === token);
  }

  function translationsDifferOnlyByCase(items) {
    if (!items || items.length < 2) return false;
    const originals = items.map((item) => String(item.translation || "").trim()).filter(Boolean);
    if (originals.length < 2) return false;
    const uniqueExact = new Set(originals);
    if (uniqueExact.size < 2) return false;
    const uniqueFolded = new Set(originals.map((text) => text.toLocaleLowerCase("de")));
    return uniqueFolded.size === 1;
  }

  function shouldAutoOkayLanguageException(checkLang, baseLevel, items) {
    if (checkLang !== "de" || baseLevel !== "red") return false;
    if (!items || !items.length) return false;
    if (items.some((item) => itemHasPosToken(item, "Noun"))) return false;
    return translationsDifferOnlyByCase(items);
  }

  function buildLanguageExceptionGroups(checkLang) {
    const items = collectLanguageExceptionCandidates(checkLang);
    const redBuckets = {};
    const yellowBuckets = {};
    items.forEach((item) => {
      const redKey = "red\0" + item.originCode + "\0" + item.englishNorm + "\0" + item.translationNorm + "\0" + item.stampKey;
      if (!redBuckets[redKey]) redBuckets[redKey] = [];
      redBuckets[redKey].push(item);
      const yellowKey = "yellow\0" + item.originCode + "\0" + item.englishNorm + "\0" + item.stampKey;
      if (!yellowBuckets[yellowKey]) yellowBuckets[yellowKey] = { translations: new Set(), items: [] };
      yellowBuckets[yellowKey].translations.add(item.translationNorm || "");
      yellowBuckets[yellowKey].items.push(item);
    });
    const groups = [];
    let autoOkayChanged = false;
    Object.keys(redBuckets).forEach((key) => {
      if (redBuckets[key].length < 2) return;
      let level = resolveExceptionLevel("red", key);
      if (level === "red" && shouldAutoOkayLanguageException(checkLang, "red", redBuckets[key])) {
        approvedExceptions[key] = "blue";
        level = "blue";
        autoOkayChanged = true;
      }
      groups.push({ level, key, items: redBuckets[key] });
    });
    Object.keys(yellowBuckets).forEach((key) => {
      const bucket = yellowBuckets[key];
      if (bucket.translations.size < 2) return;
      groups.push({ level: resolveExceptionLevel("yellow", key), key, items: bucket.items });
    });
    if (autoOkayChanged) saveApprovedExceptions();
    groups.sort((a, b) => {
      const order = (EXCEPTION_LEVEL_ORDER[a.level] ?? 99) - (EXCEPTION_LEVEL_ORDER[b.level] ?? 99);
      if (order) return order;
      const aEn = (a.items[0] && a.items[0].english) || "";
      const bEn = (b.items[0] && b.items[0].english) || "";
      return aEn.localeCompare(bEn, "en", { sensitivity: "base" });
    });
    return groups;
  }

  function buildSymbolExceptionGroups() {
    const buckets = {};
    ensureCoreWordsInDictionary().forEach((entry) => {
      if (entry.isCore) return;
      const stampKey = getStampSymbolKey(entry);
      if (!stampKey || /^x(-x)*$/.test(stampKey)) return;
      if (!buckets[stampKey]) buckets[stampKey] = [];
      buckets[stampKey].push({
        type: "local",
        entry,
        entryId: entry._entryId,
        english: (entry.translations && entry.translations.en) || entry.definition || "",
        translation: getEntryDisplayWord(entry, getStoredLang()),
        stampKey,
        originCode: getEntryOriginLang(entry),
      });
    });
    const groups = [];
    Object.keys(buckets).forEach((stampKey) => {
      if (buckets[stampKey].length < 2) return;
      const key = "symbols\0" + stampKey;
      groups.push({ level: resolveExceptionLevel("yellow", key), key, items: buckets[stampKey] });
    });
    groups.sort((a, b) => {
      const order = (EXCEPTION_LEVEL_ORDER[a.level] ?? 99) - (EXCEPTION_LEVEL_ORDER[b.level] ?? 99);
      if (order) return order;
      return String(a.key).localeCompare(String(b.key));
    });
    return groups;
  }

  function getExceptionItemSymbolCount(item) {
    if (!item) return 0;
    if (item.type === "local" && item.entry) return getSymbolsForEntry(item.entry).length;
    if (typeof item.symbolCount === "number") return item.symbolCount;
    return 0;
  }

  /** Homograph stars shown on a row: English side + foreign translation side. */
  function getExceptionItemStarCount(item) {
    if (!item) return 0;
    let count = 0;
    const english = item.english || "";
    const translation = item.translation || "";
    const foreignLang = (item.originCode && item.originCode !== "en")
      ? item.originCode
      : ((item.lang && item.lang !== "en") ? item.lang : "");
    if (english && isHomographWord(english, "en")) count += 1;
    if (translation && foreignLang && isHomographWord(translation, foreignLang)) count += 1;
    if (!count && item.lang && item.word && isHomographWord(item.word, item.lang)) count = 1;
    return count;
  }

  function buildStarExceptionGroups() {
    const buckets = {};
    const perGroupCap = 48;

    function ensureBucket(lang, wordNorm, displayWord) {
      const key = "star\0" + lang + "\0" + wordNorm;
      if (!buckets[key]) {
        buckets[key] = {
          key,
          lang,
          wordNorm,
          displayWord: displayWord || wordNorm,
          items: [],
        };
      }
      return buckets[key];
    }

    function pushItem(lang, wordNorm, displayWord, item) {
      if (!isHomographWord(displayWord || wordNorm, lang)) return;
      const bucket = ensureBucket(lang, wordNorm, displayWord);
      if (bucket.items.length >= perGroupCap) return;
      const id = exceptionItemId(item);
      if (id && bucket.items.some((existing) => exceptionItemId(existing) === id)) return;
      bucket.items.push(item);
    }

    ensureCoreWordsInDictionary().forEach((entry) => {
      if (!entry || entry.isCore) return;
      const translations = entry.translations || {};
      const foreignHub = getEntryForeignHubLang(entry);
      const english = translations.en || entry.definition || "";
      const foreignWord = foreignHub ? (translations[foreignHub] || "") : "";
      Object.keys(LANGUAGES).forEach((lang) => {
        const surface = lang === "en" ? english : (translations[lang] || "");
        if (!surface) return;
        const wordNorm = normalizeDictionaryWord(surface);
        if (!wordNorm) return;
        pushItem(lang, wordNorm, surface, {
          type: "local",
          entry,
          entryId: entry._entryId,
          english,
          translation: foreignWord || surface,
          lang,
          word: surface,
          stampKey: getStampSymbolKey(entry),
          originCode: foreignHub || lang,
          symbolCount: getSymbolsForEntry(entry).length,
          pos: [].concat(entry.partOfSpeech || []).join(", "),
        });
      });
    });

    worldDictionaryRows.forEach((line) => {
      if (hiddenWorldLines.has(line)) return;
      const parts = String(line || "").split("\t");
      if (parts.length < 8) return;
      const originCode = WORLD_ORIGIN_TO_LANG[parts[7]];
      if (!originCode || originCode === "en") return;
      if (isEnglishPlaceholderTranslation(parts[0], parts[1])) return;
      const english = parts[0] || "";
      const englishNorm = normalizeDictionaryWord(english);
      if (englishNorm) {
        pushItem("en", englishNorm, english, {
          type: "world",
          worldLine: line,
          english,
          translation: parts[1] || "",
          lang: "en",
          word: english,
          englishNorm,
          translationNorm: normalizeDictionaryWord(parts[1] || ""),
          stampKey: worldStampKey(parts[6]),
          originCode,
          symbolCount: 0,
          pos: parts[5] || "",
        });
      }
      const alts = splitDictionaryAlternatives(parts[1] || "");
      (alts.length ? alts : [parts[1] || ""]).forEach((alt) => {
        const trNorm = normalizeDictionaryWord(alt);
        if (!trNorm) return;
        pushItem(originCode, trNorm, alt, {
          type: "world",
          worldLine: line,
          english,
          translation: alt,
          lang: originCode,
          word: alt,
          englishNorm,
          translationNorm: trNorm,
          stampKey: worldStampKey(parts[6]),
          originCode,
          symbolCount: 0,
          pos: parts[5] || "",
        });
      });
    });

    const groups = [];
    Object.keys(buckets).forEach((key) => {
      const bucket = buckets[key];
      if (!bucket.items.length) return;
      bucket.items.sort((a, b) => {
        const starDiff = getExceptionItemStarCount(b) - getExceptionItemStarCount(a);
        if (starDiff) return starDiff;
        const countDiff = getExceptionItemSymbolCount(a) - getExceptionItemSymbolCount(b);
        if (countDiff) return countDiff;
        return String(a.word || a.translation || "").localeCompare(String(b.word || b.translation || ""), bucket.lang || "en", {
          sensitivity: "base",
        });
      });
      const minSymbols = getExceptionItemSymbolCount(bucket.items[0]);
      const maxStars = Math.max(0, ...bucket.items.map((item) => getExceptionItemStarCount(item)));
      groups.push({
        level: resolveExceptionLevel("yellow", key),
        key,
        items: bucket.items,
        minSymbols,
        maxStars,
        starLang: bucket.lang,
        starWord: bucket.displayWord,
      });
    });

    groups.sort((a, b) => {
      const aOk = a.level === "green" || a.level === "blue" ? 1 : 0;
      const bOk = b.level === "green" || b.level === "blue" ? 1 : 0;
      if (aOk !== bOk) return aOk - bOk;
      const starDiff = (b.maxStars || 0) - (a.maxStars || 0);
      if (starDiff) return starDiff;
      const symbolDiff = (a.minSymbols || 0) - (b.minSymbols || 0);
      if (symbolDiff) return symbolDiff;
      const langCmp = String(a.starLang || "").localeCompare(String(b.starLang || ""));
      if (langCmp) return langCmp;
      return String(a.starWord || "").localeCompare(String(b.starWord || ""), a.starLang || "en", { sensitivity: "base" });
    });
    return groups;
  }

  async function buildStarExceptionGroupsAsync(onStageProgress) {
    const buckets = {};
    const perGroupCap = 48;

    function ensureBucket(lang, wordNorm, displayWord) {
      const key = "star\0" + lang + "\0" + wordNorm;
      if (!buckets[key]) {
        buckets[key] = {
          key,
          lang,
          wordNorm,
          displayWord: displayWord || wordNorm,
          items: [],
        };
      }
      return buckets[key];
    }

    function pushItem(lang, wordNorm, displayWord, item) {
      if (!isHomographWord(displayWord || wordNorm, lang)) return;
      const bucket = ensureBucket(lang, wordNorm, displayWord);
      if (bucket.items.length >= perGroupCap) return;
      const id = exceptionItemId(item);
      if (id && bucket.items.some((existing) => exceptionItemId(existing) === id)) return;
      bucket.items.push(item);
    }

    ensureCoreWordsInDictionary().forEach((entry) => {
      if (!entry || entry.isCore) return;
      const translations = entry.translations || {};
      const foreignHub = getEntryForeignHubLang(entry);
      const english = translations.en || entry.definition || "";
      const foreignWord = foreignHub ? (translations[foreignHub] || "") : "";
      Object.keys(LANGUAGES).forEach((lang) => {
        const surface = lang === "en" ? english : (translations[lang] || "");
        if (!surface) return;
        const wordNorm = normalizeDictionaryWord(surface);
        if (!wordNorm) return;
        pushItem(lang, wordNorm, surface, {
          type: "local",
          entry,
          entryId: entry._entryId,
          english,
          translation: foreignWord || surface,
          lang,
          word: surface,
          stampKey: getStampSymbolKey(entry),
          originCode: foreignHub || lang,
          symbolCount: getSymbolsForEntry(entry).length,
          pos: [].concat(entry.partOfSpeech || []).join(", "),
        });
      });
    });

    const rows = worldDictionaryRows;
    for (let i = 0; i < rows.length; i++) {
      const line = rows[i];
      if (hiddenWorldLines.has(line)) continue;
      const parts = String(line || "").split("\t");
      if (parts.length < 8) continue;
      const originCode = WORLD_ORIGIN_TO_LANG[parts[7]];
      if (!originCode || originCode === "en") continue;
      if (isEnglishPlaceholderTranslation(parts[0], parts[1])) continue;
      const english = parts[0] || "";
      const englishNorm = normalizeDictionaryWord(english);
      if (englishNorm) {
        pushItem("en", englishNorm, english, {
          type: "world",
          worldLine: line,
          english,
          translation: parts[1] || "",
          lang: "en",
          word: english,
          englishNorm,
          translationNorm: normalizeDictionaryWord(parts[1] || ""),
          stampKey: worldStampKey(parts[6]),
          originCode,
          symbolCount: 0,
          pos: parts[5] || "",
        });
      }
      const alts = splitDictionaryAlternatives(parts[1] || "");
      (alts.length ? alts : [parts[1] || ""]).forEach((alt) => {
        const trNorm = normalizeDictionaryWord(alt);
        if (!trNorm) return;
        pushItem(originCode, trNorm, alt, {
          type: "world",
          worldLine: line,
          english,
          translation: alt,
          lang: originCode,
          word: alt,
          englishNorm,
          translationNorm: trNorm,
          stampKey: worldStampKey(parts[6]),
          originCode,
          symbolCount: 0,
          pos: parts[5] || "",
        });
      });
      if (i > 0 && i % DICTIONARY_WORLD_CHUNK === 0) {
        if (onStageProgress) onStageProgress(Math.round((i / rows.length) * 100));
        await yieldDictionaryUi();
      }
    }
    if (onStageProgress) onStageProgress(100);

    const groups = [];
    Object.keys(buckets).forEach((key) => {
      const bucket = buckets[key];
      if (!bucket.items.length) return;
      bucket.items.sort((a, b) => {
        const starDiff = getExceptionItemStarCount(b) - getExceptionItemStarCount(a);
        if (starDiff) return starDiff;
        const countDiff = getExceptionItemSymbolCount(a) - getExceptionItemSymbolCount(b);
        if (countDiff) return countDiff;
        return String(a.word || a.translation || "").localeCompare(String(b.word || b.translation || ""), bucket.lang || "en", {
          sensitivity: "base",
        });
      });
      const minSymbols = getExceptionItemSymbolCount(bucket.items[0]);
      const maxStars = Math.max(0, ...bucket.items.map((item) => getExceptionItemStarCount(item)));
      groups.push({
        level: resolveExceptionLevel("yellow", key),
        key,
        items: bucket.items,
        minSymbols,
        maxStars,
        starLang: bucket.lang,
        starWord: bucket.displayWord,
      });
    });

    groups.sort((a, b) => {
      const aOk = a.level === "green" || a.level === "blue" ? 1 : 0;
      const bOk = b.level === "green" || b.level === "blue" ? 1 : 0;
      if (aOk !== bOk) return aOk - bOk;
      const starDiff = (b.maxStars || 0) - (a.maxStars || 0);
      if (starDiff) return starDiff;
      const symbolDiff = (a.minSymbols || 0) - (b.minSymbols || 0);
      if (symbolDiff) return symbolDiff;
      const langCmp = String(a.starLang || "").localeCompare(String(b.starLang || ""));
      if (langCmp) return langCmp;
      return String(a.starWord || "").localeCompare(String(b.starWord || ""), a.starLang || "en", { sensitivity: "base" });
    });
    return groups;
  }

  function flattenExceptionDisplay(groups, options) {
    const shown = new Set();
    const rows = [];
    groups.forEach((group) => {
      group.items.forEach((item) => {
        const id = exceptionItemId(item);
        if (!id || shown.has(id)) return;
        shown.add(id);
        rows.push({ item, group });
      });
    });
    if (options && options.sortBySymbolCount) {
      rows.sort((a, b) => {
        const aOk = a.group.level === "green" || a.group.level === "blue" ? 1 : 0;
        const bOk = b.group.level === "green" || b.group.level === "blue" ? 1 : 0;
        if (aOk !== bOk) return aOk - bOk;
        const starDiff = getExceptionItemStarCount(b.item) - getExceptionItemStarCount(a.item);
        if (starDiff) return starDiff;
        const countDiff = getExceptionItemSymbolCount(a.item) - getExceptionItemSymbolCount(b.item);
        if (countDiff) return countDiff;
        const aWord = a.item.word || a.item.translation || a.item.english || "";
        const bWord = b.item.word || b.item.translation || b.item.english || "";
        return String(aWord).localeCompare(String(bWord), "en", { sensitivity: "base" });
      });
    }
    return rows;
  }

  function countExceptionGroupsByLevel(groups) {
    const counts = { red: 0, yellow: 0, blue: 0, green: 0 };
    (groups || []).forEach((group) => {
      if (counts[group.level] != null) counts[group.level] += 1;
    });
    return counts;
  }

  function updateExceptionCountsDisplay(groups, enabled, mode) {
    if (!exceptionsCountsEl) return;
    if (!enabled) {
      exceptionsCountsEl.textContent = "";
      exceptionsCountsEl.classList.add("hidden");
      return;
    }
    if (mode === "stars") {
      const openCount = (groups || []).filter((group) => group.level === "yellow" || group.level === "red").length;
      const doneCount = (groups || []).filter((group) => group.level === "green" || group.level === "blue").length;
      exceptionsCountsEl.textContent = formatDictionaryText("dictionary.starExceptionsCounts", {
        count: (groups || []).length,
        open: openCount,
        done: doneCount,
      }) || ("Star " + (groups || []).length + " · Open " + openCount + " · Done " + doneCount);
      exceptionsCountsEl.classList.remove("hidden");
      return;
    }
    const counts = countExceptionGroupsByLevel(groups);
    exceptionsCountsEl.textContent = formatDictionaryText("dictionary.exceptionsCounts", counts) ||
      ("Red " + counts.red + " · Yellow " + counts.yellow + " · Blue " + counts.blue + " · Green " + counts.green);
    exceptionsCountsEl.classList.remove("hidden");
  }

  function getWorldStampStatus(stamp) {
    const value = (stamp || "").trim();
    if (!value || value === "[]") return "unstamped";
    if (/temp/i.test(value)) return "tempstamped";
    return "stamped";
  }

  function getLocalStampStatus(entry) {
    return getEntryStampStatus(entry);
  }

  function getWorldField(line, fieldIndex) {
    let start = 0;
    for (let i = 0; i < fieldIndex; i++) {
      start = line.indexOf("\t", start);
      if (start < 0) return "";
      start++;
    }
    const end = line.indexOf("\t", start);
    return end < 0 ? line.slice(start) : line.slice(start, end);
  }

  function getWorldPrimaryWord(line, lang) {
    return getWorldField(line, lang === "en" ? 0 : 1);
  }

  function getOrderedWorldRows(lang) {
    if (worldOrderCache[lang]) return worldOrderCache[lang];
    const collator = new Intl.Collator(lang, { sensitivity: "base", numeric: true });
    const ordered = worldDictionaryRows.slice();
    ordered.sort((a, b) => {
      const aLastTab = a.lastIndexOf("\t");
      const bLastTab = b.lastIndexOf("\t");
      const aOriginCode = WORLD_ORIGIN_TO_LANG[a.slice(aLastTab + 1)];
      const bOriginCode = WORLD_ORIGIN_TO_LANG[b.slice(bLastTab + 1)];
      const aPriority = aOriginCode === lang ? 0 : 1;
      const bPriority = bOriginCode === lang ? 0 : 1;
      if (aPriority !== bPriority) return aPriority - bPriority;
      const primary = collator.compare(getWorldPrimaryWord(a, lang), getWorldPrimaryWord(b, lang));
      return primary || collator.compare(getWorldField(a, 0), getWorldField(b, 0));
    });
    worldOrderCache[lang] = ordered;
    return ordered;
  }

  function getPronunciationField(parts) {
    if (parts[2]) return [getTranslation("dictionary.pinyin"), parts[2]];
    if (parts[3]) return [getTranslation("dictionary.hiragana"), parts[3]];
    if (parts[4]) return [getTranslation("dictionary.latinLetters"), parts[4]];
    return ["", ""];
  }

  function transliterateRussian(text) {
    const map = {
      а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh", з: "z",
      и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r",
      с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh",
      щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
    };
    return Array.from((text || "").toLocaleLowerCase("ru")).map((char) => map[char] ?? char).join("");
  }

  function katakanaToHiragana(text) {
    return Array.from(text || "").map((char) => {
      const code = char.charCodeAt(0);
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCharCode(code - 0x60) : char;
    }).join("");
  }

  function createDictionaryInfoTable(fields) {
    const table = document.createElement("div");
    table.className = "world-entry-table";
    fields.forEach((fieldSpec) => {
      const label = fieldSpec[0];
      const value = fieldSpec[1];
      const starLang = fieldSpec[2];
      const field = document.createElement("div");
      field.className = "world-entry-field";
      const title = document.createElement("strong");
      title.textContent = label || "";
      const valueRow = document.createElement("span");
      valueRow.className = "world-entry-value-row";
      if (starLang && value && isHomographWord(value, starLang)) {
        field.classList.add("has-homograph-star");
        const star = document.createElement("span");
        star.className = "homograph-star";
        star.title = getTranslation("dictionary.HomographStarTitle") || getTranslation("dictionary.HomographStar") || "Homograph";
        star.setAttribute("aria-label", star.title);
        star.textContent = "★";
        valueRow.appendChild(star);
      }
      const fieldValue = document.createElement("span");
      fieldValue.className = "world-entry-value";
      fieldValue.textContent = value || "";
      valueRow.appendChild(fieldValue);
      field.appendChild(title);
      field.appendChild(valueRow);
      table.appendChild(field);
    });
    return table;
  }

  function buildCoreCatalogIndex() {
    if (coreCatalogIndex) return coreCatalogIndex;
    const coreNames = new Set(
      (typeof symbols !== "undefined" ? symbols : []).map((symbol) => (symbol.name || "").toLocaleLowerCase("en"))
    );
    const translatedNames = new Set();
    Object.keys(LANGUAGES).forEach((lang) => {
      if (lang === "en") return;
      const translatedSymbols = window.TRANSLATIONS && window.TRANSLATIONS[lang] && window.TRANSLATIONS[lang].symbols;
      (typeof symbols !== "undefined" ? symbols : []).forEach((symbol) => {
        const translated = translatedSymbols && translatedSymbols[symbol.id] && translatedSymbols[symbol.id].name;
        if (translated) translatedNames.add(lang + "\u0000" + translated.toLocaleLowerCase(lang));
      });
    });
    const byEnglish = new Map();
    const byTranslation = new Map();
    worldDictionaryRows.forEach((line) => {
      const english = getWorldField(line, 0);
      const key = english.toLocaleLowerCase("en");
      if (coreNames.has(key)) {
        if (!byEnglish.has(key)) byEnglish.set(key, []);
        byEnglish.get(key).push(line);
      }
      const lastTab = line.lastIndexOf("\t");
      const originCode = WORLD_ORIGIN_TO_LANG[line.slice(lastTab + 1)];
      if (!originCode || originCode === "en") return;
      const translationKey = originCode + "\u0000" + getWorldField(line, 1).toLocaleLowerCase(originCode);
      if (translatedNames.has(translationKey) && !byTranslation.has(translationKey)) {
        byTranslation.set(translationKey, line);
      }
    });
    coreCatalogIndex = { byEnglish, byTranslation };
    return coreCatalogIndex;
  }

  function getCoreCatalogMetadata(entry, lang) {
    const index = buildCoreCatalogIndex();
    const candidates = index.byEnglish.get((entry.definition || "").toLocaleLowerCase("en")) || [];
    const displayWord = getEntryDisplayWord(entry, lang);
    const translationLine = lang === "en"
      ? null
      : index.byTranslation.get(lang + "\u0000" + displayWord.toLocaleLowerCase(lang));
    const matchingOrigin = candidates.filter((line) => {
      const lastTab = line.lastIndexOf("\t");
      return WORLD_ORIGIN_TO_LANG[line.slice(lastTab + 1)] === lang;
    });
    const fallbackLine = lang === "en" ? candidates[0] : matchingOrigin[0];
    const posParts = (translationLine || fallbackLine || candidates[0] || "").split("\t");
    const pronunciationParts = translationLine ? translationLine.split("\t") : null;
    const override = CORE_PRONUNCIATION_OVERRIDES[lang] && CORE_PRONUNCIATION_OVERRIDES[lang][entry.definition];
    let pronunciation = pronunciationParts ? getPronunciationField(pronunciationParts) : ["", ""];
    if (override) {
      pronunciation = [getTranslation(override[0]), override[1]];
    } else if (!pronunciation[1] && lang === "ru") {
      pronunciation = [getTranslation("dictionary.latinLetters"), transliterateRussian(displayWord)];
    } else if (!pronunciation[1] && lang === "ja" && /[\u30a1-\u30f6]/.test(displayWord)) {
      pronunciation = [getTranslation("dictionary.hiragana"), katakanaToHiragana(displayWord)];
    }
    return {
      pos: posParts[5] || "Noun",
      pronunciation,
    };
  }

  function createCoreInfoTable(entry) {
    const lang = getStoredLang();
    const englishMode = lang === "en";
    const metadata = getCoreCatalogMetadata(entry, lang);
    return createDictionaryInfoTable([
      [getTranslation("dictionary.english"), entry.definition || ""],
      [englishMode ? "" : getTranslation("dictionary.translation"), englishMode ? "" : getEntryDisplayWord(entry, lang)],
      [getTranslation("dictionary.partOfSpeech"), metadata.pos],
      ["", ""],
      metadata.pronunciation,
    ]);
  }

  function createCustomInfoTable(entry) {
    const translations = entry.translations || {};
    const origin = entry.originLanguage || entry.translationSource || "en";
    let translated = entry.translationLanguage || "";
    if (!translated || translated === origin) {
      const keys = Object.keys(translations).filter((code) => code !== origin);
      if (keys.includes("en")) translated = "en";
      else if (keys.length) translated = keys[0];
      else translated = origin === "en" ? "" : "en";
    }
    let leftLang = origin;
    let rightLang = translated;
    // English-hub pairs flip with UI: Language-English vs English-Language.
    const foreignHub = getEntryForeignHubLang(entry);
    if (foreignHub && (origin === "en" || translated === "en" || translations.en || entry.definition)) {
      const display = getPairDisplayLangs(makeEnglishHubPairId(foreignHub), getStoredLang());
      if (display) {
        leftLang = display.wordLang;
        rightLang = display.translationLang;
      }
    }
    const leftWord = translations[leftLang] || (leftLang === "en" ? (entry.definition || "") : "");
    const rightWord = rightLang
      ? (translations[rightLang] || (rightLang === "en" ? (entry.definition || "") : ""))
      : "";
    const rows = [
      [LANGUAGES[leftLang] || leftLang, leftWord, leftLang],
      [rightLang ? (LANGUAGES[rightLang] || rightLang) : getTranslation("dictionary.translation"), rightWord, rightLang || ""],
      [getTranslation("dictionary.partOfSpeech"), [].concat(entry.partOfSpeech || []).join(", ")],
    ];
    [
      [leftLang, "zh", "dictionary.pinyin", "pinyin"],
      [rightLang, "zh", "dictionary.pinyin", "pinyin"],
      [leftLang, "ja", "dictionary.hiragana", "hiragana"],
      [rightLang, "ja", "dictionary.hiragana", "hiragana"],
      [leftLang, "ru", "dictionary.latinLetters", "latinLetters"],
      [rightLang, "ru", "dictionary.latinLetters", "latinLetters"],
    ].forEach(([lang, needed, labelKey, field]) => {
      if (lang !== needed) return;
      if (rows.some((row) => row[0] === getTranslation(labelKey))) return;
      rows.push([getTranslation(labelKey), entry[field] || ""]);
    });
    return createDictionaryInfoTable(rows);
  }

  function appendEntryAuthorship(entryDiv, entry) {
    if (!entry || entry.isCore || (!entry.createdBy && !entry.lastEditedBy)) return;
    const footer = document.createElement("div");
    footer.className = "entry-authorship";
    const created = document.createElement("span");
    const edited = document.createElement("span");
    created.textContent = formatFirstCreatedBy(entry);
    edited.textContent = formatLastEditedBy(entry);
    footer.appendChild(created);
    footer.appendChild(edited);
    entryDiv.appendChild(footer);
  }

  function formatAuthorshipTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function attachExceptionBar(entryDiv, row) {
    if (!row || !row.group) return;
    entryDiv.classList.add("has-exception", "exception-" + row.group.level);
    const bar = document.createElement("button");
    bar.type = "button";
    bar.className = "exception-side-bar exception-" + row.group.level;
    bar.title = getExceptionLevelLabel(row.group.level);
    bar.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openExceptionReview(row.group, row.item);
    });
    entryDiv.appendChild(bar);
  }

  function renderLocalEntry(entry, exceptionRow) {
    const entryDiv = document.createElement("div");
    entryDiv.className = "entry";
    if (entry.isCore) entryDiv.classList.add("entry-core");
    else entryDiv.classList.add("entry-custom");
    entryDiv.classList.add("entry-" + getLocalStampStatus(entry));
    let symbolsDiv;

    if (entry.isCore && entry.slots) {
      symbolsDiv = document.createElement("div");
      symbolsDiv.className = "entry-symbols";
      entry.slots.forEach((slot) => {
        const slotGroup = document.createElement("div");
        slotGroup.className = "entry-slot-group";
        const hasEffects = slot.effectLeft || slot.effectRight;
        if (hasEffects) {
          const effectsCol = document.createElement("div");
          effectsCol.className = "entry-effects-column";
          [slot.effectLeft, slot.effectRight].forEach((ref) => {
            if (!ref) return;
            const box = document.createElement("div");
            box.className = "entry-effect";
            const sym = typeof symbols !== "undefined" && symbols.find((s) => s.id === ref.id);
            const name = sym ? getSymbolName(sym) : (ref.name || "");
            box.title = name;
            box.appendChild(createSymbolVisual(ref, name));
            effectsCol.appendChild(box);
          });
          slotGroup.appendChild(effectsCol);
        }
        if (slot.main) {
          const mainBox = document.createElement("div");
          mainBox.className = "entry-main";
          const sym = typeof symbols !== "undefined" && symbols.find((s) => s.id === slot.main.id);
          const name = sym ? getSymbolName(sym) : (slot.main.name || "");
          mainBox.title = name;
          mainBox.appendChild(createSymbolVisual(slot.main, name));
          slotGroup.appendChild(mainBox);
        }
        symbolsDiv.appendChild(slotGroup);
      });
    } else {
      symbolsDiv = createEntryCompactStamp(entry);
    }

    entryDiv.appendChild(symbolsDiv);
    if (entry.isCore) {
      entryDiv.appendChild(createCoreInfoTable(entry));
    } else {
      entryDiv.appendChild(createCustomInfoTable(entry));
    }
    appendEntryAuthorship(entryDiv, entry);
    attachExceptionBar(entryDiv, exceptionRow);
    entryDiv.dataset.entryId = entry._entryId;
    entryDiv.addEventListener("click", () => openWordContext(entry._entryId));
    entryDiv.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      openWordContext(entry._entryId);
    });
    list.appendChild(entryDiv);
  }

  function renderWorldEntry(line, exceptionRow) {
    const parts = line.split("\t");
    if (parts.length !== 8) return;
    const lang = getStoredLang();
    const entryDiv = document.createElement("div");
    entryDiv.className = "entry entry-world entry-" + getWorldStampStatus(parts[6]);
    const stampDiv = document.createElement("div");
    stampDiv.className = "world-entry-stamp";
    if (getWorldStampStatus(parts[6]) !== "unstamped") stampDiv.textContent = parts[6];
    const originCode = WORLD_ORIGIN_TO_LANG[parts[7]] || "en";
    const pairId = makeEnglishHubPairId(originCode);
    // Keep English/Translation columns stable across UI languages: English value stays English.
    const pronunciation = getPronunciationField(parts);
    const table = createDictionaryInfoTable([
      [getTranslation("dictionary.english"), parts[0] || "", "en"],
      [getTranslation("dictionary.translation"), parts[1] || "", originCode],
      [getTranslation("dictionary.partOfSpeech"), parts[5]],
      [getTranslation("dictionary.originLanguage"), formatLanguagePairLabel(pairId, lang) || parts[7]],
      pronunciation,
    ]);
    entryDiv.appendChild(stampDiv);
    entryDiv.appendChild(table);
    attachExceptionBar(entryDiv, exceptionRow);
    entryDiv.addEventListener("click", () => {
      openDictionaryEditor({ worldLine: line, language: lang === "en" ? "en" : originCode });
    });
    list.appendChild(entryDiv);
  }

  function pronunciationLabelForLang(langCode) {
    if (langCode === "zh") return getTranslation("dictionary.pinyin");
    if (langCode === "ja") return getTranslation("dictionary.hiragana");
    if (langCode === "ru") return getTranslation("dictionary.latinLetters");
    return "";
  }

  function renderCrossEntry(entry) {
    if (!entry) return;
    const uiLang = getStoredLang();
    const entryDiv = document.createElement("div");
    entryDiv.className = "entry entry-world entry-unstamped entry-cross";
    const stampDiv = document.createElement("div");
    stampDiv.className = "world-entry-stamp";
    const wordLabel = LANGUAGES[entry.wordLang] || getTranslation("dictionary.language");
    const translationLabel = LANGUAGES[entry.translationLang] || getTranslation("dictionary.translation");
    const fields = [
      [wordLabel, entry.word || "", entry.wordLang || ""],
      [translationLabel, entry.translation || "", entry.translationLang || ""],
      [getTranslation("dictionary.partOfSpeech"), entry.pos || ""],
      [getTranslation("dictionary.originLanguage"), entry.originLabel || formatLanguagePairLabel(entry.pairId, uiLang)],
    ];
    if (entry.wordPronunciation) {
      fields.push([pronunciationLabelForLang(entry.wordLang), entry.wordPronunciation]);
    }
    if (entry.translationPronunciation) {
      fields.push([pronunciationLabelForLang(entry.translationLang), entry.translationPronunciation]);
    }
    const table = createDictionaryInfoTable(fields);
    entryDiv.appendChild(stampDiv);
    entryDiv.appendChild(table);
    entryDiv.addEventListener("click", () => {
      const sourceLine = entry.leftLine || entry.rightLine;
      if (sourceLine) {
        openDictionaryEditor({ worldLine: sourceLine, language: entry.wordLang || uiLang });
      }
    });
    list.appendChild(entryDiv);
  }

  function updateDictionaryPagination(totalCount) {
    const totalPages = Math.max(1, Math.ceil(totalCount / DICTIONARY_PAGE_SIZE));
    currentPage = Math.max(1, Math.min(currentPage, totalPages));
    const startIndex = (currentPage - 1) * DICTIONARY_PAGE_SIZE;
    const endIndex = Math.min(startIndex + DICTIONARY_PAGE_SIZE, totalCount);
    if (resultsStatus) {
      resultsStatus.textContent = totalCount
        ? formatDictionaryText("dictionary.resultsSummary", { start: startIndex + 1, end: endIndex, count: totalCount })
        : getTranslation("dictionary.noResults");
    }
    pageInputs.forEach((input) => {
      input.value = currentPage;
      input.max = totalPages;
      input.disabled = totalCount === 0;
    });
    pageTotals.forEach((total) => {
      total.textContent = "/ " + totalPages;
    });
    pagePrevButtons.forEach((button) => {
      button.disabled = currentPage <= 1;
    });
    pageNextButtons.forEach((button) => {
      button.disabled = currentPage >= totalPages;
    });
    return { startIndex, endIndex, totalPages };
  }

  function includeWorldHubLine(line, originCode, uiLang, coveredWorldKeys, selectedStatus, query) {
    if (hiddenWorldLines.has(line)) return false;
    if (coveredWorldKeys.has(getWorldLineEnglishHubMatchKey(line))) return false;
    const lastTab = line.lastIndexOf("\t");
    if (lastTab < 0) return false;
    const origin = line.slice(lastTab + 1);
    const lineOriginCode = WORLD_ORIGIN_TO_LANG[origin];
    if (lineOriginCode !== originCode) return false;
    const parts = String(line).split("\t");
    const english = parts[0] || "";
    const translation = parts[1] || "";
    if (isEnglishPlaceholderTranslation(english, translation)) {
      const englishNorm = english.normalize("NFKC").trim().toLocaleLowerCase("en");
      const bucket = (getSharedEnglishHubIndex().byLangEnglish.get(originCode) || new Map()).get(englishNorm) || [];
      const hasRealForeign = bucket.some((rec) => !isEnglishPlaceholderTranslation(rec.english, rec.translation));
      if (hasRealForeign) return false;
    }
    if (selectedStatus !== "all") {
      const stampTab = line.lastIndexOf("\t", lastTab - 1);
      const worldStatus = getWorldStampStatus(stampTab >= 0 ? line.slice(stampTab + 1, lastTab) : "");
      if (worldStatus !== selectedStatus) return false;
    }
    const primaryLang = uiLang === "en" ? "en" : originCode;
    if (query && !getWorldPrimaryWord(line, primaryLang).toLocaleLowerCase(primaryLang).startsWith(query)) return false;
    return true;
  }

  async function loadEntriesAsync() {
    const loadToken = ++dictionaryLoadToken;
    const lang = getStoredLang();
    const query = (searchBar.value || "").trim().toLocaleLowerCase(lang);
    const selectedStatus = stampFilter ? stampFilter.value : "all";
    const exceptionsEnabled = checkExceptionsCheckbox && checkExceptionsCheckbox.checked;
    const exceptionsMode = exceptionsModeSelect && exceptionsModeSelect.value
      ? exceptionsModeSelect.value
      : "symbols";
    const checkStarExceptions = exceptionsEnabled && exceptionsMode === "stars";
    const checkSymbolExceptions = exceptionsEnabled && exceptionsMode === "symbols";
    const checkLanguageExceptions = exceptionsEnabled && exceptionsMode !== "symbols" && exceptionsMode !== "stars";
    const exceptionsOnly = checkLanguageExceptions || checkSymbolExceptions || checkStarExceptions;
    const hideCore = !!(hideCoreWordsCheckbox && hideCoreWordsCheckbox.checked);
    // Progress overlay is only for the initial bootstrap.
    const showProgress = dictionaryLoadingCount > 0;
    const filterKey = [
      lang,
      query,
      selectedStatus,
      exceptionsOnly ? "1" : "0",
      exceptionsMode,
      hideCore ? "1" : "0",
      Array.from(selectedPairs).sort().join(","),
    ].join("|");

    function paintPageFromCache(cache) {
      list.innerHTML = "";
      if (cache.mode === "exceptions") {
        updateExceptionCountsDisplay(cache.groups, true, cache.exceptionKind);
        const page = updateDictionaryPagination(cache.rows.length);
        for (let i = page.startIndex; i < page.endIndex; i++) {
          const row = cache.rows[i];
          if (row.item.type === "local") renderLocalEntry(row.item.entry, row);
          else renderWorldEntry(row.item.worldLine, row);
        }
        if (!cache.rows.length) {
          const empty = document.createElement("p");
          empty.className = "dictionary-empty";
          empty.textContent = getTranslation("dictionary.noResults");
          list.appendChild(empty);
        }
        return;
      }

      updateExceptionCountsDisplay(null, false);
      const localEntries = cache.localEntries;
      const worldItems = cache.worldItems;
      const totalCount = localEntries.length + worldItems.length;
      const page = updateDictionaryPagination(totalCount);
      const localEnd = Math.min(page.endIndex, localEntries.length);
      for (let i = page.startIndex; i < localEnd; i++) renderLocalEntry(localEntries[i]);
      const worldStart = Math.max(0, page.startIndex - localEntries.length);
      const worldEnd = Math.max(0, page.endIndex - localEntries.length);
      for (let i = worldStart; i < worldEnd; i++) {
        const item = worldItems[i];
        if (!item) continue;
        if (item.kind === "cross") renderCrossEntry(item.entry);
        else renderWorldEntry(item.line);
      }
      if (!totalCount) {
        const empty = document.createElement("p");
        empty.className = "dictionary-empty";
        empty.textContent = getTranslation("dictionary.noResults");
        list.appendChild(empty);
      }
    }

    // Same filters, different page — reuse cached filtered rows (no index rebuild, no overlay).
    if (dictionaryViewCache && dictionaryViewCache.key === filterKey) {
      if (loadToken !== dictionaryLoadToken) return;
      paintPageFromCache(dictionaryViewCache);
      return;
    }

    async function buildDictionaryView() {
      if (loadToken !== dictionaryLoadToken) return null;
      let localEntries = ensureCoreWordsInDictionary();
      const checkLang = checkLanguageExceptions ? exceptionsMode : lang;

      if (exceptionsOnly) {
        if (showProgress) setDictionaryLoadingProgress(40, "dictionary.loadingIndexes", Math.max(dictionaryLoadingOverall, 70));
        let groups;
        if (checkStarExceptions) {
          groups = await buildStarExceptionGroupsAsync((stage) => {
            if (loadToken !== dictionaryLoadToken) return;
            if (!showProgress) return;
            const overall = Math.max(dictionaryLoadingOverall, 70 + Math.round(stage * 0.12));
            setDictionaryLoadingProgress(stage, "dictionary.loadingIndexes", overall);
          });
        } else {
          if (showProgress) await yieldDictionaryUi();
          groups = checkLanguageExceptions
            ? buildLanguageExceptionGroups(checkLang)
            : buildSymbolExceptionGroups();
        }
        if (loadToken !== dictionaryLoadToken) return null;
        if (showProgress) {
          setDictionaryLoadingProgress(100, "dictionary.loadingIndexes", Math.max(dictionaryLoadingOverall, 82));
          setDictionaryLoadingProgress(30, "dictionary.loadingList", Math.max(dictionaryLoadingOverall, 86));
        }
        const exceptionKind = checkStarExceptions ? "stars" : exceptionsMode;
        let rows = flattenExceptionDisplay(groups, checkStarExceptions ? { sortBySymbolCount: true } : null);
        if (query) {
          rows = rows.filter((row) => {
            const item = row.item;
            const english = (item.english || "").toLocaleLowerCase("en");
            const translation = (item.translation || item.word || "").toLocaleLowerCase(item.lang || checkLang || lang);
            return english.startsWith(query) || translation.startsWith(query);
          });
        }
        if (selectedStatus !== "all") {
          rows = rows.filter((row) => {
            if (row.item.type === "local") return getLocalStampStatus(row.item.entry) === selectedStatus;
            const parts = String(row.item.worldLine || "").split("\t");
            return getWorldStampStatus(parts[6]) === selectedStatus;
          });
        }
        if (showProgress) setDictionaryLoadingProgress(80, "dictionary.loadingList", Math.max(dictionaryLoadingOverall, 94));
        return { key: filterKey, mode: "exceptions", groups, exceptionKind, rows };
      }

      const coveredWorldKeys = new Set();
      localEntries.forEach((entry) => {
        if (!entry || entry.isCore) return;
        const key = getEntryEnglishHubMatchKey(entry);
        if (key) coveredWorldKeys.add(key);
      });

      localEntries = localEntries.filter((entry) => {
        if (hideCore && entry.isCore) return false;
        const status = getLocalStampStatus(entry);
        if (selectedStatus !== "all" && selectedStatus !== status) return false;
        if (!entry.isCore) {
          const pairId = getEntryEnglishHubPairId(entry);
          if (!pairId || !selectedPairs.has(pairId)) return false;
        } else if (!selectedPairs.size) {
          return false;
        }
        if (query) {
          const primary = getEntryDisplayWord(entry, lang).toLocaleLowerCase(lang);
          if (!primary.startsWith(query)) return false;
        }
        return true;
      });
      localEntries.sort((a, b) =>
        getEntryDisplayWord(a, lang).localeCompare(getEntryDisplayWord(b, lang), lang, { sensitivity: "base", numeric: true })
      );

      if (showProgress) setDictionaryLoadingProgress(25, "dictionary.loadingList", Math.max(dictionaryLoadingOverall, 72));

      const worldItems = [];
      const uiLang = lang;
      const orderedPairIds = getOrderedDictionaryPairIds(uiLang).filter((pairId) => selectedPairs.has(pairId));
      const pairCount = Math.max(1, orderedPairIds.length);
      let pairIndex = 0;

      for (const pairId of orderedPairIds) {
        if (loadToken !== dictionaryLoadToken) return null;
        if (isCrossPairId(pairId)) {
          const collator = new Intl.Collator(uiLang, { sensitivity: "base", numeric: true });
          let entries = getCrossEntriesForDisplay(pairId, uiLang);
          if (query) {
            entries = entries.filter((entry) =>
              String(entry.word || "").toLocaleLowerCase(uiLang).startsWith(query)
            );
          }
          if (selectedStatus === "all" || selectedStatus === "unstamped") {
            entries.sort((a, b) => collator.compare(a.word || "", b.word || "") || collator.compare(a.translation || "", b.translation || ""));
            entries.forEach((entry) => worldItems.push({ kind: "cross", entry }));
          }
          pairIndex += 1;
          continue;
        }

        const parsed = parsePairId(pairId);
        const originCode = parsed && parsed.a === "en" ? parsed.b : (parsed && parsed.b === "en" ? parsed.a : "");
        if (!originCode) {
          pairIndex += 1;
          continue;
        }
        if (showProgress) await yieldDictionaryUi();
        const rows = getOrderedWorldRows(uiLang === "en" ? "en" : originCode);
        for (let ri = 0; ri < rows.length; ri++) {
          const line = rows[ri];
          if (includeWorldHubLine(line, originCode, uiLang, coveredWorldKeys, selectedStatus, query)) {
            worldItems.push({ kind: "hub", line });
          }
          if (ri > 0 && ri % DICTIONARY_WORLD_CHUNK === 0) {
            if (showProgress) {
              const pairBase = pairIndex / pairCount;
              const rowFrac = (ri / rows.length) / pairCount;
              const combined = pairBase + rowFrac;
              const overall = Math.max(dictionaryLoadingOverall, 72 + Math.round(combined * 22));
              setDictionaryLoadingProgress(Math.round((ri / rows.length) * 100), "dictionary.loadingList", overall);
              await yieldDictionaryUi();
            }
            if (loadToken !== dictionaryLoadToken) return null;
          }
        }
        pairIndex += 1;
      }

      if (showProgress) setDictionaryLoadingProgress(70, "dictionary.loadingList", Math.max(dictionaryLoadingOverall, 94));
      return { key: filterKey, mode: "normal", localEntries, worldItems };
    }

    const built = await buildDictionaryView();
    if (!built || loadToken !== dictionaryLoadToken) return;
    dictionaryViewCache = built;
    paintPageFromCache(built);
  }

  function loadEntries() {
    dictionaryViewCache = null;
    void loadEntriesAsync();
  }

  function loadEntriesForPageChange() {
    void loadEntriesAsync();
  }

  // --- Word context popup (note + delete) ---
  const wordContextBox = document.getElementById("word-context-box");
  const wordContextTitle = document.getElementById("word-context-title");
  const wordContextNote = document.getElementById("word-context-note");
  const wordContextSaveNote = document.getElementById("word-context-save-note");
  const wordContextEditCreate = document.getElementById("word-context-edit-create");
  const wordContextDelete = document.getElementById("word-context-delete");
  const wordContextClose = document.getElementById("word-context-close");
  const wordContextSymbolGroups = document.getElementById("word-context-symbol-groups");
  const wordContextMetadata = document.getElementById("word-context-metadata");
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
  const adminCreatorInput = document.getElementById("admin-edit-creator");
  const adminEditorInput = document.getElementById("admin-edit-editor");

  let currentWordEntryId = "";
  const { openDictionaryEditor, closeDictionaryEditor } = setupSharedDictionaryEditor(() => loadEntries());

  const exceptionReviewBox = document.getElementById("exception-review-box");
  const exceptionReviewTitle = document.getElementById("exception-review-title");
  const exceptionReviewMeta = document.getElementById("exception-review-meta");
  const exceptionReviewList = document.getElementById("exception-review-list");
  const exceptionReviewEdit = document.getElementById("exception-review-edit");
  const exceptionReviewDelete = document.getElementById("exception-review-delete");
  const exceptionReviewOkay = document.getElementById("exception-review-okay");
  const exceptionReviewClose = document.getElementById("exception-review-close");

  function openExceptionReview(group, item) {
    activeExceptionGroup = group;
    activeExceptionItem = item || (group && group.items[0]) || null;
    if (!exceptionReviewBox || !group) return;
    if (exceptionReviewTitle) {
      exceptionReviewTitle.textContent = getExceptionLevelLabel(group.level);
    }
    if (exceptionReviewOkay) {
      exceptionReviewOkay.classList.toggle("hidden", group.level === "blue" || group.level === "green");
    }
    if (exceptionReviewMeta) {
      const sample = group.items[0];
      exceptionReviewMeta.textContent = sample
        ? ((sample.english || "") + (sample.translation ? " · " + sample.translation : "") + " · " + group.items.length + " words")
        : "";
    }
    if (exceptionReviewList) {
      exceptionReviewList.innerHTML = "";
      group.items.forEach((entryItem) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "exception-review-item" + (exceptionItemId(entryItem) === exceptionItemId(activeExceptionItem) ? " is-selected" : "");
        const title = document.createElement("strong");
        title.textContent = (entryItem.english || "") + (entryItem.translation ? " → " + entryItem.translation : "");
        const detail = document.createElement("span");
        const bits = [];
        if (entryItem.pos) bits.push(entryItem.pos);
        if (entryItem.pinyin) bits.push(entryItem.pinyin);
        if (entryItem.hiragana) bits.push(entryItem.hiragana);
        if (entryItem.latin) bits.push(entryItem.latin);
        if (entryItem.origin) bits.push(entryItem.origin);
        bits.push(entryItem.type === "local" ? "Local" : "World");
        detail.textContent = bits.join(" · ");
        button.appendChild(title);
        button.appendChild(detail);
        button.addEventListener("click", () => {
          activeExceptionItem = entryItem;
          openExceptionReview(group, entryItem);
        });
        exceptionReviewList.appendChild(button);
      });
    }
    exceptionReviewBox.classList.remove("hidden");
  }

  function closeExceptionReview() {
    activeExceptionGroup = null;
    activeExceptionItem = null;
    if (exceptionReviewBox) exceptionReviewBox.classList.add("hidden");
  }

  if (exceptionReviewClose) exceptionReviewClose.addEventListener("click", closeExceptionReview);
  if (exceptionReviewBox) {
    exceptionReviewBox.addEventListener("click", (event) => {
      if (event.target === exceptionReviewBox) closeExceptionReview();
    });
  }
  if (exceptionReviewOkay) {
    exceptionReviewOkay.addEventListener("click", () => {
      if (!activeExceptionGroup) return;
      const level = activeExceptionGroup.level;
      if (level === "red") approvedExceptions[activeExceptionGroup.key] = "blue";
      else if (level === "yellow") approvedExceptions[activeExceptionGroup.key] = "green";
      else return;
      saveApprovedExceptions();
      closeExceptionReview();
      loadEntries();
    });
  }
  if (exceptionReviewEdit) {
    exceptionReviewEdit.addEventListener("click", () => {
      if (!activeExceptionItem) return;
      const item = activeExceptionItem;
      closeExceptionReview();
      if (item.type === "local") openDictionaryEditor({ entryId: item.entryId });
      else openDictionaryEditor({ worldLine: item.worldLine, language: item.originCode || getStoredLang() });
    });
  }
  if (exceptionReviewDelete) {
    exceptionReviewDelete.addEventListener("click", () => {
      if (!activeExceptionItem || !requireAdminPassword("dictionary.passwordPrompt")) return;
      const item = activeExceptionItem;
      if (item.type === "local") {
        const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
        const idx = findEntryIndexById(entries, item.entryId);
        if (idx >= 0) {
          entries.splice(idx, 1);
          localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
        }
      } else if (item.worldLine) {
        hiddenWorldLines.add(item.worldLine);
        saveHiddenWorldLines();
      }
      closeExceptionReview();
      loadEntries();
    });
  }

  function renderWordContextSymbols(entry) {
    wordContextSymbolGroups.innerHTML = "";
    const groups = getEntryCategories(entry);
    [["is", "Is"], ["unrelated", "Unrelated"], ["isNot", "Isn't"]].forEach(([key, label]) => {
      if (!groups[key].length) return;
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      const symbolsWrap = document.createElement("div");
      heading.textContent = label;
      symbolsWrap.className = "word-context-symbol-list";
      groups[key].forEach((ref) => {
        const symbol = typeof symbols !== "undefined" && symbols.find((candidate) => String(candidate.id) === String(ref.id));
        const box = document.createElement("div");
        const name = symbol ? getSymbolName(symbol) : (ref.name || "");
        box.className = "word-context-symbol";
        box.title = name;
        box.appendChild(createSymbolVisual(symbol || ref, name));
        symbolsWrap.appendChild(box);
      });
      section.appendChild(heading);
      section.appendChild(symbolsWrap);
      wordContextSymbolGroups.appendChild(section);
    });
    if (Array.isArray(entry.compoundParts) && entry.compoundParts.length) {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      const words = document.createElement("div");
      heading.textContent = "Compound";
      words.className = "word-context-compound-list";
      entry.compoundParts.forEach((part) => {
        const item = document.createElement("span");
        item.textContent = part.english || part.display || part.translation || "";
        words.appendChild(item);
      });
      section.appendChild(heading);
      section.appendChild(words);
      wordContextSymbolGroups.appendChild(section);
    }
  }

  function openWordContext(entryId) {
    currentWordEntryId = entryId;
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    const idx = findEntryIndexById(entries, entryId);
    const entry = idx >= 0 ? entries[idx] : null;
    if (!entry) return;
    wordContextTitle.textContent = getEntryDisplayWord(entry, getStoredLang());
    wordContextNote.value = entry.note || "";
    renderWordContextSymbols(entry);
    wordContextMetadata.textContent = entry.createdBy
      ? formatFirstCreatedBy(entry) + " · " + formatLastEditedBy(entry)
      : "";
    wordContextEditCreate.classList.toggle("hidden", !!entry.isCore);
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
  wordContextEditCreate.addEventListener("click", () => {
    if (!currentWordEntryId) return;
    const entryId = currentWordEntryId;
    closeWordContext();
    openDictionaryEditor({ entryId });
  });

  wordContextSaveNote.addEventListener("click", () => {
    if (!currentWordEntryId) return;
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    const idx = findEntryIndexById(entries, currentWordEntryId);
    if (idx < 0) return;
    entries[idx].note = wordContextNote.value.trim();
    markEntryEdited(entries[idx]);
    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    loadEntries();
    closeWordContext();
  });

  wordContextDelete.addEventListener("click", () => {
    if (!requireAdminPassword("dictionary.passwordPrompt")) return;
    const entries = JSON.parse(localStorage.getItem("dictionaryEntries") || "[]");
    const idx = findEntryIndexById(entries, currentWordEntryId);
    const entry = idx >= 0 ? entries[idx] : null;
    if (!entry || !adminEditBox) return;
    const tr = entry.translations || {};
    Object.keys(adminInputs).forEach((lang) => {
      if (!adminInputs[lang]) return;
      adminInputs[lang].value = entry.isCore ? getEntryDisplayWord(entry, lang) : (tr[lang] || "");
    });
    if (adminCreatorInput) adminCreatorInput.value = entry.createdBy || "";
    if (adminEditorInput) adminEditorInput.value = entry.lastEditedBy || "";
    adminEditBox.classList.remove("hidden");
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
        if (adminCreatorInput) entry.createdBy = adminCreatorInput.value.trim() || ANONYMOUS_NAME;
        if (adminEditorInput) entry.lastEditedBy = adminEditorInput.value.trim() || ANONYMOUS_NAME;
        if (!entry.createdAt) entry.createdAt = new Date().toISOString();
        if (!entry.lastEditedAt) entry.lastEditedAt = entry.createdAt;
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

  // --- Search, filters, and pagination ---
  searchBar.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentPage = 1;
      loadEntries();
    }, 180);
  });

  if (hideCoreWordsCheckbox) {
    hideCoreWordsCheckbox.addEventListener("change", () => {
      currentPage = 1;
      loadEntries();
    });
  }
  if (checkExceptionsCheckbox) {
    checkExceptionsCheckbox.addEventListener("change", () => {
      currentPage = 1;
      loadEntries();
    });
  }
  if (exceptionsModeSelect) {
    exceptionsModeSelect.addEventListener("change", () => {
      if (checkExceptionsCheckbox && checkExceptionsCheckbox.checked) {
        currentPage = 1;
        loadEntries();
      }
    });
  }
  if (stampFilter) {
    stampFilter.addEventListener("change", () => {
      currentPage = 1;
      loadEntries();
    });
  }
  if (languageFilter) {
    document.addEventListener("click", (event) => {
      if (languageFilter.open && !languageFilter.contains(event.target)) {
        languageFilter.removeAttribute("open");
      }
    });
  }
  pagePrevButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (currentPage <= 1) return;
      currentPage--;
      loadEntriesForPageChange();
    });
  });
  pageNextButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentPage++;
      loadEntriesForPageChange();
    });
  });
  pageInputs.forEach((input) => {
    input.addEventListener("change", () => {
      currentPage = Math.max(1, parseInt(input.value, 10) || 1);
      loadEntriesForPageChange();
    });
  });

  window.onLanguageChange = () => {
    applyUiLanguageDictionaryDefaults();
    buildLanguageOptions();
    buildExceptionsModeSelect();
    currentPage = 1;
    loadEntries();
  };
  window.kanjiBuilderRefreshDictionary = loadEntries;

  applyUiLanguageDictionaryDefaults();
  buildLanguageOptions();
  buildExceptionsModeSelect();

  async function bootstrapDictionaryPage() {
    showDictionaryLoading("dictionary.loadingFile");
    setDictionaryLoadingProgress(100, "dictionary.loadingFile", 8);
    await yieldDictionaryUi();

    setDictionaryLoadingProgress(0, "dictionary.loadingIndexes", 10);
    await buildSharedHomographIndexAsync(
      (stage) => setDictionaryLoadingProgress(stage, "dictionary.loadingIndexes", 10 + Math.round(stage * 0.24)),
      yieldDictionaryUi
    );
    setDictionaryLoadingProgress(100, "dictionary.loadingIndexes", 34);
    await yieldDictionaryUi();

    setDictionaryLoadingProgress(0, "dictionary.loadingIndexes", 36);
    await buildSharedEnglishHubIndexAsync(
      (stage) => setDictionaryLoadingProgress(stage, "dictionary.loadingIndexes", 36 + Math.round(stage * 0.24)),
      yieldDictionaryUi
    );
    setDictionaryLoadingProgress(100, "dictionary.loadingIndexes", 60);
    await yieldDictionaryUi();

    setDictionaryLoadingProgress(0, "dictionary.loadingIndexes", 62);
    await yieldDictionaryUi();
    getManualHomographIndex();
    setDictionaryLoadingProgress(100, "dictionary.loadingIndexes", 68);
    await yieldDictionaryUi();

    setDictionaryLoadingProgress(0, "dictionary.loadingList", 70);
    await yieldDictionaryUi();
    await loadEntriesAsync();
    setDictionaryLoadingProgress(100, "dictionary.loadingAlmost", 100);
    await yieldDictionaryUi(100);
    hideDictionaryLoading();
  }

  bootstrapDictionaryPage();
}

/* --------------------------------
   WEB PAGE — symbol-based dictionary search
-------------------------------- */
if (page === "web") {
  const WEB_MODE_KEY = "webSearchMode";
  const querySymbols = [];
  const modeSelect = document.getElementById("web-search-mode");
  const modeHint = document.getElementById("web-mode-hint");
  const modeToggle = document.getElementById("web-mode-toggle");
  const queryRow = document.getElementById("web-query-symbols");
  const clearQueryBtn = document.getElementById("web-clear-query");
  const symbolSearchInput = document.getElementById("web-symbol-search");
  const symbolGrid = document.getElementById("web-symbol-grid");
  const resultsEl = document.getElementById("web-results");
  const resultsStatus = document.getElementById("web-results-status");
  const worldDictionaryRows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
  const { openDictionaryEditor } = setupSharedDictionaryEditor(() => runWebSearch());

  function getWebMode() {
    return (modeSelect && modeSelect.value) || "strict";
  }

  function updateWebModeHint() {
    if (!modeHint) return;
    const mode = getWebMode();
    const path = mode === "shapeless"
      ? "web.hintShapeless"
      : mode === "contains"
        ? "web.hintContains"
        : "web.hintStrict";
    modeHint.textContent = getTranslation(path) || "";
  }

  function getEntryStampRefs(entry) {
    if (!entry) return [];
    if (entry.categories && Array.isArray(entry.categories.is)) return entry.categories.is.slice(0, 4);
    return getSymbolsForEntry(entry).slice(0, 4);
  }

  function getEntryIsRefs(entry) {
    if (!entry) return [];
    if (entry.categories && Array.isArray(entry.categories.is)) return entry.categories.is.slice();
    return getSymbolsForEntry(entry).slice();
  }

  function refsToIds(refs) {
    return (refs || [])
      .map((ref) => (ref && ref.id != null ? String(ref.id) : ""))
      .filter(Boolean);
  }

  function queryIds() {
    return querySymbols.map((sym) => String(sym.id));
  }

  function matchesStrict(stampIds, ids) {
    if (!ids.length || stampIds.length < ids.length) return false;
    return ids.every((id, index) => stampIds[index] === id);
  }

  function matchesShapeless(stampIds, ids) {
    if (!ids.length) return false;
    const set = new Set(stampIds);
    return ids.every((id) => set.has(id));
  }

  function matchesContains(stampIds, isIds, ids) {
    if (!ids.length) return false;
    const set = new Set(stampIds.concat(isIds));
    return ids.every((id) => set.has(id));
  }

  function getPriorityIndexes(stampIds, isIds, ids, mode) {
    return ids.map((id) => {
      const stampIndex = stampIds.indexOf(id);
      if (stampIndex >= 0) return stampIndex;
      if (mode === "contains") {
        const isIndex = isIds.indexOf(id);
        if (isIndex >= 0) return 4 + isIndex;
      }
      return 999;
    });
  }

  function comparePriority(a, b) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
      const av = a[i] == null ? 999 : a[i];
      const bv = b[i] == null ? 999 : b[i];
      if (av !== bv) return av - bv;
    }
    return 0;
  }

  function isQuerySelected(symbolId) {
    return querySymbols.some((sym) => String(sym.id) === String(symbolId));
  }

  function addQuerySymbol(symbol) {
    if (!symbol || querySymbols.length >= 8) return;
    if (isQuerySelected(symbol.id)) return;
    querySymbols.push(symbol);
    renderQuerySymbols();
    renderWebSymbolGrid();
    runWebSearch();
  }

  function removeQuerySymbolAt(index) {
    if (index < 0 || index >= querySymbols.length) return;
    querySymbols.splice(index, 1);
    renderQuerySymbols();
    renderWebSymbolGrid();
    runWebSearch();
  }

  function clearQuerySymbols() {
    querySymbols.length = 0;
    renderQuerySymbols();
    renderWebSymbolGrid();
    runWebSearch();
  }

  function renderQuerySymbols() {
    if (!queryRow) return;
    queryRow.innerHTML = "";
    if (!querySymbols.length) {
      const empty = document.createElement("span");
      empty.className = "web-query-empty";
      empty.textContent = getTranslation("web.emptyQuerySlot") || "Add symbols from the grid";
      queryRow.appendChild(empty);
      return;
    }
    querySymbols.forEach((symbol, index) => {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "web-query-chip";
      chip.title = "Remove";
      const slot = document.createElement("span");
      slot.className = "web-query-slot";
      slot.textContent = "#" + (index + 1);
      const name = document.createElement("span");
      name.textContent = getSymbolName(symbol);
      chip.appendChild(slot);
      chip.appendChild(createSymbolVisual(symbol, getSymbolName(symbol)));
      chip.appendChild(name);
      chip.addEventListener("click", () => removeQuerySymbolAt(index));
      queryRow.appendChild(chip);
    });
  }

  function getWebSymbolExtras() {
    try {
      return JSON.parse(localStorage.getItem("symbolExtras") || "{}");
    } catch {
      return {};
    }
  }

  function symbolMatchesFilter(symbol, query) {
    if (!query) return true;
    const extras = getWebSymbolExtras();
    const name = getSymbolName(symbol).toLowerCase();
    const desc = (getSymbolDescription(symbol) || "").toLowerCase();
    const extraText = (extras[symbol.id] || "").toLowerCase();
    return name.includes(query) || (desc && desc.includes(query)) || (extraText && extraText.includes(query));
  }

  function appendWebSymbolBox(symbol, options) {
    const opts = options || {};
    const box = document.createElement("div");
    box.className = "symbol-box";
    if (opts.isKeyCategory) box.classList.add("symbol-key-category");
    if (opts.isKeyOpen) box.classList.add("symbol-key-open");
    if (isQuerySelected(symbol.id) && !opts.isKeyCategory) box.classList.add("web-symbol-selected");
    box.dataset.symbolId = symbol.id;
    if (opts.categoryIndex != null) box.dataset.keyCategoryIndex = String(opts.categoryIndex);
    const displayName = getSymbolName(symbol);
    box.title = displayName;
    box.appendChild(createSymbolVisual(symbol, displayName));
    const nameSpan = document.createElement("span");
    nameSpan.textContent = displayName;
    box.appendChild(nameSpan);
    if (opts.isKeyCategory) {
      box.addEventListener("click", () => {
        keyModeOpenCategory = opts.categoryIndex;
        renderWebSymbolGrid();
      });
    } else {
      box.addEventListener("click", () => addQuerySymbol(symbol));
      box.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        if (typeof window.showSymbolInfo === "function") window.showSymbolInfo(symbol);
      });
    }
    symbolGrid.appendChild(box);
  }

  function appendWebEmptySymbolBox() {
    const blank = document.createElement("div");
    blank.className = "symbol-box symbol-box-empty";
    blank.setAttribute("aria-hidden", "true");
    symbolGrid.appendChild(blank);
  }

  let keyModeOpenCategory = 0;

  function getWebSymbolViewMode() {
    return modeToggle && modeToggle.dataset.mode === "key" ? "key" : "manual";
  }

  function renderWebSymbolGrid() {
    if (!symbolGrid || typeof symbols === "undefined") return;
    const query = ((symbolSearchInput && symbolSearchInput.value) || "").trim().toLowerCase();
    symbolGrid.innerHTML = "";
    if (query) {
      symbolGrid.classList.remove("symbol-grid-key");
      symbols.forEach((symbol) => {
        if (!symbolMatchesFilter(symbol, query)) return;
        appendWebSymbolBox(symbol);
      });
      return;
    }

    if (getWebSymbolViewMode() === "key") {
      symbolGrid.classList.add("symbol-grid-key");
      const board = buildKeyModeBoard(keyModeOpenCategory);
      keyModeOpenCategory = board.openIndex;
      board.topIds.forEach((cellId, cellIndex) => {
        if (!cellId) {
          appendWebEmptySymbolBox();
          return;
        }
        const sym = symbols.find((s) => s.id === cellId);
        if (!sym) {
          appendWebEmptySymbolBox();
          return;
        }
        appendWebSymbolBox(sym, { isKeyOpen: cellIndex === 0 });
      });
      board.bottomHeads.forEach((head) => {
        const sym = symbols.find((s) => s.id === head.id);
        if (!sym) {
          appendWebEmptySymbolBox();
          return;
        }
        appendWebSymbolBox(sym, {
          isKeyCategory: true,
          categoryIndex: head.categoryIndex,
        });
      });
      return;
    }

    symbolGrid.classList.remove("symbol-grid-key");
    const layout = (typeof symbolGridLayout !== "undefined" && Array.isArray(symbolGridLayout))
      ? symbolGridLayout
      : null;

    if (layout) {
      layout.flat().forEach((cellId) => {
        if (!cellId) {
          appendWebEmptySymbolBox();
          return;
        }
        const sym = symbols.find((s) => s.id === cellId);
        if (!sym) {
          appendWebEmptySymbolBox();
          return;
        }
        appendWebSymbolBox(sym);
      });
      return;
    }

    symbols.forEach((symbol) => {
      appendWebSymbolBox(symbol);
    });
  }

  function createWebInfoTable(fields) {
    const table = document.createElement("div");
    table.className = "world-entry-table";
    fields.forEach(([label, value]) => {
      const field = document.createElement("div");
      field.className = "world-entry-field";
      const title = document.createElement("strong");
      title.textContent = label || "";
      const fieldValue = document.createElement("span");
      fieldValue.textContent = value || "";
      field.appendChild(title);
      field.appendChild(fieldValue);
      table.appendChild(field);
    });
    return table;
  }

  function getWorldFieldFromLine(line, fieldIndex) {
    let start = 0;
    for (let i = 0; i < fieldIndex; i++) {
      start = line.indexOf("\t", start);
      if (start < 0) return "";
      start++;
    }
    const end = line.indexOf("\t", start);
    return end < 0 ? line.slice(start) : line.slice(start, end);
  }

  function getWebPronunciationField(parts) {
    if (parts[2]) return [getTranslation("dictionary.pinyin"), parts[2]];
    if (parts[3]) return [getTranslation("dictionary.hiragana"), parts[3]];
    if (parts[4]) return [getTranslation("dictionary.latinLetters"), parts[4]];
    return ["", ""];
  }

  function getWebCoreCatalogMetadata(entry, lang) {
    const englishKey = (entry.definition || "").toLocaleLowerCase("en");
    const candidates = worldDictionaryRows.filter((line) => getWorldFieldFromLine(line, 0).toLocaleLowerCase("en") === englishKey);
    const displayWord = getEntryDisplayWord(entry, lang);
    let translationLine = null;
    if (lang !== "en") {
      translationLine = candidates.find((line) => {
        const lastTab = line.lastIndexOf("\t");
        return WORLD_ORIGIN_TO_LANG[line.slice(lastTab + 1)] === lang &&
          getWorldFieldFromLine(line, 1).toLocaleLowerCase(lang) === displayWord.toLocaleLowerCase(lang);
      }) || candidates.find((line) => {
        const lastTab = line.lastIndexOf("\t");
        return WORLD_ORIGIN_TO_LANG[line.slice(lastTab + 1)] === lang;
      }) || null;
    }
    const fallbackLine = lang === "en" ? candidates[0] : (translationLine || candidates[0]);
    const posParts = (translationLine || fallbackLine || "").split("\t");
    const pronunciation = translationLine
      ? getWebPronunciationField(translationLine.split("\t"))
      : ["", ""];
    return {
      pos: posParts[5] || [].concat(entry.partOfSpeech || []).join(", ") || "Noun",
      pronunciation,
    };
  }

  function createWebCoreInfoTable(entry) {
    const lang = getStoredLang();
    const englishMode = lang === "en";
    const metadata = getWebCoreCatalogMetadata(entry, lang);
    return createWebInfoTable([
      [getTranslation("dictionary.english"), entry.definition || ""],
      [englishMode ? "" : getTranslation("dictionary.translation"), englishMode ? "" : getEntryDisplayWord(entry, lang)],
      [getTranslation("dictionary.partOfSpeech"), metadata.pos],
      ["", ""],
      metadata.pronunciation,
    ]);
  }

  function createWebCustomInfoTable(entry) {
    const translations = entry.translations || {};
    const origin = entry.originLanguage || entry.translationSource || "en";
    let translated = entry.translationLanguage || "";
    if (!translated || translated === origin) {
      const keys = Object.keys(translations).filter((code) => code !== origin);
      if (keys.includes("en")) translated = "en";
      else if (keys.length) translated = keys[0];
      else translated = origin === "en" ? "" : "en";
    }
    const originWord = translations[origin] || (origin === "en" ? (entry.definition || "") : "");
    const translatedWord = translated
      ? (translations[translated] || (translated === "en" ? (entry.definition || "") : ""))
      : "";
    const rows = [
      [LANGUAGES[origin] || origin, originWord],
      [translated ? (LANGUAGES[translated] || translated) : getTranslation("dictionary.translation"), translatedWord],
      [getTranslation("dictionary.partOfSpeech"), [].concat(entry.partOfSpeech || []).join(", ")],
    ];
    [
      [origin, "zh", "dictionary.pinyin", "pinyin"],
      [translated, "zh", "dictionary.pinyin", "pinyin"],
      [origin, "ja", "dictionary.hiragana", "hiragana"],
      [translated, "ja", "dictionary.hiragana", "hiragana"],
      [origin, "ru", "dictionary.latinLetters", "latinLetters"],
      [translated, "ru", "dictionary.latinLetters", "latinLetters"],
    ].forEach(([lang, needed, labelKey, field]) => {
      if (lang !== needed) return;
      if (rows.some((row) => row[0] === getTranslation(labelKey))) return;
      rows.push([getTranslation(labelKey), entry[field] || ""]);
    });
    return createWebInfoTable(rows);
  }

  function appendWebEntryAuthorship(entryDiv, entry) {
    if (!entry || entry.isCore || (!entry.createdBy && !entry.lastEditedBy)) return;
    const footer = document.createElement("div");
    footer.className = "entry-authorship";
    const created = document.createElement("span");
    const edited = document.createElement("span");
    created.textContent = formatFirstCreatedBy(entry);
    edited.textContent = formatLastEditedBy(entry);
    footer.appendChild(created);
    footer.appendChild(edited);
    entryDiv.appendChild(footer);
  }

  function renderWebResult(entry, priority) {
    const entryDiv = document.createElement("div");
    entryDiv.className = "entry";
    if (entry.isCore) entryDiv.classList.add("entry-core");
    else entryDiv.classList.add("entry-custom");
    entryDiv.classList.add("entry-" + getEntryStampStatus(entry));

    let symbolsDiv;

    if (entry.isCore && entry.slots) {
      symbolsDiv = document.createElement("div");
      symbolsDiv.className = "entry-symbols";
      entry.slots.forEach((slot) => {
        const slotGroup = document.createElement("div");
        slotGroup.className = "entry-slot-group";
        const hasEffects = slot.effectLeft || slot.effectRight;
        if (hasEffects) {
          const effectsCol = document.createElement("div");
          effectsCol.className = "entry-effects-column";
          [slot.effectLeft, slot.effectRight].forEach((ref) => {
            if (!ref) return;
            const box = document.createElement("div");
            box.className = "entry-effect";
            const sym = typeof symbols !== "undefined" && symbols.find((s) => s.id === ref.id);
            const name = sym ? getSymbolName(sym) : (ref.name || "");
            box.title = name;
            box.appendChild(createSymbolVisual(ref, name));
            effectsCol.appendChild(box);
          });
          slotGroup.appendChild(effectsCol);
        }
        if (slot.main) {
          const mainBox = document.createElement("div");
          mainBox.className = "entry-main";
          const sym = typeof symbols !== "undefined" && symbols.find((s) => s.id === slot.main.id);
          const name = sym ? getSymbolName(sym) : (slot.main.name || "");
          mainBox.title = name;
          mainBox.appendChild(createSymbolVisual(slot.main, name));
          slotGroup.appendChild(mainBox);
        }
        symbolsDiv.appendChild(slotGroup);
      });
    } else {
      symbolsDiv = createEntryCompactStamp(entry);
    }

    entryDiv.appendChild(symbolsDiv);
    if (entry.isCore) entryDiv.appendChild(createWebCoreInfoTable(entry));
    else entryDiv.appendChild(createWebCustomInfoTable(entry));
    appendWebEntryAuthorship(entryDiv, entry);

    const priorityLine = document.createElement("div");
    priorityLine.className = "web-result-priority";
    priorityLine.textContent = formatTranslation("web.slots", {
      values: priority.map((n) => (n >= 999 ? "-" : String(n + 1))).join(", "),
    });
    entryDiv.appendChild(priorityLine);

    entryDiv.dataset.entryId = entry._entryId;
    entryDiv.addEventListener("click", () => openDictionaryEditor({ entryId: entry._entryId }));
    resultsEl.appendChild(entryDiv);
  }

  function runWebSearch() {
    if (!resultsEl) return;
    resultsEl.innerHTML = "";
    const ids = queryIds();
    if (!ids.length) {
      if (resultsStatus) resultsStatus.textContent = getTranslation("web.noQuery") || "";
      return;
    }
    const mode = getWebMode();
    const lang = getStoredLang();
    const matches = [];
    ensureCoreWordsInDictionary().forEach((entry) => {
      const stampIds = refsToIds(getEntryStampRefs(entry));
      const isIds = refsToIds(getEntryIsRefs(entry));
      if (!stampIds.length && !isIds.length) return;
      let ok = false;
      if (mode === "strict") ok = matchesStrict(stampIds, ids);
      else if (mode === "shapeless") ok = matchesShapeless(stampIds, ids);
      else ok = matchesContains(stampIds, isIds, ids);
      if (!ok) return;
      matches.push({
        entry,
        priority: getPriorityIndexes(stampIds, isIds, ids, mode),
      });
    });
    matches.sort((a, b) => {
      const byPriority = comparePriority(a.priority, b.priority);
      if (byPriority) return byPriority;
      return getEntryDisplayWord(a.entry, lang).localeCompare(getEntryDisplayWord(b.entry, lang), lang, {
        sensitivity: "base",
        numeric: true,
      });
    });
    matches.forEach((match) => renderWebResult(match.entry, match.priority));
    if (resultsStatus) {
      resultsStatus.textContent = matches.length
        ? (getTranslation("web.resultsSummary") || "{count} matching words").replace("{count}", String(matches.length))
        : (getTranslation("web.noResults") || "No matching words.");
    }
  }

  if (modeSelect) {
    const saved = localStorage.getItem(WEB_MODE_KEY);
    if (saved && ["strict", "shapeless", "contains"].includes(saved)) modeSelect.value = saved;
    modeSelect.addEventListener("change", () => {
      localStorage.setItem(WEB_MODE_KEY, getWebMode());
      updateWebModeHint();
      runWebSearch();
    });
  }
  if (modeToggle) {
    applySymbolViewModeToToggle(modeToggle);
    modeToggle.addEventListener("click", () => {
      const next = modeToggle.dataset.mode === "key" ? "manual" : "key";
      setStoredSymbolViewMode(next);
      applySymbolViewModeToToggle(modeToggle);
      if (symbolSearchInput) symbolSearchInput.value = "";
      renderWebSymbolGrid();
    });
  }
  if (clearQueryBtn) clearQueryBtn.addEventListener("click", clearQuerySymbols);
  if (symbolSearchInput) {
    symbolSearchInput.addEventListener("input", () => {
      clearTimeout(symbolSearchInput._webTimer);
      symbolSearchInput._webTimer = setTimeout(renderWebSymbolGrid, 120);
    });
  }

  window.onLanguageChange = () => {
    updateWebModeHint();
    if (modeToggle) {
      modeToggle.textContent = getTranslation(modeToggle.dataset.mode === "key" ? "create.keyMode" : "create.manualMode");
    }
    if (typeof window.updateCreateImageUiText === "function") window.updateCreateImageUiText();
    renderQuerySymbols();
    renderWebSymbolGrid();
    runWebSearch();
  };

  window.kanjiBuilderRefreshWeb = () => renderWebSymbolGrid();

  updateWebModeHint();
  renderQuerySymbols();
  renderWebSymbolGrid();
  runWebSearch();
}

/* --------------------------------
   PLAY PAGE
-------------------------------- */
if (page === "play") {
  const PLAY_LANGS_KEY = "playSelectedLangs";
  const PLAY_GAMES = {
    "core-practice": { minPlayers: 1, titleKey: "play.corePracticeTitle" },
    "ladder-guesser": { minPlayers: 2, titleKey: "play.ladderGuesserTitle" },
    "guess-stamp": { minPlayers: 1, titleKey: "play.guessStampTitle" },
    "manual-input": { minPlayers: 1, titleKey: "play.manualInputTitle" },
  };

  const setupSection = document.getElementById("play-setup");
  const gameSection = document.getElementById("play-game");
  const gameCards = Array.from(document.querySelectorAll(".play-game-card"));
  const langOptionsEl = document.getElementById("play-language-options");
  const playerCountInput = document.getElementById("play-player-count");
  const startBtn = document.getElementById("play-start");
  const setupError = document.getElementById("play-setup-error");
  const backBtn = document.getElementById("play-back");
  const contextToggle = document.getElementById("play-context-toggle");
  const contextToggleLabel = document.getElementById("play-context-toggle-label");
  const activeGameTitle = document.getElementById("play-active-game-title");
  const scoreboardEl = document.getElementById("play-scoreboard");
  const gamePanel = document.getElementById("play-game-panel");

  let selectedGame = "core-practice";
  let playState = null;

  function playText(key, vars) {
    let text = getTranslation(key) || "";
    if (vars) {
      Object.keys(vars).forEach((name) => {
        text = text.replace("{" + name + "}", String(vars[name]));
      });
    }
    return text;
  }

  function normalizePlayWord(w, lang) {
    return (w || "").normalize("NFKC").trim().toLocaleLowerCase(lang || "en");
  }

  function isPlayOriginLangAllowed(originLang, allowedLangs) {
    if (!originLang) return false;
    const langs = Array.isArray(allowedLangs) && allowedLangs.length ? allowedLangs : ["en"];
    if (langs.length === 1 && langs[0] === "en") return true;
    return langs.includes(originLang);
  }

  function getPlayWorldField(line, fieldIndex) {
    let start = 0;
    for (let i = 0; i < fieldIndex; i++) {
      start = line.indexOf("\t", start);
      if (start < 0) return "";
      start++;
    }
    const end = line.indexOf("\t", start);
    return end < 0 ? line.slice(start) : line.slice(start, end);
  }

  function playSymbolRef(sym) {
    return sym ? { id: sym.id, name: sym.name, image: sym.image, rgb: sym.rgb } : null;
  }

  function getPlayMatchEnglish(match) {
    if (!match) return "";
    if (match.type === "local") return (match.entry.translations && match.entry.translations.en) || match.entry.definition || match.word || "";
    return getPlayWorldField(match.worldLine, 0);
  }

  function getPlayMatchOrigin(match) {
    if (!match) return "en";
    if (match.type === "local") {
      if (match.entry.isCore) return "en";
      return match.entry.originLanguage || match.entry.translationSource || "en";
    }
    return WORLD_ORIGIN_TO_LANG[getPlayWorldField(match.worldLine, 7)] || "en";
  }

  function playWordHasSymbols(match) {
    if (!match) return false;
    if (match.type === "local") {
      if (match.entry.isCore) return true;
      return getSymbolsForEntry(match.entry).length > 0;
    }
    const stamp = getPlayWorldField(match.worldLine, 6).trim();
    return Boolean(stamp && stamp !== "[]");
  }

  function buildPlayEntryFromWorldLine(line) {
    const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)] || "en";
    const pos = getPlayWorldField(line, 5) || "Noun";
    return {
      schemaVersion: 2,
      _entryId: makeEntryId(),
      categories: { is: [], unrelated: [], isNot: [] },
      stampSymbols: [],
      symbols: [],
      definition: getPlayWorldField(line, 0),
      isCore: false,
      originLanguage: originLang,
      translationSource: originLang,
      translationLanguage: "en",
      translations: { en: getPlayWorldField(line, 0), [originLang]: getPlayWorldField(line, 1) },
      partOfSpeech: pos.split(/\s*&\s*/).filter(Boolean),
      pinyin: getPlayWorldField(line, 2),
      hiragana: getPlayWorldField(line, 3),
      latinLetters: getPlayWorldField(line, 4),
    };
  }

  function playWordsMatch(guessMatch, secretMatch) {
    if (!guessMatch || !secretMatch) return false;
    const gEnglish = normalizeDictionaryWord(getPlayMatchEnglish(guessMatch));
    const sEnglish = normalizeDictionaryWord(getPlayMatchEnglish(secretMatch));
    // Same English hub = same word across languages (Tiger ↔ とら).
    if (gEnglish && sEnglish && gEnglish === sEnglish) return true;
    const gOrigin = getPlayMatchOrigin(guessMatch);
    const sOrigin = getPlayMatchOrigin(secretMatch);
    if (gOrigin !== sOrigin) return false;
    const gWord = normalizeDictionaryWord(guessMatch.word || "");
    const sWord = normalizeDictionaryWord(secretMatch.word || "");
    return Boolean(gWord && sWord && gWord === sWord);
  }

  function playGuessMatchesSecret(guessText, guessMatches, secretMatch, guessLang) {
    if (!secretMatch) return false;
    if ((guessMatches || []).some((match) => playWordsMatch(match, secretMatch))) return true;
    const normalizedGuess = normalizeDictionaryWord(normalizePlayWord(guessText, guessLang || "en"));
    if (!normalizedGuess) return false;
    const secretEnglish = normalizeDictionaryWord(getPlayMatchEnglish(secretMatch));
    if (secretEnglish && secretEnglish === normalizedGuess) return true;
    const secretWord = normalizeDictionaryWord(normalizePlayWord(secretMatch.word || "", secretMatch.lang || getPlayMatchOrigin(secretMatch)));
    return Boolean(secretWord && secretWord === normalizedGuess);
  }

  function applyPlaySymbolRefsToEntry(entry, symbolRefs) {
    if (!entry || entry.isCore || !symbolRefs || !symbolRefs.length) return false;
    if (!entry.categories) entry.categories = { is: [], unrelated: [], isNot: [] };
    let changed = false;
    symbolRefs.forEach((ref) => {
      if (!ref || ref.id == null) return;
      const exists = entry.categories.is.some((r) => String(r.id) === String(ref.id));
      if (!exists) {
        entry.categories.is.push(Object.assign({}, ref));
        changed = true;
      }
    });
    if (!changed) return false;
    entry.stampSymbols = entry.categories.is.slice(0, 4);
    entry.symbols = entry.stampSymbols;
    entry.tempstamped = entry.stampSymbols.length > 0;
    markEntryEdited(entry);
    return true;
  }

  function findPlayLocalEntryIndex(entries, english, originLang, translation) {
    const englishNorm = normalizeDictionaryWord(english);
    const origin = originLang || "en";
    const translationNorm = normalizeDictionaryWord(translation || "");
    let reverseIndex = -1;
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry || entry.isCore) continue;
      const entryEn = normalizeDictionaryWord((entry.translations && entry.translations.en) || entry.definition || "");
      if (entryEn !== englishNorm) continue;
      const entryOrigin = entry.originLanguage || entry.translationSource || "en";
      const entryTr = normalizeDictionaryWord((entry.translations && entry.translations[origin]) || "");
      if (entryOrigin === origin) {
        if (!translationNorm || !entryTr || entryTr === translationNorm) return i;
        continue;
      }
      // English-Language local that already stores this foreign gloss.
      if (translationNorm && entryTr === translationNorm && reverseIndex < 0) reverseIndex = i;
    }
    return reverseIndex;
  }

  function ensurePlayLocalFromWorldLine(entries, line) {
    const english = getPlayWorldField(line, 0);
    const translation = getPlayWorldField(line, 1);
    const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)] || "en";
    if (!english || !originLang || originLang === "en") return -1;
    if (isEnglishPlaceholderTranslation(english, translation)) return -1;
    let index = findPlayLocalEntryIndex(entries, english, originLang, translation);
    if (index >= 0) {
      const existing = entries[index];
      if (!existing.translations) existing.translations = {};
      if (!existing.translations[originLang] && translation) existing.translations[originLang] = translation;
      if (!existing.translations.en) existing.translations.en = english;
      if (!existing.translationLanguage && (existing.originLanguage || existing.translationSource) !== "en") {
        existing.translationLanguage = "en";
      }
      return index;
    }
    // Fall back to any same-English / same-origin entry (legacy play saves).
    index = findPlayLocalEntryIndex(entries, english, originLang, "");
    if (index >= 0) {
      const existing = entries[index];
      if (!existing.translations) existing.translations = {};
      if (!existing.translations[originLang] && translation) existing.translations[originLang] = translation;
      if (!existing.translations.en) existing.translations.en = english;
      if (!existing.translationLanguage && (existing.originLanguage || existing.translationSource) !== "en") {
        existing.translationLanguage = "en";
      }
      return index;
    }
    const entry = buildPlayEntryFromWorldLine(line);
    initializeEntryAuthorship(entry);
    entries.push(entry);
    return entries.length - 1;
  }

  function playWorldLineHasHomographStar(line) {
    if (!line) return false;
    const english = getPlayWorldField(line, 0);
    const translation = getPlayWorldField(line, 1);
    const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)];
    if (isHomographWordOrAlt(english, "en")) return true;
    if (originLang && isHomographWordOrAlt(translation, originLang)) return true;
    return false;
  }

  function playMatchHasHomographStar(match) {
    if (!match) return false;
    if (match.type === "local" && match.entry) return playEntryHasHomographStar(match.entry);
    if (match.type === "world" && match.worldLine) return playWorldLineHasHomographStar(match.worldLine);
    const lang = match.lang || getPlayMatchOrigin(match);
    if (match.word && isHomographWordOrAlt(match.word, lang)) return true;
    const english = getPlayMatchEnglish(match);
    if (english && isHomographWordOrAlt(english, "en")) return true;
    return false;
  }

  function propagatePlaySymbolsAcrossTranslations(english, symbolRefs, entries, primaryEntryId) {
    const englishNorm = normalizeDictionaryWord(english);
    if (!englishNorm || !symbolRefs || !symbolRefs.length) return;
    // Ambiguous English hub: nothing auto-fills; every linked card would show an English ★.
    if (isHomographWordOrAlt(english, "en")) return;

    entries.forEach((entry) => {
      if (!entry || entry.isCore) return;
      if (primaryEntryId && entry._entryId === primaryEntryId) return;
      if (playEntryHasHomographStar(entry)) return;
      const entryEn = normalizeDictionaryWord((entry.translations && entry.translations.en) || entry.definition || "");
      if (entryEn !== englishNorm) return;
      applyPlaySymbolRefsToEntry(entry, symbolRefs);
    });

    const perLangCount = {};
    (window.WORLD_DICTIONARY_ROWS || []).forEach((line) => {
      const rowEnglish = getPlayWorldField(line, 0);
      if (normalizeDictionaryWord(rowEnglish) !== englishNorm) return;
      const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)];
      if (!originLang || originLang === "en") return;
      const translation = getPlayWorldField(line, 1);
      if (isEnglishPlaceholderTranslation(rowEnglish, translation)) return;
      if (playWorldLineHasHomographStar(line)) return;
      perLangCount[originLang] = (perLangCount[originLang] || 0) + 1;
      if (perLangCount[originLang] > 24) return;
      const index = ensurePlayLocalFromWorldLine(entries, line);
      if (index < 0) return;
      if (playEntryHasHomographStar(entries[index])) return;
      applyPlaySymbolRefsToEntry(entries[index], symbolRefs);
    });
  }

  function addPlaySymbolsToWordIs(match, symbolRefs, options) {
    if (!match || !symbolRefs.length) return null;
    if (match.type === "local" && match.entry && match.entry.isCore) return null;
    let entries = ensureCoreWordsInDictionary();
    let entry = null;
    let index = -1;

    if (match.type === "local") {
      index = findEntryIndexById(entries, match.entryId);
      entry = index >= 0 ? entries[index] : null;
    } else if (match.type === "world") {
      index = ensurePlayLocalFromWorldLine(entries, match.worldLine);
      entry = index >= 0 ? entries[index] : null;
    }
    if (!entry || entry.isCore || index < 0) return null;

    const starred = playEntryHasHomographStar(entry) || playMatchHasHomographStar(match);
    // Homographs are manual: wrong-guess autofill must not stamp them.
    // Knower/direct picks pass allowStarredPrimary to stamp only that word.
    if (starred && !(options && options.allowStarredPrimary)) return null;

    applyPlaySymbolRefsToEntry(entry, symbolRefs);
    entries[index] = entry;

    if (!starred) {
      const english = getPlayMatchEnglish(match) || (entry.translations && entry.translations.en) || entry.definition || "";
      propagatePlaySymbolsAcrossTranslations(english, symbolRefs, entries, entry._entryId);
    }

    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    match.type = "local";
    match.entry = entry;
    match.entryId = entry._entryId;
    return entry;
  }

  function removePlaySymbolRefsFromEntry(entry, symbolRefs) {
    if (!entry || entry.isCore || !symbolRefs || !symbolRefs.length || !entry.categories || !Array.isArray(entry.categories.is)) {
      return false;
    }
    const removeIds = new Set(symbolRefs.map((ref) => String(ref && ref.id != null ? ref.id : "")).filter(Boolean));
    if (!removeIds.size) return false;
    const next = entry.categories.is.filter((ref) => !removeIds.has(String(ref && ref.id != null ? ref.id : "")));
    if (next.length === entry.categories.is.length) return false;
    entry.categories.is = next;
    entry.stampSymbols = entry.categories.is.slice(0, 4);
    entry.symbols = entry.stampSymbols;
    entry.tempstamped = entry.stampSymbols.length > 0;
    markEntryEdited(entry);
    return true;
  }

  function removePlaySymbolsAcrossTranslations(english, symbolRefs, entries, primaryEntryId) {
    const englishNorm = normalizeDictionaryWord(english);
    if (!englishNorm || !symbolRefs || !symbolRefs.length) return;
    entries.forEach((entry) => {
      if (!entry || entry.isCore) return;
      if (primaryEntryId && entry._entryId === primaryEntryId) return;
      if (playEntryHasHomographStar(entry)) return;
      const entryEn = normalizeDictionaryWord((entry.translations && entry.translations.en) || entry.definition || "");
      if (entryEn !== englishNorm) return;
      removePlaySymbolRefsFromEntry(entry, symbolRefs);
    });
  }

  function removePlaySymbolsFromWordIs(match, symbolRefs) {
    if (!match || !symbolRefs.length) return null;
    let entries = ensureCoreWordsInDictionary();
    let entry = null;
    let index = -1;

    if (match.type === "local") {
      index = findEntryIndexById(entries, match.entryId);
      entry = index >= 0 ? entries[index] : null;
    } else if (match.type === "world") {
      index = ensurePlayLocalFromWorldLine(entries, match.worldLine);
      entry = index >= 0 ? entries[index] : null;
    }
    if (!entry || entry.isCore || index < 0) return null;

    const changed = removePlaySymbolRefsFromEntry(entry, symbolRefs);
    if (!changed) return entry;
    entries[index] = entry;

    const starred = playEntryHasHomographStar(entry) || playMatchHasHomographStar(match);
    if (!starred) {
      const english = getPlayMatchEnglish(match) || (entry.translations && entry.translations.en) || entry.definition || "";
      removePlaySymbolsAcrossTranslations(english, symbolRefs, entries, entry._entryId);
    }

    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    match.type = "local";
    match.entry = entry;
    match.entryId = entry._entryId;
    return entry;
  }

  function findPlayWordsExact(word, lang, allowedLangs) {
    const normalized = normalizePlayWord(word, lang);
    if (!normalized) return [];
    const matches = [];
    const seen = new Set();

    function pushMatch(match, key) {
      if (seen.has(key)) return;
      seen.add(key);
      matches.push(match);
    }

    ensureCoreWordsInDictionary().forEach((entry) => {
      if (entry.isCore) {
        const display = getEntryDisplayWord(entry, lang);
        if (normalizePlayWord(display, lang) === normalized) {
          pushMatch({ type: "local", entry, entryId: entry._entryId, word: display, lang, isCore: true }, "core:" + entry._entryId);
        }
        return;
      }
      const source = entry.originLanguage || entry.translationSource || "en";
      if (lang === "en") {
        if (!isPlayOriginLangAllowed(source, allowedLangs)) return;
        const displayEn = (entry.translations && entry.translations.en) || entry.definition || "";
        if (normalizePlayWord(displayEn, "en") === normalized) {
          pushMatch({ type: "local", entry, entryId: entry._entryId, word: displayEn, lang: "en", isCore: false }, "local:" + entry._entryId);
        }
        return;
      }
      if (!isPlayOriginLangAllowed(source, allowedLangs) || source !== lang) return;
      const displaySrc = (entry.translations && entry.translations[source]) || entry.definition || "";
      const displayEn = (entry.translations && entry.translations.en) || entry.definition || "";
      if (normalizePlayWord(displaySrc, source) === normalized || normalizePlayWord(displayEn, "en") === normalized) {
        pushMatch({ type: "local", entry, entryId: entry._entryId, word: displaySrc || displayEn, lang: source, isCore: false }, "local:" + entry._entryId);
      }
    });

    (window.WORLD_DICTIONARY_ROWS || []).forEach((line) => {
      const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)];
      if (!originLang) return;
      const english = getPlayWorldField(line, 0);
      const translation = getPlayWorldField(line, 1);
      if (lang === "en") {
        if (!isPlayOriginLangAllowed(originLang, allowedLangs)) return;
        if (normalizePlayWord(english, "en") !== normalized) return;
        pushMatch({ type: "world", worldLine: line, word: english, lang: "en", isCore: false }, "world:" + line);
        return;
      }
      if (!isPlayOriginLangAllowed(originLang, allowedLangs) || originLang !== lang) return;
      const translationHit = normalizePlayWord(translation, originLang) === normalized;
      // Also allow typing the English gloss while the guess language is set to another language.
      const englishHit = normalizePlayWord(english, "en") === normalized;
      if (!translationHit && !englishHit) return;
      // Prefer showing the language-side form when they typed English for a foreign row.
      const displayWord = translationHit ? translation : translation || english;
      pushMatch({ type: "world", worldLine: line, word: displayWord, lang: originLang, isCore: false }, "world:" + line);
    });

    return matches;
  }

  function findPlayWordExact(word, lang, allowedLangs) {
    const matches = findPlayWordsExact(word, lang, allowedLangs);
    return matches.length ? matches[0] : null;
  }

  function closePlayContextPicker() {
    const existing = document.getElementById("play-context-picker");
    if (existing) existing.remove();
  }

  function filterPlayMatchesByAllowedLangs(matches, allowedLangs) {
    return matches.filter((match) => {
      if (match.isCore || (match.entry && match.entry.isCore)) return false;
      return isPlayOriginLangAllowed(getPlayMatchOrigin(match), allowedLangs);
    });
  }

  function openPlayLanguageContextPicker(langCode, guessText, matches, onPick, onCancel) {
    closePlayContextPicker();
    const overlay = document.createElement("div");
    overlay.id = "play-context-picker";
    overlay.className = "play-context-picker";

    const panel = document.createElement("div");
    panel.className = "play-context-picker-panel";
    const langName = LANGUAGES[langCode] || langCode;
    const title = document.createElement("h3");
    title.textContent = playText("play.chooseContextLang", { lang: langName, word: guessText });
    const hint = document.createElement("p");
    hint.className = "play-hint";
    hint.textContent = playText("play.chooseContextLangHint", { lang: langName });
    const list = document.createElement("div");
    list.className = "play-context-picker-list";
    const actions = document.createElement("div");
    actions.className = "play-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = playText("play.cancelContext");
    cancelBtn.addEventListener("click", () => {
      closePlayContextPicker();
      if (onCancel) onCancel();
    });

    matches.forEach((match) => {
      list.appendChild(createPlayWordSearchResultButton(match, langCode, (picked) => {
        closePlayContextPicker();
        onPick(picked);
      }));
    });

    actions.appendChild(cancelBtn);
    panel.appendChild(title);
    panel.appendChild(hint);
    panel.appendChild(list);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        closePlayContextPicker();
        if (onCancel) onCancel();
      }
    });
    document.body.appendChild(overlay);
  }

  function autoResolvePlayWordAssignments(guessText, lang, allowedLangs) {
    const allMatches = filterPlayMatchesByAllowedLangs(
      findPlayWordsExact(guessText, lang, allowedLangs),
      allowedLangs
    );
    if (!allMatches.length) return [];
    if (playState && playState.secretWord) {
      const linked = allMatches.filter((match) => playWordsMatch(match, playState.secretWord));
      if (linked.length) return linked;
    }
    if (allMatches.length === 1) return allMatches;

    const guessLangMatches = allMatches.filter((match) => getPlayMatchOrigin(match) === lang);
    if (guessLangMatches.length === 1) return guessLangMatches;

    const primary = pickPrimaryPlayAssignment(allMatches, lang);
    return primary ? [primary] : [allMatches[0]];
  }

  function resolvePlayWordAssignments(guessText, lang, allowedLangs, onResolved) {
    const allMatches = filterPlayMatchesByAllowedLangs(
      findPlayWordsExact(guessText, lang, allowedLangs),
      allowedLangs
    );
    if (!allMatches.length) {
      onResolved([]);
      return;
    }

    if (!playState || !playState.contextEnabled) {
      onResolved(autoResolvePlayWordAssignments(guessText, lang, allowedLangs));
      return;
    }

    const byOrigin = new Map();
    allMatches.forEach((match) => {
      const origin = getPlayMatchOrigin(match);
      if (!byOrigin.has(origin)) byOrigin.set(origin, []);
      byOrigin.get(origin).push(match);
    });

    const assignments = [];
    const langsToResolve = allowedLangs.filter((code) => {
      const group = byOrigin.get(code);
      return group && group.length > 0;
    });

    function resolveNext(index) {
      if (index >= langsToResolve.length) {
        onResolved(assignments);
        return;
      }
      const langCode = langsToResolve[index];
      const candidates = byOrigin.get(langCode) || [];
      if (candidates.length <= 1) {
        if (candidates.length === 1) assignments.push(candidates[0]);
        resolveNext(index + 1);
        return;
      }
      openPlayLanguageContextPicker(langCode, guessText, candidates, (picked) => {
        assignments.push(picked);
        resolveNext(index + 1);
      }, () => onResolved([]));
    }

    resolveNext(0);
  }

  function openPlayContextPicker(guessText, matches, onPick) {
    closePlayContextPicker();
    const overlay = document.createElement("div");
    overlay.id = "play-context-picker";
    overlay.className = "play-context-picker";

    const panel = document.createElement("div");
    panel.className = "play-context-picker-panel";
    const title = document.createElement("h3");
    title.textContent = playText("play.chooseContext", { word: guessText });
    const hint = document.createElement("p");
    hint.className = "play-hint";
    hint.textContent = playText("play.chooseContextHint");
    const list = document.createElement("div");
    list.className = "play-context-picker-list";
    const actions = document.createElement("div");
    actions.className = "play-actions";
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.textContent = playText("play.cancelContext");
    cancelBtn.addEventListener("click", closePlayContextPicker);

    matches.forEach((match) => {
      list.appendChild(createPlayWordSearchResultButton(match, playState.wordLang || playState.coreLang || "en", (picked) => {
        closePlayContextPicker();
        onPick(picked);
      }));
    });

    actions.appendChild(cancelBtn);
    panel.appendChild(title);
    panel.appendChild(hint);
    panel.appendChild(list);
    panel.appendChild(actions);
    overlay.appendChild(panel);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closePlayContextPicker();
    });
    document.body.appendChild(overlay);
  }

  function resolvePlayGuessWord(guessText, lang, allowedLangs, onResolved) {
    resolvePlayWordAssignments(guessText, lang, allowedLangs, (matches) => {
      onResolved(matches.length ? matches : null);
    });
  }

  function pickPrimaryPlayAssignment(assignments, preferredLang) {
    if (!assignments || !assignments.length) return null;
    if (assignments.length === 1) return assignments[0];
    const preferred = assignments.find((match) => getPlayMatchOrigin(match) === preferredLang);
    return preferred || assignments[0];
  }

  function getPlayAssignmentWordLabel(matches, wordLang) {
    return matches.map((match) => getPlayWordSearchDetails(match, wordLang).primary).join(", ");
  }

  function searchPlayWords(query, lang, allowedLangs, limit, options) {
    const opts = options || {};
    const q = normalizePlayWord(query, lang);
    if (!q) return [];
    const max = limit || 100;
    const results = [];
    const seen = new Set();

    function pushMatch(match, key) {
      if (seen.has(key) || results.length >= max) return;
      seen.add(key);
      results.push(match);
    }

    (window.WORLD_DICTIONARY_ROWS || []).forEach((line) => {
      if (results.length >= max) return;
      const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)];
      if (!originLang) return;
      const english = getPlayWorldField(line, 0);
      const translation = getPlayWorldField(line, 1);
      if (opts.unstampedOnly && playWordHasSymbols({ type: "world", worldLine: line })) return;

      if (lang === "en") {
        if (!isPlayOriginLangAllowed(originLang, allowedLangs)) return;
        if (!normalizePlayWord(english, "en").includes(q)) return;
        pushMatch({ type: "world", worldLine: line, word: english, lang: "en", isCore: false }, "world:" + line);
        return;
      }
      if (!isPlayOriginLangAllowed(originLang, allowedLangs) || originLang !== lang) return;
      if (!normalizePlayWord(translation, lang).includes(q)) return;
      pushMatch({ type: "world", worldLine: line, word: translation, lang, isCore: false }, "world:" + line);
    });

    ensureCoreWordsInDictionary().forEach((entry) => {
      if (results.length >= max) return;
      if (entry.isCore) {
        if (opts.excludeCore || opts.unstampedOnly) return;
        const word = getEntryDisplayWord(entry, lang);
        if (!normalizePlayWord(word, lang).includes(q)) return;
        pushMatch({ type: "local", entry, entryId: entry._entryId, word, lang, isCore: true }, "core:" + entry._entryId);
        return;
      }
      const source = entry.originLanguage || entry.translationSource || "en";
      if (!isPlayOriginLangAllowed(source, allowedLangs)) return;
      if (lang !== "en" && source !== lang) return;
      if (opts.unstampedOnly && getSymbolsForEntry(entry).length) return;
      const display = lang === "en"
        ? ((entry.translations && entry.translations.en) || entry.definition || "")
        : (lang === source
          ? ((entry.translations && entry.translations[source]) || entry.definition || "")
          : getEntryDisplayWord(entry, lang));
      if (!display || !normalizePlayWord(display, lang).includes(q)) return;
      pushMatch({ type: "local", entry, entryId: entry._entryId, word: display, lang, isCore: false }, "local:" + entry._entryId);
    });

    return results;
  }

  function getRandomChallengeWord(allowedLangs) {
    const pool = [];
    (window.WORLD_DICTIONARY_ROWS || []).forEach((line) => {
      const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)];
      if (!originLang) return;
      if (!isPlayOriginLangAllowed(originLang, allowedLangs)) return;
      if (playWordHasSymbols({ type: "world", worldLine: line })) return;
      pool.push({
        type: "world",
        worldLine: line,
        word: getPlayWorldField(line, 0),
        lang: "en",
        isCore: false,
      });
    });
    ensureCoreWordsInDictionary().forEach((entry) => {
      if (!entry || entry.isCore || getSymbolsForEntry(entry).length) return;
      const source = entry.originLanguage || entry.translationSource || "en";
      if (!isPlayOriginLangAllowed(source, allowedLangs)) return;
      pool.push({
        type: "local",
        entry,
        entryId: entry._entryId,
        word: (entry.translations && entry.translations.en) || entry.definition || "",
        lang: "en",
        isCore: false,
      });
    });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function rollRandomChallengePreview() {
    const match = getRandomChallengeWord(playState.langs);
    if (!match) {
      playState.randomWordPreview = null;
      return null;
    }
    playState.randomWordPreview = match;
    return match;
  }

  function clearRandomChallengePreview() {
    playState.randomWordPreview = null;
  }

  function appendPlayRandomWordPreview(parent, match, wordLang, handlers) {
    const box = document.createElement("div");
    box.className = "play-random-preview";
    const heading = document.createElement("p");
    heading.className = "play-status";
    heading.textContent = playText("play.randomWordPreview");
    const details = getPlayWordSearchDetails(match, wordLang);
    const word = document.createElement("div");
    word.className = "play-word-display";
    word.textContent = details.primary;
    const metaParts = [];
    if (wordLang === "en" && details.translation) metaParts.push(details.translation);
    else if (wordLang !== "en" && details.english) metaParts.push(details.english);
    if (details.origin) metaParts.push(details.origin);
    if (details.pronunciation) {
      metaParts.push((details.pronunciationLabel ? details.pronunciationLabel + ": " : "") + details.pronunciation);
    }
    const meta = document.createElement("p");
    meta.className = "play-search-result-meta";
    meta.textContent = metaParts.join(" · ");
    const actions = document.createElement("div");
    actions.className = "play-actions";
    const rerollBtn = document.createElement("button");
    rerollBtn.type = "button";
    rerollBtn.textContent = playText("play.randomWordReroll");
    rerollBtn.addEventListener("click", handlers.onReroll);
    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "btn-primary";
    confirmBtn.textContent = playText("play.useRandomWord");
    confirmBtn.addEventListener("click", handlers.onConfirm);
    actions.appendChild(rerollBtn);
    actions.appendChild(confirmBtn);
    box.appendChild(heading);
    box.appendChild(word);
    if (metaParts.length) box.appendChild(meta);
    box.appendChild(actions);
    parent.appendChild(box);
  }

  function getCoreEntrySymbolId(entry) {
    const main = entry && entry.slots && entry.slots[0] && entry.slots[0].main;
    return main && main.id != null ? String(main.id) : "";
  }

  function getNextCorePracticeEntry() {
    const cores = ensureCoreWordsInDictionary().filter((e) => e.isCore);
    if (!cores.length) return null;
    if (!playState.coreGuessedSymbolIds) playState.coreGuessedSymbolIds = new Set();
    let available = cores.filter((entry) => {
      const symbolId = getCoreEntrySymbolId(entry);
      return symbolId && !playState.coreGuessedSymbolIds.has(symbolId);
    });
    if (!available.length) {
      playState.coreGuessedSymbolIds.clear();
      available = cores.slice();
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  function markCorePracticeSymbolGuessed(symbolRef) {
    if (!symbolRef || symbolRef.id == null) return;
    if (!playState.coreGuessedSymbolIds) playState.coreGuessedSymbolIds = new Set();
    playState.coreGuessedSymbolIds.add(String(symbolRef.id));
  }

  function getPlayPronunciationFromWorldLine(line, originLang) {
    if (originLang === "zh") return [getTranslation("dictionary.pinyin"), getPlayWorldField(line, 2)];
    if (originLang === "ja") return [getTranslation("dictionary.hiragana"), getPlayWorldField(line, 3)];
    if (originLang === "ru") return [getTranslation("dictionary.latinLetters"), getPlayWorldField(line, 4)];
    return ["", ""];
  }

  function getPlayOriginName(originLang) {
    return Object.keys(WORLD_ORIGIN_TO_LANG).find((name) => WORLD_ORIGIN_TO_LANG[name] === originLang) ||
      LANGUAGES[originLang] || originLang;
  }

  function getPlayWordSearchDetails(match, wordLang) {
    if (match.type === "world") {
      const english = getPlayWorldField(match.worldLine, 0);
      const translation = getPlayWorldField(match.worldLine, 1);
      const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(match.worldLine, 7)] || "en";
      const pronunciation = getPlayPronunciationFromWorldLine(match.worldLine, originLang);
      const primary = wordLang === "en" ? english : (originLang === wordLang ? translation : english);
      return {
        primary,
        english,
        translation: originLang === "en" ? "" : translation,
        origin: getPlayOriginName(originLang),
        pronunciationLabel: pronunciation[0],
        pronunciation: pronunciation[1],
      };
    }
    const entry = match.entry;
    const source = entry.originLanguage || entry.translationSource || "en";
    const english = (entry.translations && entry.translations.en) || entry.definition || "";
    const translation = source === "en" ? "" : ((entry.translations && entry.translations[source]) || "");
    const primary = wordLang === "en"
      ? english
      : (wordLang === source ? (translation || english) : getEntryDisplayWord(entry, wordLang));
    const pronunciation = source === "zh"
      ? [getTranslation("dictionary.pinyin"), entry.pinyin || ""]
      : source === "ja"
        ? [getTranslation("dictionary.hiragana"), entry.hiragana || ""]
        : source === "ru"
          ? [getTranslation("dictionary.latinLetters"), entry.latinLetters || ""]
          : ["", ""];
    return {
      primary,
      english,
      translation,
      origin: getPlayOriginName(source),
      pronunciationLabel: pronunciation[0],
      pronunciation: pronunciation[1],
    };
  }

  function createPlayWordSearchResultButton(match, wordLang, onPick) {
    const details = getPlayWordSearchDetails(match, wordLang);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "play-search-result";

    const word = document.createElement("strong");
    word.className = "play-search-result-word";
    word.textContent = details.primary;
    btn.appendChild(word);

    const metaParts = [];
    if (wordLang === "en" && details.translation) metaParts.push(details.translation);
    else if (wordLang !== "en" && details.english) metaParts.push(details.english);
    if (details.origin) metaParts.push(details.origin);
    if (details.pronunciation) {
      metaParts.push((details.pronunciationLabel ? details.pronunciationLabel + ": " : "") + details.pronunciation);
    }
    if (metaParts.length) {
      const meta = document.createElement("span");
      meta.className = "play-search-result-meta";
      meta.textContent = metaParts.join(" · ");
      btn.appendChild(meta);
    }

    btn.addEventListener("click", () => onPick(match));
    return btn;
  }

  function getPlayerName(index) {
    return playText("play.playerName", { n: index + 1 });
  }

  function focusPlayInput(input) {
    if (!input || typeof input.focus !== "function") return;
    requestAnimationFrame(() => {
      input.focus();
      if (document.activeElement !== input) {
        setTimeout(() => input.focus(), 0);
      }
    });
  }

  function renderScoreboard(activeIndex) {
    if (!scoreboardEl || !playState) return;
    scoreboardEl.innerHTML = "";
    playState.scores.forEach((score, index) => {
      const chip = document.createElement("div");
      chip.className = "play-score-chip" + (index === activeIndex ? " active" : "");
      chip.textContent = getPlayerName(index) + ": " + score;
      scoreboardEl.appendChild(chip);
    });
  }

  function renderPlaySymbolGrid(container, onPick, options) {
    if (!container || typeof symbols === "undefined") return;
    const opts = options || {};
    let filterQuery = (opts.filter || "").trim().toLowerCase();
    let keyModeOpenCategory = typeof opts.keyOpenCategory === "number" ? opts.keyOpenCategory : 0;
    let viewMode = opts.viewMode === "key" || opts.viewMode === "manual"
      ? opts.viewMode
      : getStoredSymbolViewMode();

    container.innerHTML = "";
    const controls = document.createElement("div");
    controls.className = "symbol-search-controls play-symbol-controls";
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = playText("play.searchSymbols") || "Search symbols…";
    searchInput.value = filterQuery;
    const modeToggle = document.createElement("button");
    modeToggle.type = "button";
    modeToggle.className = "play-symbol-mode-toggle";
    applySymbolViewModeToToggle(modeToggle);
    viewMode = modeToggle.dataset.mode === "key" ? "key" : "manual";
    controls.appendChild(searchInput);
    controls.appendChild(modeToggle);
    container.appendChild(controls);

    const grid = document.createElement("div");
    grid.className = "symbol-grid";
    container.appendChild(grid);

    function appendSymbol(sym, boxOptions) {
      const boxOpts = boxOptions || {};
      const box = document.createElement("div");
      box.className = "symbol-box";
      if (boxOpts.isKeyCategory) box.classList.add("symbol-key-category");
      if (boxOpts.isKeyOpen) box.classList.add("symbol-key-open");
      if (opts.selectedIds && opts.selectedIds.some((id) => String(id) === String(sym.id))) {
        box.classList.add("web-symbol-selected");
      }
      const name = getSymbolName(sym);
      box.title = name;
      box.appendChild(createSymbolVisual(sym, name));
      const span = document.createElement("span");
      span.textContent = name;
      box.appendChild(span);
      if (boxOpts.isKeyCategory) {
        box.addEventListener("click", () => {
          keyModeOpenCategory = boxOpts.categoryIndex;
          paintGrid();
        });
      } else {
        box.addEventListener("click", () => onPick(sym));
      }
      grid.appendChild(box);
    }

    function appendBlank() {
      const blank = document.createElement("div");
      blank.className = "symbol-box symbol-box-empty";
      blank.setAttribute("aria-hidden", "true");
      grid.appendChild(blank);
    }

    function paintGrid() {
      grid.innerHTML = "";
      grid.classList.toggle("symbol-grid-key", viewMode === "key" && !filterQuery);
      if (filterQuery) {
        symbols.forEach((sym) => {
          const name = getSymbolName(sym).toLowerCase();
          const desc = (getSymbolDescription(sym) || "").toLowerCase();
          if (!name.includes(filterQuery) && !desc.includes(filterQuery)) return;
          appendSymbol(sym);
        });
        return;
      }
      if (viewMode === "key") {
        const board = buildKeyModeBoard(keyModeOpenCategory);
        keyModeOpenCategory = board.openIndex;
        board.topIds.forEach((cellId, cellIndex) => {
          if (!cellId) { appendBlank(); return; }
          const sym = symbols.find((s) => s.id === cellId);
          if (!sym) { appendBlank(); return; }
          appendSymbol(sym, { isKeyOpen: cellIndex === 0 });
        });
        board.bottomHeads.forEach((head) => {
          const sym = symbols.find((s) => s.id === head.id);
          if (!sym) { appendBlank(); return; }
          appendSymbol(sym, { isKeyCategory: true, categoryIndex: head.categoryIndex });
        });
        return;
      }
      if (typeof symbolGridLayout !== "undefined" && Array.isArray(symbolGridLayout)) {
        symbolGridLayout.flat().forEach((cellId) => {
          if (!cellId) { appendBlank(); return; }
          const sym = symbols.find((s) => s.id === cellId);
          if (!sym) { appendBlank(); return; }
          appendSymbol(sym);
        });
        return;
      }
      symbols.forEach((sym) => appendSymbol(sym));
    }

    modeToggle.addEventListener("click", () => {
      viewMode = viewMode === "key" ? "manual" : "key";
      setStoredSymbolViewMode(viewMode);
      applySymbolViewModeToToggle(modeToggle);
      searchInput.value = "";
      filterQuery = "";
      paintGrid();
    });
    searchInput.addEventListener("input", () => {
      filterQuery = searchInput.value.trim().toLowerCase();
      paintGrid();
    });
    paintGrid();
  }

  function renderRevealedSymbols(container, refs) {
    container.innerHTML = "";
    (refs || []).forEach((ref) => {
      if (!ref) return;
      const cell = document.createElement("div");
      cell.className = "compact-stamp-symbol";
      const sym = symbols.find((s) => String(s.id) === String(ref.id));
      const name = sym ? getSymbolName(sym) : (ref.name || "");
      cell.title = name;
      cell.appendChild(createSymbolVisual(ref, name));
      container.appendChild(cell);
    });
  }

  function renderAttachedSymbols(container, refs, onRemove) {
    container.innerHTML = "";
    (refs || []).forEach((ref) => {
      if (!ref) return;
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "compact-stamp-symbol play-attached-symbol";
      const sym = symbols.find((s) => String(s.id) === String(ref.id));
      const name = sym ? getSymbolName(sym) : (ref.name || "");
      cell.title = name;
      cell.setAttribute("aria-label", "Remove " + name);
      cell.appendChild(createSymbolVisual(ref, name));
      cell.addEventListener("click", () => {
        if (onRemove) onRemove(ref);
      });
      container.appendChild(cell);
    });
  }

  function showSetupError(message) {
    if (!setupError) return;
    setupError.textContent = message || "";
    setupError.classList.toggle("hidden", !message);
  }

  function getSelectedLangs() {
    const checked = Array.from(langOptionsEl.querySelectorAll("input[type=checkbox]:checked")).map((el) => el.value);
    return checked.length ? checked : ["en"];
  }

  function saveSelectedLangs(langs) {
    localStorage.setItem(PLAY_LANGS_KEY, JSON.stringify(langs));
  }

  function buildLanguageOptions() {
    langOptionsEl.innerHTML = "";
    let saved = [];
    try { saved = JSON.parse(localStorage.getItem(PLAY_LANGS_KEY) || "[]"); } catch { saved = []; }
    if (!saved.length) saved = [getStoredLang()];
    Object.keys(LANGUAGES).forEach((code) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = code;
      input.checked = saved.includes(code);
      label.appendChild(input);
      label.appendChild(document.createTextNode(LANGUAGES[code]));
      langOptionsEl.appendChild(label);
    });
  }

  function clampPlayerCount() {
    const count = Math.max(1, Math.min(8, parseInt(playerCountInput.value, 10) || 1));
    playerCountInput.value = String(count);
    return count;
  }

  function syncPlayContextToggle() {
    if (!contextToggle) return;
    if (contextToggleLabel) {
      contextToggleLabel.textContent = playText("play.contextOption");
    }
    const hint = playText("play.contextOptionHint");
    const label = contextToggle.closest(".play-context-toggle");
    if (label) label.title = hint;
    if (playState) contextToggle.checked = Boolean(playState.contextEnabled);
    else contextToggle.checked = false;
  }

  function startGame() {
    const game = PLAY_GAMES[selectedGame];
    const langs = getSelectedLangs();
    const playerCount = clampPlayerCount();
    if (playerCount < game.minPlayers) {
      showSetupError(playText("play.minPlayers", { n: game.minPlayers }));
      return;
    }
    showSetupError("");
    saveSelectedLangs(langs);
    const initialLang = langs.includes(getStoredLang()) ? getStoredLang() : langs[0];
    playState = {
      game: selectedGame,
      langs,
      wordLang: initialLang,
      coreLang: initialLang,
      playerCount,
      scores: new Array(playerCount).fill(0),
      activePlayer: 0,
      round: 1,
      contextEnabled: false,
      coreWrongCount: 0,
      coreAnswerRevealed: false,
      coreDrawOpen: false,
      coreGuessedSymbolIds: selectedGame === "core-practice" ? new Set() : null,
    };
    syncPlayContextToggle();
    setupSection.classList.add("hidden");
    gameSection.classList.remove("hidden");
    activeGameTitle.textContent = playText(game.titleKey);
    renderScoreboard(0);
    startRound();
  }

  function backToMenu() {
    closePlayContextPicker();
    playState = null;
    gamePanel.innerHTML = "";
    scoreboardEl.innerHTML = "";
    gameSection.classList.add("hidden");
    setupSection.classList.remove("hidden");
    syncPlayContextToggle();
  }

  function addPoints(playerIndex, points) {
    playState.scores[playerIndex] += points;
    renderScoreboard(playerIndex);
  }

  function buildLangSelect(value, onChange) {
    const select = document.createElement("select");
    select.className = "play-lang-select";
    playState.langs.forEach((code) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = LANGUAGES[code];
      select.appendChild(opt);
    });
    select.value = playState.langs.includes(value) ? value : playState.langs[0];
    select.addEventListener("change", () => onChange(select.value));
    return select;
  }

  function startRound() {
    if (!playState) return;
    if (playState.game === "core-practice") startCorePracticeRound();
    else if (playState.game === "ladder-guesser") startLadderRound();
    else if (playState.game === "guess-stamp") startGuessStampRound();
    else if (playState.game === "manual-input") startManualInputRound();
  }

  function getPlaySymbolText(sym, lang, field) {
    if (!sym || sym.id == null) return sym ? (sym[field] || "") : "";
    const t = window.TRANSLATIONS && (window.TRANSLATIONS[lang] || window.TRANSLATIONS.en);
    const s = t && t.symbols && t.symbols[sym.id];
    return (s && s[field]) ? s[field] : (sym[field] || "");
  }

  function getCorePracticeAnswerSet(symbolRef, lang) {
    const sym = (typeof symbols !== "undefined"
      ? symbols.find((s) => String(s.id) === String(symbolRef.id))
      : null) || symbolRef;
    const answers = new Set();
    const name = getPlaySymbolText(sym, lang, "name");
    const desc = getPlaySymbolText(sym, lang, "description");
    if (name) answers.add(normalizePlayWord(name, lang));
    desc.split(/[,，、]/).forEach((part) => {
      const word = part.trim();
      if (word) answers.add(normalizePlayWord(word, lang));
    });
    return answers;
  }

  function isCorePracticeCorrect(guessText, symbolRef, lang) {
    const normalized = normalizePlayWord(guessText, lang);
    if (!normalized || !symbolRef) return false;
    return getCorePracticeAnswerSet(symbolRef, lang).has(normalized);
  }

  function bindPlayWordSearch(searchInput, resultsEl, onPick, options) {
    const opts = options || {};
    let timer = null;

    function renderResults() {
      const query = searchInput.value.trim();
      resultsEl.innerHTML = "";
      if (!query) {
        const hint = document.createElement("p");
        hint.className = "play-hint";
        hint.textContent = playText("play.searchToBegin");
        resultsEl.appendChild(hint);
        return;
      }
      const items = searchPlayWords(query, playState.wordLang, playState.langs, 100, opts);
      if (!items.length) {
        const empty = document.createElement("p");
        empty.className = "play-hint";
        empty.textContent = playText("play.noSearchResults");
        resultsEl.appendChild(empty);
        return;
      }
      items.forEach((match) => {
        resultsEl.appendChild(createPlayWordSearchResultButton(match, playState.wordLang, onPick));
      });
    }

    searchInput.addEventListener("input", () => {
      clearTimeout(timer);
      timer = setTimeout(renderResults, 120);
    });
    renderResults();
    focusPlayInput(searchInput);
  }

  /* ----- Core Practice ----- */
  function getCorePracticeSymbolIds() {
    const ids = new Set();
    ensureCoreWordsInDictionary().filter((e) => e.isCore).forEach((entry) => {
      const symbolId = getCoreEntrySymbolId(entry);
      if (symbolId) ids.add(symbolId);
    });
    return ids;
  }

  function getCorePracticeProgress() {
    const total = getCorePracticeSymbolIds().size;
    const done = playState.coreGuessedSymbolIds ? playState.coreGuessedSymbolIds.size : 0;
    return { done, total };
  }

  function getCorePracticeRevealWords(symbolRef, lang) {
    const sym = (typeof symbols !== "undefined"
      ? symbols.find((s) => String(s.id) === String(symbolRef.id))
      : null) || symbolRef;
    const words = [];
    const name = getPlaySymbolText(sym, lang, "name");
    if (name && name.trim()) words.push(name.trim());
    const desc = getPlaySymbolText(sym, lang, "description") || "";
    desc.split(/[,，、]/).forEach((part) => {
      const word = part.trim();
      if (word && !words.includes(word)) words.push(word);
    });
    return words.slice(0, 3);
  }

  function resetCorePracticeProgress(message) {
    if (!playState.coreGuessedSymbolIds) playState.coreGuessedSymbolIds = new Set();
    playState.coreGuessedSymbolIds.clear();
    renderCorePracticePanel(message || playText("play.coreResetDone"), false);
  }

  function startCorePracticeRound() {
    const entry = getNextCorePracticeEntry();
    if (!entry) {
      gamePanel.innerHTML = "<p class=\"play-status\">" + playText("play.noCoreWords") + "</p>";
      return;
    }
    const main = entry.slots && entry.slots[0] && entry.slots[0].main;
    playState.coreEntry = entry;
    playState.coreSymbolRef = main ? playSymbolRef(symbols.find((s) => s.id === main.id) || main) : null;
    if (!playState.coreLang || !playState.langs.includes(playState.coreLang)) {
      playState.coreLang = playState.wordLang || playState.langs[0] || "en";
    }
    playState.coreWrongCount = 0;
    playState.coreAnswerRevealed = false;
    playState.coreDrawOpen = false;
    playState.waitingGuess = true;
    renderCorePracticePanel();
  }

  function renderCorePracticePanel(message, isError) {
    gamePanel.innerHTML = "";

    const layout = document.createElement("div");
    layout.className = "play-core-layout" + (playState.coreDrawOpen ? " has-draw-panel" : "");
    const mainCol = document.createElement("div");
    mainCol.className = "play-core-main";
    const block = document.createElement("div");
    block.className = "play-panel-block";
    const status = document.createElement("p");
    status.className = "play-status";
    status.textContent = playText("play.coreTurn", { name: getPlayerName(playState.activePlayer) });

    const progress = getCorePracticeProgress();
    const progressLine = document.createElement("p");
    progressLine.className = "play-hint play-core-progress";
    progressLine.textContent = playText("play.coreProgress", { done: progress.done, total: progress.total });

    const langRow = document.createElement("div");
    langRow.className = "play-search-row";
    langRow.appendChild(buildLangSelect(playState.coreLang, (code) => {
      playState.coreLang = code;
      playState.wordLang = code;
      renderCorePracticePanel();
    }));

    const symbolWrap = document.createElement("div");
    symbolWrap.className = "play-core-symbol-display";
    if (playState.coreSymbolRef) {
      symbolWrap.appendChild(createSymbolVisual(playState.coreSymbolRef, ""));
    }

    const hint = document.createElement("p");
    hint.className = "play-hint";
    hint.textContent = playText("play.coreHint");

    const guessRow = document.createElement("div");
    guessRow.className = "play-guess-row";
    const guessInput = document.createElement("input");
    guessInput.type = "text";
    guessInput.placeholder = playText("play.yourGuess");
    const submitBtn = document.createElement("button");
    submitBtn.type = "button";
    submitBtn.className = "btn-primary";
    submitBtn.textContent = playText("play.submitGuess");
    guessRow.appendChild(guessInput);
    guessRow.appendChild(submitBtn);

    block.appendChild(status);
    block.appendChild(progressLine);
    block.appendChild(langRow);
    block.appendChild(symbolWrap);
    block.appendChild(hint);
    block.appendChild(guessRow);

    if (!playState.coreAnswerRevealed) {
      const revealBtn = document.createElement("button");
      revealBtn.type = "button";
      revealBtn.className = "play-reveal-answer-btn";
      revealBtn.textContent = playText("play.coreRevealAnswer");
      revealBtn.addEventListener("click", () => {
        playState.coreAnswerRevealed = true;
        renderCorePracticePanel();
      });
      block.appendChild(revealBtn);
    }

    if (playState.coreAnswerRevealed && playState.coreSymbolRef) {
      const answers = getCorePracticeRevealWords(playState.coreSymbolRef, getStoredLang());
      const revealLine = document.createElement("p");
      revealLine.className = "play-message is-error";
      revealLine.textContent = playText("play.coreRevealedAnswers", { words: answers.join(", ") });
      block.appendChild(revealLine);

      if (!playState.coreDrawOpen) {
        const drawBtn = document.createElement("button");
        drawBtn.type = "button";
        drawBtn.textContent = playText("play.coreDrawNewImage");
        drawBtn.addEventListener("click", () => {
          playState.coreDrawOpen = true;
          renderCorePracticePanel();
        });
        block.appendChild(drawBtn);
      }
    }

    if (message) {
      const msg = document.createElement("p");
      msg.className = "play-message" + (isError ? " is-error" : " is-success");
      msg.textContent = message;
      block.appendChild(msg);
    }

    function submitGuess() {
      if (!playState.waitingGuess) return;
      const guessText = guessInput.value.trim();
      if (!guessText) return;

      if (isCorePracticeCorrect(guessText, playState.coreSymbolRef, playState.coreLang)) {
        markCorePracticeSymbolGuessed(playState.coreSymbolRef);
        addPoints(playState.activePlayer, 100);
        playState.activePlayer = (playState.activePlayer + 1) % playState.playerCount;
        playState.round++;
        playState.waitingGuess = false;
        renderCorePracticePanel(
          playText("play.correct") + " " + playText("play.theWordWas", { word: guessText }) + " " + playText("play.pointsEarned", { n: 100 }),
          false
        );
        setTimeout(startCorePracticeRound, 1200);
        return;
      }

      playState.coreWrongCount = (playState.coreWrongCount || 0) + 1;

      resolvePlayWordAssignments(guessText, playState.coreLang, playState.langs, (guessMatches) => {
        if (!guessMatches.length) {
          renderCorePracticePanel(playText("play.invalidWord"), true);
          return;
        }

        if (guessMatches.some((match) => match.isCore || (match.entry && match.entry.isCore))) {
          renderCorePracticePanel(playText("play.incorrect"), true);
          return;
        }

        // Core Practice does not stamp dictionary data — beginners' wrong guesses stay ephemeral.
        renderCorePracticePanel(playText("play.incorrect"), true);
      });
    }

    submitBtn.addEventListener("click", submitGuess);
    guessInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") submitGuess();
    });

    const actions = document.createElement("div");
    actions.className = "play-actions";
    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.textContent = playText("play.coreReset");
    resetBtn.addEventListener("click", () => resetCorePracticeProgress());
    const skipBtn = document.createElement("button");
    skipBtn.type = "button";
    skipBtn.textContent = playText("play.nextRound");
    skipBtn.addEventListener("click", startCorePracticeRound);
    actions.appendChild(resetBtn);
    actions.appendChild(skipBtn);
    block.appendChild(actions);
    mainCol.appendChild(block);
    layout.appendChild(mainCol);

    if (playState.coreDrawOpen && playState.coreSymbolRef) {
      const drawCol = document.createElement("div");
      drawCol.className = "play-core-draw";
      const drawTitle = document.createElement("h3");
      drawTitle.textContent = playText("play.coreDrawTitle");
      const drawHint = document.createElement("p");
      drawHint.className = "play-hint";
      drawHint.textContent = playText("play.coreDrawHint");
      const canvasWrap = document.createElement("div");
      canvasWrap.className = "play-core-draw-canvas-wrap";
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      canvas.className = "play-core-draw-canvas";
      canvasWrap.appendChild(canvas);
      const drawTools = document.createElement("div");
      drawTools.className = "play-core-draw-tools";
      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.textContent = playText("draw.clear");
      const addDrawBtn = document.createElement("button");
      addDrawBtn.type = "button";
      addDrawBtn.className = "btn-primary";
      addDrawBtn.textContent = playText("draw.addToSymbol");
      drawTools.appendChild(clearBtn);
      drawTools.appendChild(addDrawBtn);
      drawCol.appendChild(drawTitle);
      drawCol.appendChild(drawHint);
      drawCol.appendChild(canvasWrap);
      drawCol.appendChild(drawTools);
      layout.appendChild(drawCol);

      const drawController = bindSymbolDrawCanvas(canvas);
      clearBtn.addEventListener("click", () => drawController.clearCanvas());
      addDrawBtn.addEventListener("click", () => {
        if (!drawController.hasInk()) {
          renderCorePracticePanel(playText("draw.canvasEmpty"), true);
          return;
        }
        const sym = symbols.find((s) => String(s.id) === String(playState.coreSymbolRef.id));
        if (!sym) return;
        addCustomImageToSymbol(sym, drawController.exportDataUrl());
        drawController.clearCanvas();
        renderCorePracticePanel(playText("play.coreDrawAdded"), false);
      });
    }

    gamePanel.appendChild(layout);
    if (playState.waitingGuess) focusPlayInput(guessInput);
  }
  function startLadderRound() {
    playState.phase = "select-word";
    playState.knowerIndex = 0;
    playState.activePlayer = 0;
    playState.secretWord = null;
    playState.isChallenge = false;
    playState.revealedSymbols = [];
    playState.guesserIndex = 1;
    playState.randomWordPreview = null;
    playState.wordLang = playState.wordLang || playState.langs[0];
    renderLadderPanel();
  }

  function renderLadderPanel(message, isError) {
    gamePanel.innerHTML = "";
    const block = document.createElement("div");
    block.className = "play-panel-block";
    gamePanel.appendChild(block);

    if (playState.phase === "select-word") {
      const status = document.createElement("p");
      status.className = "play-status";
      status.textContent = playText("play.knowerSelectWord", { name: getPlayerName(playState.knowerIndex) });
      block.appendChild(status);

      const langRow = document.createElement("div");
      langRow.className = "play-search-row";
      langRow.appendChild(buildLangSelect(playState.wordLang, (code) => {
        clearRandomChallengePreview();
        playState.wordLang = code;
        renderLadderPanel();
      }));
      block.appendChild(langRow);

      const searchRow = document.createElement("div");
      searchRow.className = "play-search-row";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = playText("play.searchWord");
      const results = document.createElement("div");
      results.className = "play-search-results";
      searchRow.appendChild(searchInput);
      block.appendChild(searchRow);
      block.appendChild(results);

      const challengeBtn = document.createElement("button");
      challengeBtn.type = "button";
      challengeBtn.textContent = playText("play.randomWord");
      challengeBtn.addEventListener("click", () => {
        if (!rollRandomChallengePreview()) {
          renderLadderPanel(playText("play.noChallengeWords"), true);
          return;
        }
        renderLadderPanel();
      });
      block.appendChild(challengeBtn);

      if (playState.randomWordPreview) {
        appendPlayRandomWordPreview(block, playState.randomWordPreview, playState.wordLang, {
          onReroll: () => {
            if (!rollRandomChallengePreview()) {
              renderLadderPanel(playText("play.noChallengeWords"), true);
              return;
            }
            renderLadderPanel();
          },
          onConfirm: () => {
            playState.secretWord = playState.randomWordPreview;
            playState.isChallenge = true;
            playState.randomWordPreview = null;
            playState.phase = "pick-symbol";
            playState.revealedSymbols = [];
            playState.guesserIndex = 1;
            playState.activePlayer = playState.knowerIndex;
            renderLadderPanel();
          },
        });
      }

      function pickSecretWord(match) {
        clearRandomChallengePreview();
        playState.secretWord = match;
        playState.isChallenge = !playWordHasSymbols(match);
        playState.phase = "pick-symbol";
        playState.revealedSymbols = [];
        playState.guesserIndex = 1;
        playState.activePlayer = playState.knowerIndex;
        renderLadderPanel();
      }

      bindPlayWordSearch(searchInput, results, pickSecretWord, { excludeCore: true });
    } else if (playState.phase === "pick-symbol") {
      const status = document.createElement("p");
      status.className = "play-status";
      status.textContent = playText("play.knowerTurn", { name: getPlayerName(playState.knowerIndex) });
      block.appendChild(status);

      const revealed = document.createElement("div");
      revealed.className = "play-revealed-symbols";
      renderRevealedSymbols(revealed, playState.revealedSymbols);
      block.appendChild(revealed);

      const hint = document.createElement("p");
      hint.className = "play-hint";
      hint.textContent = playText("play.pickSymbol");
      block.appendChild(hint);

      const gridWrap = document.createElement("div");
      gridWrap.className = "play-symbol-grid-wrap";
      block.appendChild(gridWrap);
      renderPlaySymbolGrid(gridWrap, (sym) => {
        const ref = playSymbolRef(sym);
        if (playState.revealedSymbols.some((r) => String(r.id) === String(ref.id))) return;
        playState.revealedSymbols.push(ref);
        addPlaySymbolsToWordIs(playState.secretWord, [ref], { allowStarredPrimary: true });
        playState.awaitingMarkCorrect = false;
        playState.lastGuessPlayer = null;
        playState.phase = "guess";
        playState.guesserIndex = 1;
        playState.activePlayer = playState.guesserIndex;
        renderLadderPanel();
      }, { selectedIds: playState.revealedSymbols.map((r) => r.id) });

      if (message && isError && playState.awaitingMarkCorrect) {
        const markCorrectBtn = document.createElement("button");
        markCorrectBtn.type = "button";
        markCorrectBtn.className = "btn-primary play-mark-correct-btn";
        markCorrectBtn.textContent = playText("play.markCorrect");
        markCorrectBtn.addEventListener("click", () => {
          const base = 100;
          const detailBonus = Math.max(0, 8 - playState.revealedSymbols.length) * 25;
          const challengeBonus = playState.isChallenge ? 50 : 0;
          const total = base + detailBonus + challengeBonus;
          const scorer = (typeof playState.lastGuessPlayer === "number")
            ? playState.lastGuessPlayer
            : playState.activePlayer;
          addPoints(scorer, total);
          playState.phase = "round-end";
          playState.awaitingMarkCorrect = false;
          playState.lastGuessPlayer = null;
          renderLadderPanel(
            playText("play.correct") + " " + playText("play.theWordWas", { word: playState.secretWord.word }) +
            " " + playText("play.pointsEarned", { n: total }),
            false
          );
          setTimeout(() => {
            playState.round++;
            startLadderRound();
          }, 1800);
        });
        block.appendChild(markCorrectBtn);
      }
    } else if (playState.phase === "guess") {
      const status = document.createElement("p");
      status.className = "play-status";
      status.textContent = playText("play.guesserTurn", { name: getPlayerName(playState.activePlayer) });
      block.appendChild(status);

      const revealed = document.createElement("div");
      revealed.className = "play-revealed-symbols";
      renderRevealedSymbols(revealed, playState.revealedSymbols);
      block.appendChild(revealed);

      const countLine = document.createElement("p");
      countLine.className = "play-hint";
      countLine.textContent = playText("play.symbolsRevealed", { count: playState.revealedSymbols.length });
      block.appendChild(countLine);

      const langRow = document.createElement("div");
      langRow.className = "play-search-row";
      langRow.appendChild(buildLangSelect(playState.wordLang, (code) => { playState.wordLang = code; }));
      block.appendChild(langRow);

      const guessRow = document.createElement("div");
      guessRow.className = "play-guess-row";
      const guessInput = document.createElement("input");
      guessInput.type = "text";
      guessInput.placeholder = playText("play.yourGuess");
      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "btn-primary";
      submitBtn.textContent = playText("play.submitGuess");
      guessRow.appendChild(guessInput);
      guessRow.appendChild(submitBtn);
      block.appendChild(guessRow);

      function awardLadderCorrect() {
        const base = 100;
        const detailBonus = Math.max(0, 8 - playState.revealedSymbols.length) * 25;
        const challengeBonus = playState.isChallenge ? 50 : 0;
        const total = base + detailBonus + challengeBonus;
        const scorer = (playState.awaitingMarkCorrect && typeof playState.lastGuessPlayer === "number")
          ? playState.lastGuessPlayer
          : playState.activePlayer;
        addPoints(scorer, total);
        playState.phase = "round-end";
        playState.awaitingMarkCorrect = false;
        playState.lastGuessPlayer = null;
        renderLadderPanel(
          playText("play.correct") + " " + playText("play.theWordWas", { word: playState.secretWord.word }) +
          " " + playText("play.pointsEarned", { n: total }),
          false
        );
        setTimeout(() => {
          playState.round++;
          startLadderRound();
        }, 1800);
      }

      function submitLadderGuess() {
        const guessText = guessInput.value.trim();
        if (!guessText) return;
        resolvePlayWordAssignments(guessText, playState.wordLang, playState.langs, (guessMatches) => {
          if (!guessMatches.length) {
            // Still allow English-hub / secret-text matches when dictionary lookup fails.
            if (playGuessMatchesSecret(guessText, [], playState.secretWord, playState.wordLang)) {
              awardLadderCorrect();
              return;
            }
            playState.lastGuessPlayer = playState.activePlayer;
            playState.awaitingMarkCorrect = true;
            renderLadderPanel(playText("play.invalidWord"), true);
            return;
          }
          if (playGuessMatchesSecret(guessText, guessMatches, playState.secretWord, playState.wordLang)) {
            awardLadderCorrect();
            return;
          }
          const wrongGuess = pickPrimaryPlayAssignment(guessMatches, getPlayMatchOrigin(playState.secretWord));
          if (wrongGuess) addPlaySymbolsToWordIs(wrongGuess, playState.revealedSymbols.slice());
          playState.lastGuessPlayer = playState.activePlayer;
          playState.awaitingMarkCorrect = true;
          if (playState.guesserIndex < playState.playerCount - 1) {
            playState.guesserIndex++;
            playState.activePlayer = playState.guesserIndex;
            renderLadderPanel(playText("play.incorrect"), true);
          } else {
            playState.phase = "pick-symbol";
            playState.activePlayer = playState.knowerIndex;
            renderLadderPanel(playText("play.incorrect") + " " + playText("play.knowerTurn", { name: getPlayerName(playState.knowerIndex) }), true);
          }
        });
      }

      submitBtn.addEventListener("click", submitLadderGuess);
      guessInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submitLadderGuess();
      });
      focusPlayInput(guessInput);

      if (message && isError) {
        const markCorrectBtn = document.createElement("button");
        markCorrectBtn.type = "button";
        markCorrectBtn.className = "btn-primary play-mark-correct-btn";
        markCorrectBtn.textContent = playText("play.markCorrect");
        markCorrectBtn.addEventListener("click", awardLadderCorrect);
        block.appendChild(markCorrectBtn);
      }
    } else if (playState.phase === "round-end") {
      block.innerHTML = "<p class=\"play-message is-success\">" + (message || playText("play.roundComplete")) + "</p>";
    }

    if (message && playState.phase !== "round-end") {
      const msg = document.createElement("p");
      msg.className = "play-message" + (isError ? " is-error" : " is-success");
      msg.textContent = message;
      block.appendChild(msg);
    }
  }

  /* ----- Guess That Stamp ----- */
  function startGuessStampRound() {
    playState.phase = "select-word";
    playState.secretWord = null;
    playState.isChallenge = false;
    playState.fixedSymbols = [];
    playState.symbolTarget = 2;
    playState.guesserIndex = 0;
    playState.activePlayer = 0;
    playState.randomWordPreview = null;
    playState.wordLang = playState.wordLang || playState.langs[0];
    renderGuessStampPanel();
  }

  function renderGuessStampPanel(message, isError) {
    gamePanel.innerHTML = "";
    const block = document.createElement("div");
    block.className = "play-panel-block";
    gamePanel.appendChild(block);

    if (playState.phase === "select-word") {
      const status = document.createElement("p");
      status.className = "play-status";
      status.textContent = playText("play.selectWordAndSymbols");
      block.appendChild(status);

      const langRow = document.createElement("div");
      langRow.className = "play-search-row";
      langRow.appendChild(buildLangSelect(playState.wordLang, (code) => {
        clearRandomChallengePreview();
        playState.wordLang = code;
        renderGuessStampPanel();
      }));
      block.appendChild(langRow);

      const countLabel = document.createElement("label");
      countLabel.className = "play-player-count-label";
      countLabel.innerHTML = "<span>" + playText("play.selectSymbolCount") + "</span>";
      const countInput = document.createElement("input");
      countInput.type = "number";
      countInput.min = "1";
      countInput.max = "8";
      countInput.value = String(playState.symbolTarget);
      countLabel.appendChild(countInput);
      block.appendChild(countLabel);

      const searchRow = document.createElement("div");
      searchRow.className = "play-search-row";
      const searchInput = document.createElement("input");
      searchInput.type = "text";
      searchInput.placeholder = playText("play.searchWord");
      const results = document.createElement("div");
      results.className = "play-search-results";
      searchRow.appendChild(searchInput);
      block.appendChild(searchRow);
      block.appendChild(results);

      const challengeBtn = document.createElement("button");
      challengeBtn.type = "button";
      challengeBtn.textContent = playText("play.randomWord");
      challengeBtn.addEventListener("click", () => {
        if (!rollRandomChallengePreview()) {
          renderGuessStampPanel(playText("play.noChallengeWords"), true);
          return;
        }
        renderGuessStampPanel();
      });
      block.appendChild(challengeBtn);

      if (playState.randomWordPreview) {
        appendPlayRandomWordPreview(block, playState.randomWordPreview, playState.wordLang, {
          onReroll: () => {
            if (!rollRandomChallengePreview()) {
              renderGuessStampPanel(playText("play.noChallengeWords"), true);
              return;
            }
            renderGuessStampPanel();
          },
          onConfirm: () => {
            playState.secretWord = playState.randomWordPreview;
            playState.isChallenge = true;
            playState.symbolTarget = Math.max(1, Math.min(8, parseInt(countInput.value, 10) || 2));
            playState.fixedSymbols = [];
            playState.randomWordPreview = null;
            playState.phase = "set-symbols";
            playState.activePlayer = 0;
            renderGuessStampPanel();
          },
        });
      }

      function pickWord(match) {
        clearRandomChallengePreview();
        playState.secretWord = match;
        playState.isChallenge = !playWordHasSymbols(match);
        playState.symbolTarget = Math.max(1, Math.min(8, parseInt(countInput.value, 10) || 2));
        playState.fixedSymbols = [];
        playState.phase = "set-symbols";
        playState.activePlayer = 0;
        renderGuessStampPanel();
      }

      bindPlayWordSearch(searchInput, results, pickWord, { excludeCore: true });
    } else if (playState.phase === "set-symbols") {
      const status = document.createElement("p");
      status.className = "play-status";
      status.textContent = playText("play.setSymbols") + " (" + playState.fixedSymbols.length + "/" + playState.symbolTarget + ")";
      block.appendChild(status);

      const revealed = document.createElement("div");
      revealed.className = "play-revealed-symbols";
      renderRevealedSymbols(revealed, playState.fixedSymbols);
      block.appendChild(revealed);

      const gridWrap = document.createElement("div");
      gridWrap.className = "play-symbol-grid-wrap";
      block.appendChild(gridWrap);
      renderPlaySymbolGrid(gridWrap, (sym) => {
        const ref = playSymbolRef(sym);
        if (playState.fixedSymbols.some((r) => String(r.id) === String(ref.id))) return;
        if (playState.fixedSymbols.length >= playState.symbolTarget) return;
        playState.fixedSymbols.push(ref);
        if (playState.fixedSymbols.length >= playState.symbolTarget) {
          addPlaySymbolsToWordIs(playState.secretWord, playState.fixedSymbols.slice(), { allowStarredPrimary: true });
          playState.phase = "guess";
          playState.guesserIndex = 0;
          playState.activePlayer = 0;
        }
        renderGuessStampPanel();
      }, { selectedIds: playState.fixedSymbols.map((r) => r.id) });
    } else if (playState.phase === "guess") {
      const status = document.createElement("p");
      status.className = "play-status";
      status.textContent = playText("play.guesserTurn", { name: getPlayerName(playState.activePlayer) });
      block.appendChild(status);

      const revealed = document.createElement("div");
      revealed.className = "play-revealed-symbols";
      renderRevealedSymbols(revealed, playState.fixedSymbols);
      block.appendChild(revealed);

      const langRow = document.createElement("div");
      langRow.className = "play-search-row";
      langRow.appendChild(buildLangSelect(playState.wordLang, (code) => { playState.wordLang = code; }));
      block.appendChild(langRow);

      const guessRow = document.createElement("div");
      guessRow.className = "play-guess-row";
      const guessInput = document.createElement("input");
      guessInput.type = "text";
      guessInput.placeholder = playText("play.yourGuess");
      const submitBtn = document.createElement("button");
      submitBtn.type = "button";
      submitBtn.className = "btn-primary";
      submitBtn.textContent = playText("play.submitGuess");
      guessRow.appendChild(guessInput);
      guessRow.appendChild(submitBtn);
      block.appendChild(guessRow);

      function awardStampCorrect() {
        const total = 120 + (playState.isChallenge ? 40 : 0);
        const scorer = (playState.awaitingMarkCorrect && typeof playState.lastGuessPlayer === "number")
          ? playState.lastGuessPlayer
          : playState.activePlayer;
        addPoints(scorer, total);
        playState.awaitingMarkCorrect = false;
        playState.lastGuessPlayer = null;
        renderGuessStampPanel(
          playText("play.correct") + " " + playText("play.theWordWas", { word: playState.secretWord.word }) +
          " " + playText("play.pointsEarned", { n: total }),
          false
        );
        setTimeout(() => {
          playState.round++;
          startGuessStampRound();
        }, 1800);
      }

      function submitStampGuess() {
        const guessText = guessInput.value.trim();
        if (!guessText) return;
        resolvePlayWordAssignments(guessText, playState.wordLang, playState.langs, (guessMatches) => {
          if (!guessMatches.length) {
            if (playGuessMatchesSecret(guessText, [], playState.secretWord, playState.wordLang)) {
              awardStampCorrect();
              return;
            }
            playState.lastGuessPlayer = playState.activePlayer;
            playState.awaitingMarkCorrect = true;
            renderGuessStampPanel(playText("play.invalidWord"), true);
            return;
          }
          if (playGuessMatchesSecret(guessText, guessMatches, playState.secretWord, playState.wordLang)) {
            awardStampCorrect();
            return;
          }
          const wrongGuess = pickPrimaryPlayAssignment(guessMatches, getPlayMatchOrigin(playState.secretWord));
          if (wrongGuess) addPlaySymbolsToWordIs(wrongGuess, playState.fixedSymbols.slice());
          playState.lastGuessPlayer = playState.activePlayer;
          playState.activePlayer = (playState.activePlayer + 1) % playState.playerCount;
          playState.awaitingMarkCorrect = true;
          renderGuessStampPanel(playText("play.incorrect"), true);
        });
      }

      submitBtn.addEventListener("click", submitStampGuess);
      guessInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter") submitStampGuess();
      });
      focusPlayInput(guessInput);

      if (message && isError) {
        const markCorrectBtn = document.createElement("button");
        markCorrectBtn.type = "button";
        markCorrectBtn.className = "btn-primary play-mark-correct-btn";
        markCorrectBtn.textContent = playText("play.markCorrect");
        markCorrectBtn.addEventListener("click", awardStampCorrect);
        block.appendChild(markCorrectBtn);
      }
    }

    if (message) {
      const msg = document.createElement("p");
      msg.className = "play-message" + (isError ? " is-error" : " is-success");
      msg.textContent = message;
      block.appendChild(msg);
    }
  }

  /* ----- Manual Input ----- */
  function getRandomManualInputWord(allowedLangs) {
    const pool = [];
    (window.WORLD_DICTIONARY_ROWS || []).forEach((line) => {
      const originLang = WORLD_ORIGIN_TO_LANG[getPlayWorldField(line, 7)];
      if (!originLang) return;
      if (!isPlayOriginLangAllowed(originLang, allowedLangs)) return;
      const displayLang = allowedLangs.includes(originLang) ? originLang : "en";
      const word = displayLang === "en"
        ? getPlayWorldField(line, 0)
        : (getPlayWorldField(line, 1) || getPlayWorldField(line, 0));
      pool.push({
        type: "world",
        worldLine: line,
        word,
        lang: displayLang,
        isCore: false,
      });
    });
    ensureCoreWordsInDictionary().forEach((entry) => {
      if (!entry || entry.isCore) return;
      const source = entry.originLanguage || entry.translationSource || "en";
      if (!isPlayOriginLangAllowed(source, allowedLangs)) return;
      const displayLang = allowedLangs.includes(source) ? source : "en";
      const word = displayLang === "en"
        ? ((entry.translations && entry.translations.en) || entry.definition || "")
        : ((entry.translations && entry.translations[source]) || entry.definition || "");
      pool.push({
        type: "local",
        entry,
        entryId: entry._entryId,
        word,
        lang: displayLang,
        isCore: false,
      });
    });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function getManualInputAttachedRefs(match) {
    if (!match) return [];
    if (match.type === "local" && match.entry) {
      return getSymbolsForEntry(match.entry).map((ref) => playSymbolRef(ref)).filter(Boolean);
    }
    if (match.type === "world") {
      // Prefer local dictionary copy if it already exists.
      const english = getPlayWorldField(match.worldLine, 0);
      const originLang = getPlayMatchOrigin(match);
      const entries = ensureCoreWordsInDictionary();
      const local = entries.find((e) => !e.isCore &&
        normalizeDictionaryWord(e.definition) === normalizeDictionaryWord(english) &&
        (e.originLanguage || e.translationSource || "en") === originLang);
      if (local) return getSymbolsForEntry(local).map((ref) => playSymbolRef(ref)).filter(Boolean);
    }
    return [];
  }

  function startManualInputRound() {
    playState.phase = "edit";
    playState.wordLang = playState.wordLang || playState.langs[0];
    playState.secretWord = getRandomManualInputWord(playState.langs);
    playState.attachedSymbols = getManualInputAttachedRefs(playState.secretWord);
    playState.activePlayer = 0;
    renderManualInputPanel();
  }

  function renderManualInputPanel(message, isError) {
    gamePanel.innerHTML = "";
    const block = document.createElement("div");
    block.className = "play-panel-block";
    gamePanel.appendChild(block);

    if (!playState.secretWord) {
      const status = document.createElement("p");
      status.className = "play-status";
      status.textContent = playText("play.manualInputNoWord");
      block.appendChild(status);
      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "btn-primary";
      nextBtn.textContent = playText("play.nextRound");
      nextBtn.addEventListener("click", startManualInputRound);
      block.appendChild(nextBtn);
      return;
    }

    const status = document.createElement("p");
    status.className = "play-status";
    status.textContent = playText("play.manualInputHint");
    block.appendChild(status);

    const langRow = document.createElement("div");
    langRow.className = "play-search-row";
    langRow.appendChild(buildLangSelect(playState.wordLang, (code) => {
      playState.wordLang = code;
      renderManualInputPanel();
    }));
    block.appendChild(langRow);

    const details = getPlayWordSearchDetails(playState.secretWord, playState.wordLang);
    const wordRow = document.createElement("div");
    wordRow.className = "play-word-display-row";
    const word = document.createElement("div");
    word.className = "play-word-display";
    word.textContent = details.primary;
    wordRow.appendChild(word);
    if (playMatchHasHomographStar(playState.secretWord)) {
      const star = document.createElement("span");
      star.className = "homograph-star play-word-star";
      star.title = getTranslation("dictionary.HomographStarTitle") || getTranslation("dictionary.HomographStar") || "Homograph";
      star.setAttribute("aria-label", star.title);
      star.textContent = "★";
      wordRow.appendChild(star);
    }
    block.appendChild(wordRow);

    const metaParts = [];
    if (playState.wordLang === "en" && details.translation) metaParts.push(details.translation);
    else if (playState.wordLang !== "en" && details.english) metaParts.push(details.english);
    if (details.origin) metaParts.push(details.origin);
    if (details.pronunciation) {
      metaParts.push((details.pronunciationLabel ? details.pronunciationLabel + ": " : "") + details.pronunciation);
    }
    if (metaParts.length) {
      const meta = document.createElement("p");
      meta.className = "play-search-result-meta";
      meta.textContent = metaParts.join(" · ");
      block.appendChild(meta);
    }

    const attachedLabel = document.createElement("p");
    attachedLabel.className = "play-hint";
    attachedLabel.textContent = playText("play.manualInputAttached") +
      " (" + playState.attachedSymbols.length + ")";
    block.appendChild(attachedLabel);

    const attached = document.createElement("div");
    attached.className = "play-revealed-symbols";
    renderAttachedSymbols(attached, playState.attachedSymbols, (ref) => {
      removePlaySymbolsFromWordIs(playState.secretWord, [ref]);
      playState.attachedSymbols = getManualInputAttachedRefs(playState.secretWord);
      renderManualInputPanel();
    });
    block.appendChild(attached);

    const gridWrap = document.createElement("div");
    gridWrap.className = "play-symbol-grid-wrap";
    block.appendChild(gridWrap);
    renderPlaySymbolGrid(gridWrap, (sym) => {
      const ref = playSymbolRef(sym);
      if (!ref || ref.id == null) return;
      if (playState.attachedSymbols.some((r) => String(r.id) === String(ref.id))) return;
      const updated = addPlaySymbolsToWordIs(playState.secretWord, [ref], { allowStarredPrimary: true });
      if (!updated && playState.secretWord.isCore) return;
      playState.attachedSymbols.push(ref);
      // Keep match pointing at local entry after first save.
      playState.attachedSymbols = getManualInputAttachedRefs(playState.secretWord);
      if (!playState.attachedSymbols.some((r) => String(r.id) === String(ref.id))) {
        playState.attachedSymbols.push(ref);
      }
      renderManualInputPanel();
    }, { selectedIds: playState.attachedSymbols.map((r) => r.id) });

    const actions = document.createElement("div");
    actions.className = "play-actions";
    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn-primary";
    nextBtn.textContent = playText("play.nextRound");
    nextBtn.addEventListener("click", () => {
      playState.round++;
      startManualInputRound();
    });
    actions.appendChild(nextBtn);
    block.appendChild(actions);

    if (message) {
      const msg = document.createElement("p");
      msg.className = "play-message" + (isError ? " is-error" : " is-success");
      msg.textContent = message;
      block.appendChild(msg);
    }
  }

  gameCards.forEach((card) => {
    card.addEventListener("click", () => {
      selectedGame = card.dataset.game || "core-practice";
      gameCards.forEach((c) => c.classList.toggle("selected", c === card));
    });
  });
  gameCards[0].classList.add("selected");

  playerCountInput.addEventListener("change", clampPlayerCount);
  startBtn.addEventListener("click", startGame);
  backBtn.addEventListener("click", backToMenu);
  if (contextToggle) {
    contextToggle.addEventListener("change", () => {
      if (playState) playState.contextEnabled = contextToggle.checked;
    });
  }

  window.onLanguageChange = () => {
    buildLanguageOptions();
    syncPlayContextToggle();
    if (playState) activeGameTitle.textContent = playText(PLAY_GAMES[playState.game].titleKey);
  };

  ensureCoreWordsInDictionary();
  buildLanguageOptions();
  syncPlayContextToggle();
}

/* --------------------------------
   COMMENTS PAGE
   Rendered by comments.html (localStorage + optional Firebase sync).
-------------------------------- */
if (page === "comments") {
  // Theme / language / shared chrome only.
}