/* ========================================
   Transfers — Txt Only export / import
   Depends on helpers from script.js
   ======================================== */

(function () {
  const TXT_FORMAT_VERSION = 1;
  const TXT_LANG_FILE_CODE = {
    en: "EN",
    zh: "ZH",
    es: "ES",
    fr: "FR",
    ru: "RU",
    de: "DE",
    ja: "JP",
    it: "IT",
    pt: "PT",
    ko: "KO",
  };

  function starMark(word, lang, homographs) {
    const text = word || "";
    if (!text) return "";
    let starred = false;
    if (homographs && Object.prototype.hasOwnProperty.call(homographs, lang)) {
      starred = !!homographs[lang];
    } else if (typeof isHomographWord === "function") {
      starred = isHomographWord(text, lang);
    }
    return starred ? text + "★" : text;
  }

  function stripStar(value) {
    return String(value || "").replace(/★/g, "").trim();
  }

  function serializeSymbolRefs(refs) {
    return (refs || [])
      .filter((ref) => ref && ref.id != null)
      .map((ref) => String(ref.id) + "|" + String(ref.name || "").replace(/[;|]/g, " "))
      .join("; ");
  }

  function parseSymbolRefs(text) {
    return String(text || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const pipe = part.indexOf("|");
        const idRaw = pipe >= 0 ? part.slice(0, pipe).trim() : part;
        const name = pipe >= 0 ? part.slice(pipe + 1).trim() : "";
        const idNum = parseInt(idRaw, 10);
        const id = Number.isFinite(idNum) ? idNum : idRaw;
        const sym = typeof symbols !== "undefined" && symbols.find((s) => String(s.id) === String(id));
        return {
          id,
          name: name || (sym && sym.name) || "",
          image: sym ? sym.image : undefined,
          rgb: sym ? sym.rgb : undefined,
        };
      });
  }

  function categoriesFromEntry(entry) {
    if (entry && entry.categories) {
      return {
        is: Array.isArray(entry.categories.is) ? entry.categories.is.slice() : [],
        unrelated: Array.isArray(entry.categories.unrelated) ? entry.categories.unrelated.slice() : [],
        isNot: Array.isArray(entry.categories.isNot) ? entry.categories.isNot.slice() : [],
      };
    }
    const is = typeof getSymbolsForEntry === "function" ? getSymbolsForEntry(entry) : [];
    return { is: is.slice(), unrelated: [], isNot: [] };
  }

  function findLocalOverrideForWorldLine(entries, line) {
    if (!line || !entries) return null;
    if (typeof findLocalOverrideIndexForWorldLine === "function") {
      const idx = findLocalOverrideIndexForWorldLine(entries, line);
      return idx >= 0 ? entries[idx] : null;
    }
    return entries.find((e) => e && e.sourceWorldLine === line) || null;
  }

  function pairIdsForSelectedLangs(selectedLangs) {
    const allPairs = typeof getAllDictionaryPairIds === "function" ? getAllDictionaryPairIds() : [];
    if (!selectedLangs || !selectedLangs.length || selectedLangs.indexOf("all") >= 0) {
      return allPairs.slice();
    }
    return allPairs.filter((pairId) => {
      const parsed = parsePairId(pairId);
      if (!parsed) return false;
      return selectedLangs.indexOf(parsed.a) >= 0 || selectedLangs.indexOf(parsed.b) >= 0;
    });
  }

  function focusLangForPair(pairId, selectedLangs) {
    const parsed = parsePairId(pairId);
    if (!parsed) return "";
    if (!selectedLangs || selectedLangs.indexOf("all") >= 0 || selectedLangs.length !== 1) {
      return "";
    }
    const only = selectedLangs[0];
    if (parsed.a === only || parsed.b === only) return only;
    return "";
  }

  function buildHubRecords(pairId, entries, hiddenLines, focusLang) {
    const parsed = parsePairId(pairId);
    if (!parsed || (parsed.a !== "en" && parsed.b !== "en")) return [];
    const foreign = parsed.a === "en" ? parsed.b : parsed.a;
    const originName = typeof getWorldOriginNameFromCode === "function"
      ? getWorldOriginNameFromCode(foreign)
      : (LANG_TO_WORLD_ORIGIN && LANG_TO_WORLD_ORIGIN[foreign]) || "";
    const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
    const out = [];
    rows.forEach((line) => {
      if (!line || (hiddenLines && hiddenLines.has(line))) return;
      const parts = String(line).split("\t");
      if (parts.length < 8) return;
      if (parts[7] !== originName) return;
      const local = findLocalOverrideForWorldLine(entries, line);
      const english = (local && local.translations && local.translations.en) || parts[0] || "";
      const foreignWord = (local && local.translations && local.translations[foreign]) || parts[1] || "";
      const cats = local ? categoriesFromEntry(local) : { is: [], unrelated: [], isNot: [] };
      const homographs = (local && local.homographs) || null;
      const pos = local
        ? [].concat(local.partOfSpeech || []).join(" & ")
        : (parts[5] || "");
      const wordId = local && local.wordId
        ? parseInt(local.wordId, 10)
        : getWorldLineWordId(line);
      let languageWord;
      let languageLang;
      let pairWord;
      let pairLang;
      if (focusLang && focusLang === foreign) {
        languageWord = english;
        languageLang = "en";
        pairWord = foreignWord;
        pairLang = foreign;
      } else {
        languageWord = english;
        languageLang = "en";
        pairWord = foreignWord;
        pairLang = foreign;
      }
      out.push({
        pairId,
        wordId,
        categories: cats,
        languageWord,
        languageLang,
        pairWord,
        pairLang,
        pos,
        origin: LANG_TO_WORLD_ORIGIN[languageLang] || languageLang,
        homographs,
        createdBy: (local && local.createdBy) || "",
        createdAt: (local && local.createdAt) || "",
        lastEditedBy: (local && local.lastEditedBy) || "",
        lastEditedAt: (local && local.lastEditedAt) || "",
        sourceWorldLine: line,
        _entryId: local && local._entryId,
        pinyin: (local && local.pinyin) || parts[2] || "",
        hiragana: (local && local.hiragana) || parts[3] || "",
        latinLetters: (local && local.latinLetters) || parts[4] || "",
      });
    });
    return out;
  }

  function buildCrossRecords(pairId, entries, focusLang) {
    if (typeof buildCrossPairEntries !== "function") return [];
    const crossEntries = buildCrossPairEntries(pairId);
    return crossEntries.map((cross) => {
      const cats = { is: [], unrelated: [], isNot: [] };
      let languageWord = cross.word || "";
      let languageLang = cross.wordLang || "";
      let pairWord = cross.translation || "";
      let pairLang = cross.translationLang || "";
      if (focusLang && languageLang !== focusLang && pairLang === focusLang) {
        // keep language word as the non-focus side
      } else if (focusLang && pairLang !== focusLang && languageLang === focusLang) {
        languageWord = cross.translation || "";
        languageLang = cross.translationLang || "";
        pairWord = cross.word || "";
        pairLang = cross.wordLang || "";
      }
      return {
        pairId,
        wordId: typeof getCrossEntryWordId === "function"
          ? getCrossEntryWordId(cross)
          : (typeof peekCrossWordId === "function" ? peekCrossWordId(cross) : 0),
        categories: cats,
        languageWord,
        languageLang,
        pairWord,
        pairLang,
        pos: cross.pos || "",
        origin: LANG_TO_WORLD_ORIGIN[languageLang] || languageLang,
        homographs: null,
        createdBy: "",
        createdAt: "",
        lastEditedBy: "",
        lastEditedAt: "",
        sourceWorldLine: cross.worldLine || "",
        leftLine: cross.leftLine || "",
        rightLine: cross.rightLine || "",
        pinyin: "",
        hiragana: "",
        latinLetters: "",
      };
    });
  }

  function buildLocalOnlyRecords(selectedLangs, entries, exportedWorldKeys) {
    const out = [];
    (entries || []).forEach((entry) => {
      if (!entry || entry.isCore) return;
      if (entry.sourceWorldLine && exportedWorldKeys.has(entry.sourceWorldLine)) return;
      const origin = entry.originLanguage || entry.translationSource || "en";
      const translated = entry.translationLanguage || "en";
      const langs = new Set([origin, translated].concat(Object.keys(entry.translations || {})));
      const allSelected = !selectedLangs || !selectedLangs.length || selectedLangs.indexOf("all") >= 0;
      if (!allSelected) {
        const hit = selectedLangs.some((code) => langs.has(code));
        if (!hit) return;
      }
      if (!entry.wordId) ensureEntryWordId(entry, entries);
      const focus = !allSelected && selectedLangs.length === 1 ? selectedLangs[0] : "";
      let languageLang = origin;
      let pairLang = translated;
      if (focus && langs.has(focus)) {
        pairLang = focus;
        languageLang = focus === origin ? translated : origin;
        if (!languageLang || languageLang === pairLang) {
          languageLang = Object.keys(entry.translations || {}).find((c) => c !== pairLang) || "en";
        }
      }
      const translations = entry.translations || {};
      out.push({
        pairId: (typeof makeCrossPairId === "function" && languageLang !== "en" && pairLang !== "en")
          ? makeCrossPairId(languageLang, pairLang)
          : (typeof makeEnglishHubPairId === "function"
            ? makeEnglishHubPairId(languageLang === "en" ? pairLang : languageLang)
            : ""),
        wordId: parseInt(entry.wordId, 10) || 0,
        categories: categoriesFromEntry(entry),
        languageWord: translations[languageLang] || (languageLang === "en" ? entry.definition : "") || "",
        languageLang,
        pairWord: translations[pairLang] || (pairLang === "en" ? entry.definition : "") || "",
        pairLang,
        pos: [].concat(entry.partOfSpeech || []).join(" & "),
        origin: LANG_TO_WORLD_ORIGIN[languageLang] || languageLang,
        homographs: entry.homographs || null,
        createdBy: entry.createdBy || "",
        createdAt: entry.createdAt || "",
        lastEditedBy: entry.lastEditedBy || "",
        lastEditedAt: entry.lastEditedAt || "",
        sourceWorldLine: entry.sourceWorldLine || "",
        _entryId: entry._entryId,
        pinyin: entry.pinyin || "",
        hiragana: entry.hiragana || "",
        latinLetters: entry.latinLetters || "",
      });
    });
    return out;
  }

  function collectDictionaryRecords(selectedLangs) {
    const entries = typeof ensureCoreWordsInDictionary === "function"
      ? ensureCoreWordsInDictionary()
      : [];
    const hidden = typeof loadHiddenWorldLines === "function" ? loadHiddenWorldLines() : new Set();
    const pairs = pairIdsForSelectedLangs(selectedLangs);
    const records = [];
    const exportedWorldKeys = new Set();
    pairs.forEach((pairId) => {
      const focus = focusLangForPair(pairId, selectedLangs);
      const parsed = parsePairId(pairId);
      if (!parsed) return;
      if (parsed.a === "en" || parsed.b === "en") {
        buildHubRecords(pairId, entries, hidden, focus).forEach((rec) => {
          if (rec.sourceWorldLine) exportedWorldKeys.add(rec.sourceWorldLine);
          records.push(rec);
        });
      } else {
        buildCrossRecords(pairId, entries, focus).forEach((rec) => records.push(rec));
      }
    });
    buildLocalOnlyRecords(selectedLangs, entries, exportedWorldKeys).forEach((rec) => records.push(rec));
    return records;
  }

  function escapeTxtLineValue(value) {
    return String(value == null ? "" : value).replace(/\r?\n/g, "\\n").replace(/\s*\|\s*/g, "/");
  }

  function wordRecordFields(rec) {
    const cats = rec.categories || { is: [], unrelated: [], isNot: [] };
    return [
      ["ID#", rec.wordId || ""],
      ["Pair", rec.pairId || ""],
      ["Is", serializeSymbolRefs(cats.is)],
      ["Unrelated", serializeSymbolRefs(cats.unrelated)],
      ["Isn't", serializeSymbolRefs(cats.isNot)],
      ["LanguageWord", starMark(rec.languageWord, rec.languageLang, rec.homographs)],
      ["LanguageWordLang", rec.languageLang || ""],
      ["PairWord", starMark(rec.pairWord, rec.pairLang, rec.homographs)],
      ["PairWordLang", rec.pairLang || ""],
      ["POS", rec.pos || ""],
      ["Origin", rec.origin || ""],
      ["Pinyin", rec.pinyin || ""],
      ["Hiragana", rec.hiragana || ""],
      ["LatinLetters", rec.latinLetters || ""],
      ["FirstCreatedBy", rec.createdBy || ""],
      ["FirstCreatedAt", rec.createdAt || ""],
      ["LastEditedBy", rec.lastEditedBy || ""],
      ["LastEditedAt", rec.lastEditedAt || ""],
      ["SourceWorldLine", rec.sourceWorldLine || ""],
      ["EntryId", rec._entryId || ""],
    ];
  }

  function formatWordBlock(rec) {
    return ["---"].concat(wordRecordFields(rec).map((pair) => pair[0] + ": " + pair[1])).concat(["---"]).join("\n");
  }

  function formatWordLine(rec) {
    return wordRecordFields(rec).map((pair) => pair[0] + ": " + escapeTxtLineValue(pair[1])).join(" | ");
  }

  function formatDictionaryRecord(rec, oneLine) {
    return oneLine ? (formatWordLine(rec) + "\n") : (formatWordBlock(rec) + "\n\n");
  }

  function formatSentenceBlock(entry) {
    return [
      "---",
      "SentenceId: " + (entry.id || ""),
      "SentenceText: " + String(entry.sentenceText || "").replace(/\r?\n/g, "\\n"),
      "SentenceNorm: " + (entry.sentenceNorm || ""),
      "InputLang: " + (entry.inputLang || ""),
      "OutputLang: " + (entry.outputLang || ""),
      "OverridesJson: " + JSON.stringify(entry.overrides || {}),
      "FirstCreatedBy: " + (entry.createdBy || ""),
      "FirstCreatedAt: " + (entry.createdAt || ""),
      "LastEditedBy: " + (entry.lastEditedBy || ""),
      "LastEditedAt: " + (entry.lastEditedAt || ""),
      "---",
    ].join("\n");
  }

  function formatSentenceLine(entry) {
    return [
      ["SentenceId", entry.id || ""],
      ["SentenceText", String(entry.sentenceText || "").replace(/\r?\n/g, "\\n")],
      ["SentenceNorm", entry.sentenceNorm || ""],
      ["InputLang", entry.inputLang || ""],
      ["OutputLang", entry.outputLang || ""],
      ["OverridesJson", JSON.stringify(entry.overrides || {})],
      ["FirstCreatedBy", entry.createdBy || ""],
      ["FirstCreatedAt", entry.createdAt || ""],
      ["LastEditedBy", entry.lastEditedBy || ""],
      ["LastEditedAt", entry.lastEditedAt || ""],
    ].map((pair) => pair[0] + ": " + escapeTxtLineValue(pair[1])).join(" | ");
  }

  function formatSentenceRecord(entry, oneLine) {
    return oneLine ? (formatSentenceLine(entry) + "\n") : (formatSentenceBlock(entry) + "\n\n");
  }

  function buildTxtExportHeader(selectedLangs, includeDictionary, includeSentences, oneLine) {
    const allLangs = !selectedLangs || !selectedLangs.length || selectedLangs.indexOf("all") >= 0;
    const langHeader = allLangs ? "all" : selectedLangs.join(",");
    const contentBits = [];
    if (includeDictionary) contentBits.push("Dictionary");
    if (includeSentences) contentBits.push("SentenceContexts");
    return [
      "# Kanji Builder Txt Transfer",
      "# FormatVersion: " + TXT_FORMAT_VERSION,
      "# Languages: " + langHeader,
      "# Contents: " + contentBits.join(","),
      "# Layout: " + (oneLine ? "oneline" : "listed"),
      "",
    ].join("\n");
  }

  function localOverrideLookup(entries) {
    const byLine = new Map();
    const byHub = new Map();
    (entries || []).forEach((entry) => {
      if (!entry || entry.isCore) return;
      if (entry.sourceWorldLine) byLine.set(entry.sourceWorldLine, entry);
      if (typeof getEntryEnglishHubMatchKey === "function") {
        const key = getEntryEnglishHubMatchKey(entry);
        if (key) byHub.set(key, entry);
      }
    });
    return { byLine, byHub };
  }

  function findLocalFromLookup(lookup, line) {
    if (!line || !lookup) return null;
    if (lookup.byLine.has(line)) return lookup.byLine.get(line);
    if (typeof getWorldLineEnglishHubMatchKey === "function") {
      const key = getWorldLineEnglishHubMatchKey(line);
      if (key && lookup.byHub.has(key)) return lookup.byHub.get(key);
    }
    return null;
  }

  function hubRecordFromLine(pairId, line, rowIndex, foreign, local, focusLang) {
    const parts = String(line).split("\t");
    if (parts.length < 8) return null;
    const english = (local && local.translations && local.translations.en) || parts[0] || "";
    const foreignWord = (local && local.translations && local.translations[foreign]) || parts[1] || "";
    const cats = local ? categoriesFromEntry(local) : { is: [], unrelated: [], isNot: [] };
    return {
      pairId,
      wordId: (typeof isPlausibleWordId === "function" && local && isPlausibleWordId(local.wordId)
        ? parseInt(local.wordId, 10)
        : (rowIndex + 1)),
      categories: cats,
      languageWord: english,
      languageLang: "en",
      pairWord: foreignWord,
      pairLang: foreign,
      pos: local ? [].concat(local.partOfSpeech || []).join(" & ") : (parts[5] || ""),
      origin: LANG_TO_WORLD_ORIGIN.en || "English",
      homographs: (local && local.homographs) || null,
      createdBy: (local && local.createdBy) || "",
      createdAt: (local && local.createdAt) || "",
      lastEditedBy: (local && local.lastEditedBy) || "",
      lastEditedAt: (local && local.lastEditedAt) || "",
      sourceWorldLine: line,
      _entryId: local && local._entryId,
      pinyin: (local && local.pinyin) || parts[2] || "",
      hiragana: (local && local.hiragana) || parts[3] || "",
      latinLetters: (local && local.latinLetters) || parts[4] || "",
    };
  }

  function crossRecordFromPair(pairId, left, right, focusLang, assignId) {
    const parsed = parsePairId(pairId);
    const entry = makeCrossEntry(left, right, pairId, parsed.a, parsed.b);
    let languageWord = entry.word || "";
    let languageLang = entry.wordLang || "";
    let pairWord = entry.translation || "";
    let pairLang = entry.translationLang || "";
    if (focusLang && pairLang !== focusLang && languageLang === focusLang) {
      languageWord = entry.translation || "";
      languageLang = entry.translationLang || "";
      pairWord = entry.word || "";
      pairLang = entry.wordLang || "";
    }
    const worldLine = entry.worldLine || encodeCrossWorldLine(entry);
    return {
      pairId,
      wordId: assignId ? assignId(entry) : (typeof getCrossEntryWordId === "function"
        ? getCrossEntryWordId(entry)
        : (typeof peekCrossWordId === "function" ? peekCrossWordId(entry) : 0)),
      categories: { is: [], unrelated: [], isNot: [] },
      languageWord,
      languageLang,
      pairWord,
      pairLang,
      pos: entry.pos || "",
      origin: LANG_TO_WORLD_ORIGIN[languageLang] || languageLang,
      homographs: null,
      createdBy: "",
      createdAt: "",
      lastEditedBy: "",
      lastEditedAt: "",
      sourceWorldLine: worldLine,
      pinyin: "",
      hiragana: "",
      latinLetters: "",
    };
  }

  async function forEachTxtExportBlock(selectedLangs, includeDictionary, includeSentences, onBlock, yieldFn, oneLine, onProgress) {
    let processed = 0;
    let workDone = 0;
    let workTotal = 1;

    function reportProgress() {
      if (typeof onProgress === "function") {
        onProgress(workDone, Math.max(workTotal, workDone, 1));
      }
    }

    function tick(amount) {
      workDone += amount || 1;
      processed += 1;
      if (processed % 250 === 0 || workDone >= workTotal) reportProgress();
    }

    async function maybeYield() {
      if (yieldFn && processed % 400 === 0) await yieldFn();
    }

    if (includeDictionary) {
      const entries = typeof ensureCoreWordsInDictionary === "function"
        ? ensureCoreWordsInDictionary()
        : [];
      if (typeof sanitizeWordIdState === "function") sanitizeWordIdState(entries);
      const crossIdState = typeof beginCrossWordIdAssignment === "function"
        ? beginCrossWordIdAssignment(entries)
        : null;
      let nextExportWordId = (typeof getHighestWordId === "function" ? getHighestWordId(entries) : 0) + 1;
      function assignCrossExportId(entryOrLine) {
        if (crossIdState && typeof allocateCrossWordId === "function") {
          return allocateCrossWordId(entryOrLine, crossIdState);
        }
        if (typeof getCrossEntryWordId === "function") return getCrossEntryWordId(entryOrLine, entries);
        const stored = typeof peekCrossWordId === "function" ? peekCrossWordId(entryOrLine) : 0;
        if (stored && stored < 1000000000) return stored;
        return nextExportWordId++;
      }
      const lookup = localOverrideLookup(entries);
      const hidden = typeof loadHiddenWorldLines === "function" ? loadHiddenWorldLines() : new Set();
      const pairs = pairIdsForSelectedLangs(selectedLangs);
      const hubByOrigin = new Map();
      const crossPairIds = [];
      pairs.forEach((pairId) => {
        const parsed = parsePairId(pairId);
        if (!parsed) return;
        if (parsed.a === "en" || parsed.b === "en") {
          const foreign = parsed.a === "en" ? parsed.b : parsed.a;
          const originName = typeof getWorldOriginNameFromCode === "function"
            ? getWorldOriginNameFromCode(foreign)
            : ((LANG_TO_WORLD_ORIGIN && LANG_TO_WORLD_ORIGIN[foreign]) || "");
          hubByOrigin.set(originName, {
            pairId,
            foreign,
            focusLang: focusLangForPair(pairId, selectedLangs),
          });
        } else {
          crossPairIds.push(pairId);
        }
      });

      const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
      workTotal = Math.max(1, rows.length + (crossPairIds.length ? 1 : 0) + 1);
      reportProgress();

      const exportedWorldKeys = new Set();
      for (let i = 0; i < rows.length; i++) {
        const line = rows[i];
        if (line && !hidden.has(line)) {
          const lastTab = line.lastIndexOf("\t");
          if (lastTab >= 0) {
            const origin = line.slice(lastTab + 1);
            const hub = hubByOrigin.get(origin);
            if (hub) {
              const rec = hubRecordFromLine(
                hub.pairId,
                line,
                i,
                hub.foreign,
                findLocalFromLookup(lookup, line),
                hub.focusLang
              );
              if (rec) {
                if (rec.sourceWorldLine) exportedWorldKeys.add(rec.sourceWorldLine);
                await onBlock("DICTIONARY", formatDictionaryRecord(rec, oneLine));
              }
            }
          }
        }
        tick(1);
        if (processed % 400 === 0) await maybeYield();
      }

      if (crossPairIds.length && typeof getSharedEnglishHubIndex === "function" && typeof makeCrossEntry === "function") {
        const index = getSharedEnglishHubIndex();
        let crossUnits = 0;
        for (let p = 0; p < crossPairIds.length; p++) {
          const parsed = parsePairId(crossPairIds[p]);
          const mapA = index.byLangEnglish && index.byLangEnglish.get(parsed.a);
          if (mapA) crossUnits += mapA.size;
        }
        workTotal = Math.max(workTotal, workDone + crossUnits + 1);
        reportProgress();

        for (let p = 0; p < crossPairIds.length; p++) {
          const pairId = crossPairIds[p];
          const parsed = parsePairId(pairId);
          const focusLang = focusLangForPair(pairId, selectedLangs);
          const mapA = index.byLangEnglish && index.byLangEnglish.get(parsed.a);
          const mapB = index.byLangEnglish && index.byLangEnglish.get(parsed.b);
          if (!mapA || !mapB) continue;
          for (const [englishNorm, rowsA] of mapA) {
            const rowsB = mapB.get(englishNorm);
            if (!rowsB || !rowsB.length || !rowsA || !rowsA.length) {
              tick(1);
              if (processed % 400 === 0) await maybeYield();
              continue;
            }
            const samePos = [];
            const otherPos = [];
            for (let a = 0; a < rowsA.length; a++) {
              for (let b = 0; b < rowsB.length; b++) {
                const left = rowsA[a];
                const right = rowsB[b];
                const item = { left, right };
                const leftPos = typeof normalizeDictionaryPos === "function" ? normalizeDictionaryPos(left.pos) : left.pos;
                const rightPos = typeof normalizeDictionaryPos === "function" ? normalizeDictionaryPos(right.pos) : right.pos;
                if (leftPos && rightPos && leftPos === rightPos) samePos.push(item);
                else otherPos.push(item);
              }
            }
            const chosen = (samePos.length ? samePos : otherPos).slice(0, 24);
            for (let c = 0; c < chosen.length; c++) {
              const rec = crossRecordFromPair(pairId, chosen[c].left, chosen[c].right, focusLang, assignCrossExportId);
              await onBlock("DICTIONARY", formatDictionaryRecord(rec, oneLine));
            }
            tick(1);
            if (processed % 400 === 0) await maybeYield();
          }
          if (yieldFn) await yieldFn();
        }
      }
      if (typeof commitCrossWordIdAssignment === "function") commitCrossWordIdAssignment(crossIdState);

      const locals = buildLocalOnlyRecords(selectedLangs, entries, exportedWorldKeys);
      workTotal = Math.max(workTotal, workDone + locals.length + (includeSentences ? 1 : 0));
      reportProgress();
      for (let i = 0; i < locals.length; i++) {
        await onBlock("DICTIONARY", formatDictionaryRecord(locals[i], oneLine));
        tick(1);
        if (processed % 400 === 0) await maybeYield();
      }
    }

    if (includeSentences) {
      const allLangs = !selectedLangs || !selectedLangs.length || selectedLangs.indexOf("all") >= 0;
      const sentences = typeof loadTransferSentences === "function" ? loadTransferSentences() : [];
      workTotal = Math.max(workTotal, workDone + Math.max(1, sentences.length));
      reportProgress();
      for (let i = 0; i < sentences.length; i++) {
        const entry = sentences[i];
        if (!allLangs) {
          if (selectedLangs.indexOf(entry.inputLang) < 0
            && selectedLangs.indexOf(entry.outputLang) < 0
            && entry.outputLang !== "universal") {
            tick(1);
            if (processed % 400 === 0) await maybeYield();
            continue;
          }
        }
        await onBlock("SENTENCE_CONTEXTS", formatSentenceRecord(entry, oneLine));
        tick(1);
        if (processed % 400 === 0) await maybeYield();
      }
    }

    workDone = Math.max(workDone, workTotal);
    reportProgress();
  }

  async function measureTxtExport(selectedLangs, includeDictionary, includeSentences, yieldFn, oneLine, onProgress) {
    const header = buildTxtExportHeader(selectedLangs, includeDictionary, includeSentences, oneLine) + "\n";
    const headerBytes = utf8ByteLength(header);
    let totalBytes = headerBytes;
    let chunkBytes = headerBytes;
    let chunks = 1;
    let section = "";
    await forEachTxtExportBlock(selectedLangs, includeDictionary, includeSentences, (sec, blockText) => {
      let marker = section === sec ? "" : "\n## " + sec + "\n\n";
      let extra = utf8ByteLength(marker) + utf8ByteLength(blockText);
      if (chunkBytes > headerBytes && chunkBytes + extra > TXT_CHUNK_MAX_BYTES) {
        chunks += 1;
        chunkBytes = headerBytes;
        section = "";
        marker = "\n## " + sec + "\n\n";
        extra = utf8ByteLength(marker) + utf8ByteLength(blockText);
      }
      section = sec;
      chunkBytes += extra;
      totalBytes += extra;
    }, yieldFn, oneLine, onProgress);
    return { totalBytes, chunks, headerBytes };
  }

  async function streamTxtExport(options) {
    const selectedLangs = options.selectedLangs;
    const includeDictionary = options.includeDictionary;
    const includeSentences = options.includeSentences;
    const split10mb = !!options.split10mb;
    const oneLine = !!options.oneLine;
    const onChunk = options.onChunk;
    const yieldFn = options.yieldFn;
    const onProgress = options.onProgress;
    const totalChunks = options.totalChunks || 0;
    const header = buildTxtExportHeader(selectedLangs, includeDictionary, includeSentences, oneLine) + "\n";
    let parts = [header];
    let bytes = utf8ByteLength(header);
    let section = "";
    let chunkIndex = 0;

    async function flushChunk() {
      if (parts.length <= 1) return;
      if (totalChunks > 0) {
        parts[0] = header.replace(
          "# FormatVersion:",
          "# Part: " + (chunkIndex + 1) + "/" + totalChunks + "\n# FormatVersion:"
        );
      }
      const blob = new Blob(parts, { type: "text/plain;charset=utf-8" });
      parts = [header];
      bytes = utf8ByteLength(header);
      section = "";
      await onChunk(blob, chunkIndex);
      chunkIndex += 1;
    }

    await forEachTxtExportBlock(selectedLangs, includeDictionary, includeSentences, async (sec, blockText) => {
      const marker = section === sec ? "" : "\n## " + sec + "\n\n";
      const extra = utf8ByteLength(marker) + utf8ByteLength(blockText);
      if (split10mb && parts.length > 1 && bytes + extra > TXT_CHUNK_MAX_BYTES) {
        await flushChunk();
      }
      if (marker) {
        parts.push(marker);
        bytes += utf8ByteLength(marker);
        section = sec;
      }
      parts.push(blockText);
      bytes += utf8ByteLength(blockText);
      if (!split10mb && parts.length > 300) {
        const compacted = new Blob(parts, { type: "text/plain;charset=utf-8" });
        parts = [compacted];
        bytes = compacted.size;
      }
    }, yieldFn, oneLine, onProgress);
    await flushChunk();
    return chunkIndex;
  }

  function buildTxtFilename(selectedLangs, includeDictionary, includeSentences) {
    const allLangs = !selectedLangs || !selectedLangs.length || selectedLangs.indexOf("all") >= 0;
    let langPart;
    if (allLangs) {
      langPart = "All_Languages";
    } else if (selectedLangs.length === 1) {
      const code = selectedLangs[0];
      langPart = (LANGUAGES[code] || code).replace(/\s+/g, "_");
    } else {
      langPart = selectedLangs.map((c) => TXT_LANG_FILE_CODE[c] || String(c).toUpperCase()).join("_");
    }
    let contentPart;
    if (includeDictionary && includeSentences) contentPart = "Both_Contents";
    else if (includeDictionary) contentPart = "Dictionary";
    else contentPart = "Sentence_Contexts";
    return langPart + "_" + contentPart + ".txt";
  }

  const TXT_CHUNK_MAX_BYTES = 10 * 1024 * 1024;

  function utf8ByteLength(str) {
    return new TextEncoder().encode(String(str || "")).length;
  }

  function chunkSuffixLetter(index) {
    let n = index + 1;
    let out = "";
    while (n > 0) {
      n -= 1;
      out = String.fromCharCode(97 + (n % 26)) + out;
      n = Math.floor(n / 26);
    }
    return out || "a";
  }

  function chunkTxtFilename(baseName, index) {
    return String(baseName || "export.txt").replace(/\.txt$/i, "") + "_" + chunkSuffixLetter(index) + ".txt";
  }

  function collectTxtBlocks(content, sectionTitle) {
    const text = String(content || "");
    const marker = "## " + sectionTitle;
    const start = text.indexOf(marker);
    if (start < 0) return [];
    let end = text.length;
    const next = text.indexOf("\n## ", start + marker.length);
    if (next >= 0) end = next;
    const slice = text.slice(start, end);
    const blocks = [];
    const re = /---\r?\n[\s\S]*?---/g;
    let match;
    while ((match = re.exec(slice))) {
      blocks.push(match[0] + "\n\n");
    }
    return blocks;
  }

  function splitTxtExportIntoChunks(content, maxBytes) {
    const limit = maxBytes || TXT_CHUNK_MAX_BYTES;
    const text = String(content || "");
    const dictIdx = text.indexOf("## DICTIONARY");
    const sentIdx = text.indexOf("## SENTENCE_CONTEXTS");
    let headerEnd = text.length;
    if (dictIdx >= 0) headerEnd = Math.min(headerEnd, dictIdx);
    if (sentIdx >= 0) headerEnd = Math.min(headerEnd, sentIdx);
    const baseHeader = text.slice(0, headerEnd).trimEnd();
    const dictBlocks = collectTxtBlocks(text, "DICTIONARY");
    const sentenceBlocks = collectTxtBlocks(text, "SENTENCE_CONTEXTS");
    if (!dictBlocks.length && !sentenceBlocks.length) return [text];

    const chunks = [];
    let parts = [];
    let bytes = 0;
    let section = "";

    function headerText() {
      return baseHeader + "\n";
    }

    function startChunk() {
      parts = [headerText()];
      bytes = utf8ByteLength(parts[0]);
      section = "";
    }

    function flushChunk() {
      if (parts.length <= 1) return;
      chunks.push(parts.join(""));
      startChunk();
    }

    function ensureSection(name) {
      if (section === name) return;
      const marker = "\n## " + name + "\n\n";
      parts.push(marker);
      bytes += utf8ByteLength(marker);
      section = name;
    }

    function addBlock(sectionName, blockText) {
      const markerSize = section === sectionName ? 0 : utf8ByteLength("\n## " + sectionName + "\n\n");
      const extra = markerSize + utf8ByteLength(blockText);
      if (parts.length > 1 && bytes + extra > limit) flushChunk();
      ensureSection(sectionName);
      parts.push(blockText);
      bytes += utf8ByteLength(blockText);
    }

    startChunk();
    dictBlocks.forEach((block) => addBlock("DICTIONARY", block));
    sentenceBlocks.forEach((block) => addBlock("SENTENCE_CONTEXTS", block));
    flushChunk();
    if (!chunks.length) chunks.push(text);
    return chunks.map((chunk, index) => {
      return chunk.replace(
        "# FormatVersion:",
        "# Part: " + (index + 1) + "/" + chunks.length + "\n# FormatVersion:"
      );
    });
  }

  function buildTxtExportContent(selectedLangs, includeDictionary, includeSentences, oneLine) {
    const allLangs = !selectedLangs || !selectedLangs.length || selectedLangs.indexOf("all") >= 0;
    const langHeader = allLangs ? "all" : selectedLangs.join(",");
    const contentBits = [];
    if (includeDictionary) contentBits.push("Dictionary");
    if (includeSentences) contentBits.push("SentenceContexts");
    const lines = [
      "# Kanji Builder Txt Transfer",
      "# FormatVersion: " + TXT_FORMAT_VERSION,
      "# Languages: " + langHeader,
      "# Contents: " + contentBits.join(","),
      "# Layout: " + (oneLine ? "oneline" : "listed"),
      "",
    ];
    if (includeDictionary) {
      lines.push("## DICTIONARY");
      lines.push("");
      collectDictionaryRecords(selectedLangs).forEach((rec) => {
        if (oneLine) lines.push(formatWordLine(rec));
        else {
          lines.push(formatWordBlock(rec));
          lines.push("");
        }
      });
    }
    if (includeSentences) {
      lines.push("## SENTENCE_CONTEXTS");
      lines.push("");
      const sentences = typeof loadTransferSentences === "function" ? loadTransferSentences() : [];
      const filtered = sentences.filter((entry) => {
        if (allLangs) return true;
        return selectedLangs.indexOf(entry.inputLang) >= 0
          || selectedLangs.indexOf(entry.outputLang) >= 0
          || entry.outputLang === "universal";
      });
      filtered.forEach((entry) => {
        if (oneLine) lines.push(formatSentenceLine(entry));
        else {
          lines.push(formatSentenceBlock(entry));
          lines.push("");
        }
      });
    }
    return lines.join("\n");
  }

  function parseTxtBlocks(text) {
    const lines = String(text || "").split(/\r?\n/);
    const meta = { languages: [], contents: [], formatVersion: 1 };
    const dictionary = [];
    const sentences = [];
    let section = "";
    let current = null;

    function flush() {
      if (!current) return;
      if (section === "DICTIONARY") dictionary.push(current);
      else if (section === "SENTENCE_CONTEXTS") sentences.push(current);
      current = null;
    }

    lines.forEach((raw) => {
      const line = raw.trimEnd();
      const trimmed = line.trim();
      if (trimmed.startsWith("# Languages:")) {
        meta.languages = trimmed.slice(12).trim().split(",").map((s) => s.trim()).filter(Boolean);
        return;
      }
      if (trimmed.startsWith("# Contents:")) {
        meta.contents = trimmed.slice(11).trim().split(",").map((s) => s.trim()).filter(Boolean);
        return;
      }
      if (trimmed.startsWith("# FormatVersion:")) {
        meta.formatVersion = parseInt(trimmed.slice(16).trim(), 10) || 1;
        return;
      }
      if (trimmed === "## DICTIONARY") {
        flush();
        section = "DICTIONARY";
        return;
      }
      if (trimmed === "## SENTENCE_CONTEXTS") {
        flush();
        section = "SENTENCE_CONTEXTS";
        return;
      }
      if (trimmed === "---") {
        if (current) flush();
        else current = {};
        return;
      }
      if (trimmed.indexOf(" | ") >= 0 && /^(ID#|SentenceId)\s*:/i.test(trimmed)) {
        flush();
        if (!section) {
          section = /^SentenceId\s*:/i.test(trimmed) ? "SENTENCE_CONTEXTS" : "DICTIONARY";
        }
        current = {};
        trimmed.split(/\s\|\s/).forEach((part) => {
          const colon = part.indexOf(":");
          if (colon < 0) return;
          current[part.slice(0, colon).trim()] = part.slice(colon + 1).trim();
        });
        flush();
        return;
      }
      if (!current || !trimmed) return;
      const colon = trimmed.indexOf(":");
      if (colon < 0) return;
      const key = trimmed.slice(0, colon).trim();
      const value = trimmed.slice(colon + 1).trim();
      current[key] = value;
    });
    flush();
    return { meta, dictionary, sentences };
  }

  function formatSymbolNames(refs) {
    return (refs || [])
      .filter((ref) => ref && ref.id != null)
      .map((ref) => ref.name || ("#" + ref.id))
      .join(", ");
  }

  function entryWordForLang(entry, lang) {
    if (!entry || !lang) return "";
    const translations = entry.translations || {};
    if (translations[lang]) return translations[lang];
    if (lang === "en") return entry.definition || "";
    return "";
  }

  function worldLineAsEntry(line, wordId) {
    const parts = String(line || "").split("\t");
    const originCode = WORLD_ORIGIN_TO_LANG[parts[7] || ""] || "en";
    const translations = { en: parts[0] || "" };
    if (originCode && originCode !== "en") translations[originCode] = parts[1] || "";
    return {
      wordId: wordId || getWorldLineWordId(line),
      sourceWorldLine: line,
      originLanguage: originCode !== "en" ? originCode : "en",
      translationLanguage: originCode !== "en" ? "en" : "",
      translations,
      definition: parts[0] || "",
      partOfSpeech: String(parts[5] || "").split(/\s*&\s*/).filter(Boolean),
      categories: { is: [], unrelated: [], isNot: [] },
      pinyin: parts[2] || "",
      hiragana: parts[3] || "",
      latinLetters: parts[4] || "",
      isWorldOnly: true,
    };
  }

  function findMatchForRecord(rec, entries) {
    const incomingId = parseInt(rec["ID#"] || rec.ID || "0", 10);
    if (Number.isFinite(incomingId) && incomingId > 0) {
      const idx = findEntryIndexByWordId(entries, incomingId);
      if (idx >= 0) {
        return { kind: "local", index: idx, entry: entries[idx], wordId: incomingId };
      }
    }
    if (rec.SourceWorldLine) {
      const idx = typeof findLocalOverrideIndexForWorldLine === "function"
        ? findLocalOverrideIndexForWorldLine(entries, rec.SourceWorldLine)
        : -1;
      if (idx >= 0) {
        return {
          kind: "local",
          index: idx,
          entry: entries[idx],
          wordId: parseInt(entries[idx].wordId, 10) || incomingId || 0,
        };
      }
      const rows = Array.isArray(window.WORLD_DICTIONARY_ROWS) ? window.WORLD_DICTIONARY_ROWS : [];
      if (rows.indexOf(rec.SourceWorldLine) >= 0) {
        const wordId = getWorldLineWordId(rec.SourceWorldLine) || incomingId || 0;
        return { kind: "world", line: rec.SourceWorldLine, wordId, entry: worldLineAsEntry(rec.SourceWorldLine, wordId) };
      }
    }
    if (Number.isFinite(incomingId) && incomingId > 0 && incomingId <= getWorldDictionaryRowCount()) {
      const line = window.WORLD_DICTIONARY_ROWS[incomingId - 1];
      const idx = typeof findLocalOverrideIndexForWorldLine === "function"
        ? findLocalOverrideIndexForWorldLine(entries, line)
        : -1;
      if (idx >= 0) {
        return { kind: "local", index: idx, entry: entries[idx], wordId: incomingId };
      }
      return { kind: "world", line, wordId: incomingId, entry: worldLineAsEntry(line, incomingId) };
    }
    return { kind: "none", wordId: incomingId || 0, entry: null, index: -1 };
  }

  function describeWordDiff(rec, entry) {
    const changes = [];
    function check(lang, recWordRaw) {
      if (!lang) return;
      const incoming = stripStar(recWordRaw || "");
      const current = stripStar(entryWordForLang(entry, lang));
      if (!incoming && !current) return;
      const incomingStar = /★/.test(recWordRaw || "");
      let currentStar = false;
      if (!entry.isWorldOnly && entry.homographs && Object.prototype.hasOwnProperty.call(entry.homographs, lang)) {
        currentStar = !!entry.homographs[lang];
      } else if (!entry.isWorldOnly && current && typeof isHomographWord === "function") {
        currentStar = isHomographWord(current, lang);
      }
      if (normalizeDictionaryWord(incoming) !== normalizeDictionaryWord(current)) {
        changes.push({
          lang,
          current: current + (currentStar ? "★" : ""),
          incoming: incoming + (incomingStar ? "★" : ""),
        });
      } else if (!entry.isWorldOnly && incomingStar !== currentStar) {
        changes.push({
          lang,
          current: current + (currentStar ? "★" : ""),
          incoming: incoming + (incomingStar ? "★" : ""),
          starOnly: true,
        });
      }
    }
    check(rec.LanguageWordLang, rec.LanguageWord);
    check(rec.PairWordLang, rec.PairWord);
    return changes;
  }

  function describeSymbolDiff(localCats, incomingCats) {
    if (categoriesConflict(localCats, incomingCats)) return null;
    const added = { is: [], unrelated: [], isNot: [] };
    let any = false;
    ["is", "unrelated", "isNot"].forEach((cat) => {
      const localIds = symbolIdSet(localCats[cat]);
      (incomingCats[cat] || []).forEach((ref) => {
        if (ref && ref.id != null && !localIds.has(String(ref.id))) {
          added[cat].push(ref);
          any = true;
        }
      });
    });
    return any ? added : null;
  }

  function describeException(localCats, incomingCats) {
    const localIs = symbolIdSet(localCats.is);
    const localUn = symbolIdSet(localCats.unrelated);
    const localNot = symbolIdSet(localCats.isNot);
    const inIs = symbolIdSet(incomingCats.is);
    const inUn = symbolIdSet(incomingCats.unrelated);
    const inNot = symbolIdSet(incomingCats.isNot);
    const clashes = [];
    function namesFor(ids, cats) {
      const all = [].concat(cats.is || [], cats.unrelated || [], cats.isNot || []);
      return Array.from(ids).map((id) => {
        const ref = all.find((r) => r && String(r.id) === String(id));
        return ref && ref.name ? ref.name : ("#" + id);
      }).join(", ");
    }
    const pushClash = (ids, localCat, importCat) => {
      if (!ids.size) return;
      clashes.push(namesFor(ids, localCats) + " (" + localCat + " vs " + importCat + ")");
    };
    const intersect = (a, b) => {
      const out = new Set();
      a.forEach((id) => { if (b.has(id)) out.add(id); });
      return out;
    };
    pushClash(intersect(localIs, inNot), "Is", "Isn't");
    pushClash(intersect(localNot, inIs), "Isn't", "Is");
    pushClash(intersect(localIs, inUn), "Is", "Unrelated");
    pushClash(intersect(localUn, inIs), "Unrelated", "Is");
    pushClash(intersect(localNot, inUn), "Isn't", "Unrelated");
    pushClash(intersect(localUn, inNot), "Unrelated", "Isn't");
    return clashes;
  }

  function previewTxtDictionaryImport(records) {
    const entries = typeof ensureCoreWordsInDictionary === "function"
      ? ensureCoreWordsInDictionary()
      : [];
    const symbols = [];
    const wordChanges = [];
    const exceptions = [];
    const newWords = [];
    (records || []).forEach((rec, recIndex) => {
      const incomingCats = {
        is: parseSymbolRefs(rec.Is),
        unrelated: parseSymbolRefs(rec.Unrelated),
        isNot: parseSymbolRefs(rec["Isn't"] || rec.Isnt),
      };
      const match = findMatchForRecord(rec, entries);
      if (match.kind === "none") {
        const hasContent = stripStar(rec.LanguageWord || "") || stripStar(rec.PairWord || "")
          || incomingCats.is.length || incomingCats.unrelated.length || incomingCats.isNot.length;
        if (hasContent) newWords.push({ rec, recIndex, wordId: match.wordId || 0 });
        return;
      }
      const entry = match.entry;
      const localCats = categoriesFromEntry(entry);
      const wordDiff = describeWordDiff(rec, entry);
      const conflict = categoriesConflict(localCats, incomingCats);
      if (conflict) {
        exceptions.push({
          rec,
          recIndex,
          match,
          wordId: match.wordId,
          clashes: describeException(localCats, incomingCats),
          wordDiff,
        });
        return;
      }
      if (wordDiff.length) {
        wordChanges.push({
          rec,
          recIndex,
          match,
          wordId: match.wordId,
          wordDiff,
        });
      }
      const addedSymbols = describeSymbolDiff(localCats, incomingCats);
      if (addedSymbols) {
        symbols.push({
          rec,
          recIndex,
          match,
          wordId: match.wordId,
          addedSymbols,
          current: localCats,
          incoming: incomingCats,
        });
      }
    });
    return { symbols, wordChanges, exceptions, newWords };
  }

  function previewHasChanges(preview) {
    return !!(preview && (
      (preview.symbols && preview.symbols.length)
      || (preview.wordChanges && preview.wordChanges.length)
      || (preview.exceptions && preview.exceptions.length)
      || (preview.newWords && preview.newWords.length)
    ));
  }

  function applyWordOverwrite(entry, rec) {
    if (!entry.translations) entry.translations = {};
    if (!entry.homographs) entry.homographs = {};
    const languageLang = rec.LanguageWordLang || entry.originLanguage || "en";
    const pairLang = rec.PairWordLang || entry.translationLanguage || "";
    const languageWord = stripStar(rec.LanguageWord || "");
    const pairWord = stripStar(rec.PairWord || "");
    if (languageLang && languageWord) entry.translations[languageLang] = languageWord;
    if (pairLang && pairWord) entry.translations[pairLang] = pairWord;
    if (languageLang === "en" || pairLang === "en") {
      entry.definition = languageLang === "en" ? languageWord : pairWord;
    } else if (!entry.definition) {
      entry.definition = languageWord || pairWord;
    }
    entry.originLanguage = languageLang || entry.originLanguage;
    entry.translationSource = entry.originLanguage;
    if (pairLang) entry.translationLanguage = pairLang;
    if (languageLang) entry.homographs[languageLang] = /★/.test(rec.LanguageWord || "");
    if (pairLang) entry.homographs[pairLang] = /★/.test(rec.PairWord || "");
    if (rec.POS) entry.partOfSpeech = String(rec.POS || "").split(/\s*&\s*|\s*,\s*/).filter(Boolean);
    if (rec.Pinyin) entry.pinyin = rec.Pinyin;
    if (rec.Hiragana) entry.hiragana = rec.Hiragana;
    if (rec.LatinLetters) entry.latinLetters = rec.LatinLetters;
  }

  function applySymbolMerge(entry, incomingCats) {
    const localCats = categoriesFromEntry(entry);
    entry.categories = {
      is: mergeSymbolRefs(localCats.is, incomingCats.is),
      unrelated: mergeSymbolRefs(localCats.unrelated, incomingCats.unrelated),
      isNot: mergeSymbolRefs(localCats.isNot, incomingCats.isNot),
    };
    entry.stampSymbols = entry.categories.is.slice(0, 4);
    entry.symbols = entry.stampSymbols;
    entry.tempStamp = entry.categories.is.length ? entry.categories.is.slice(0, 4) : null;
    entry.tempstamped = entry.categories.is.length > 0;
  }

  function ensureLocalEntryForMatch(entries, match, rec) {
    if (match.kind === "local" && match.index >= 0) return entries[match.index];
    const base = match.entry || worldLineAsEntry(match.line || rec.SourceWorldLine, match.wordId);
    const cats = categoriesFromEntry(base);
    const wordId = match.wordId || parseInt(rec["ID#"] || rec.ID || "0", 10) || allocateNewWordId(entries);
    const fresh = {
      schemaVersion: 2,
      _entryId: makeEntryId(),
      wordId,
      categories: {
        is: (cats.is || []).map((ref) => Object.assign({}, ref)),
        unrelated: (cats.unrelated || []).map((ref) => Object.assign({}, ref)),
        isNot: (cats.isNot || []).map((ref) => Object.assign({}, ref)),
      },
      stampSymbols: (cats.is || []).slice(0, 4),
      symbols: (cats.is || []).slice(0, 4),
      tempStamp: (cats.is && cats.is.length) ? cats.is.slice(0, 4) : null,
      tempstamped: !!(cats.is && cats.is.length),
      stamped: false,
      definition: base.definition || "",
      isCore: false,
      translationSource: base.originLanguage || "en",
      originLanguage: base.originLanguage || "en",
      translationLanguage: base.translationLanguage || "",
      translations: Object.assign({}, base.translations || {}),
      sourceWorldLine: match.line || rec.SourceWorldLine || base.sourceWorldLine || "",
      homographs: Object.assign({}, base.homographs || {}),
      partOfSpeech: [].concat(base.partOfSpeech || []),
      compoundParts: [],
      pinyin: base.pinyin || "",
      hiragana: base.hiragana || "",
      latinLetters: base.latinLetters || "",
    };
    initializeEntryAuthorship(fresh);
    if (fresh.sourceWorldLine) hideWorldDictionaryLine(fresh.sourceWorldLine);
    entries.push(fresh);
    match.kind = "local";
    match.index = entries.length - 1;
    match.entry = fresh;
    return fresh;
  }

  function applyTxtDictionaryPreview(preview, approvedKeys) {
    let entries = typeof ensureCoreWordsInDictionary === "function"
      ? ensureCoreWordsInDictionary()
      : [];
    const approved = approvedKeys instanceof Set ? approvedKeys : new Set(approvedKeys || []);
    let merged = 0;
    let updated = 0;
    let separated = 0;
    let added = 0;

    const byWordId = new Map();
    function bucket(wordId) {
      const key = String(wordId || "");
      if (!byWordId.has(key)) byWordId.set(key, { rec: null, match: null, word: false, symbols: false });
      return byWordId.get(key);
    }

    (preview.wordChanges || []).forEach((item, i) => {
      if (!approved.has("word:" + i)) return;
      const b = bucket(item.wordId);
      b.word = true;
      b.rec = item.rec;
      b.match = item.match;
    });
    (preview.symbols || []).forEach((item, i) => {
      if (!approved.has("symbols:" + i)) return;
      const b = bucket(item.wordId);
      b.symbols = true;
      b.rec = item.rec;
      b.match = item.match;
      b.incomingCats = item.incoming;
    });

    byWordId.forEach((b) => {
      if (!b.rec || !b.match) return;
      const entry = ensureLocalEntryForMatch(entries, b.match, b.rec);
      if (b.word) {
        applyWordOverwrite(entry, b.rec);
        updated += 1;
      }
      if (b.symbols) {
        applySymbolMerge(entry, b.incomingCats || {
          is: parseSymbolRefs(b.rec.Is),
          unrelated: parseSymbolRefs(b.rec.Unrelated),
          isNot: parseSymbolRefs(b.rec["Isn't"] || b.rec.Isnt),
        });
        merged += 1;
      }
      markEntryEdited(entry);
    });

    (preview.exceptions || []).forEach((item, i) => {
      if (!approved.has("exception:" + i)) return;
      const fresh = recordToEntry(item.rec, allocateNewWordId(entries));
      fresh._entryId = makeEntryId();
      initializeEntryAuthorship(fresh);
      entries.push(fresh);
      separated += 1;
      added += 1;
    });

    (preview.newWords || []).forEach((item, i) => {
      if (!approved.has("new:" + i)) return;
      const incomingId = parseInt(item.rec["ID#"] || item.rec.ID || "0", 10);
      let wordId = Number.isFinite(incomingId) && incomingId > 0 ? incomingId : allocateNewWordId(entries);
      if (findEntryIndexByWordId(entries, wordId) >= 0) wordId = allocateNewWordId(entries);
      if (wordId > getStoredWordIdCounter()) localStorage.setItem(WORD_ID_COUNTER_KEY, String(wordId));
      const fresh = recordToEntry(item.rec, wordId);
      if (!fresh._entryId || findEntryIndexById(entries, fresh._entryId) >= 0) fresh._entryId = makeEntryId();
      initializeEntryAuthorship(fresh);
      if (fresh.sourceWorldLine) hideWorldDictionaryLine(fresh.sourceWorldLine);
      entries.push(fresh);
      added += 1;
    });

    localStorage.setItem("dictionaryEntries", JSON.stringify(entries));
    return { merged, updated, separated, added };
  }

  function importTxtDictionary(records) {
    const preview = previewTxtDictionaryImport(records);
    const keys = new Set();
    (preview.symbols || []).forEach((_, i) => keys.add("symbols:" + i));
    (preview.wordChanges || []).forEach((_, i) => keys.add("word:" + i));
    (preview.exceptions || []).forEach((_, i) => keys.add("exception:" + i));
    (preview.newWords || []).forEach((_, i) => keys.add("new:" + i));
    return applyTxtDictionaryPreview(preview, keys);
  }

  function symbolIdSet(refs) {
    const set = new Set();
    (refs || []).forEach((ref) => {
      if (ref && ref.id != null) set.add(String(ref.id));
    });
    return set;
  }

  function categoriesConflict(localCats, incomingCats) {
    const localIs = symbolIdSet(localCats.is);
    const localUn = symbolIdSet(localCats.unrelated);
    const localNot = symbolIdSet(localCats.isNot);
    const inIs = symbolIdSet(incomingCats.is);
    const inUn = symbolIdSet(incomingCats.unrelated);
    const inNot = symbolIdSet(incomingCats.isNot);
    const conflict = (a, b) => {
      for (const id of a) {
        if (b.has(id)) return true;
      }
      return false;
    };
    // Same symbol cannot live in opposing categories across dictionary vs txt.
    if (conflict(localIs, inNot) || conflict(localNot, inIs)) return true;
    if (conflict(localIs, inUn) || conflict(localUn, inIs)) return true;
    if (conflict(localNot, inUn) || conflict(localUn, inNot)) return true;
    return false;
  }

  function mergeSymbolRefs(a, b) {
    const map = new Map();
    [].concat(a || [], b || []).forEach((ref) => {
      if (!ref || ref.id == null) return;
      const key = String(ref.id);
      if (!map.has(key)) map.set(key, Object.assign({}, ref));
    });
    return Array.from(map.values());
  }

  function recordToEntry(rec, wordId) {
    const languageLang = rec.LanguageWordLang || "en";
    const pairLang = rec.PairWordLang || "de";
    const languageWord = stripStar(rec.LanguageWord || "");
    const pairWord = stripStar(rec.PairWord || "");
    const translations = {};
    translations[languageLang] = languageWord;
    translations[pairLang] = pairWord;
    if (!translations.en && (languageLang === "en" || pairLang === "en")) {
      translations.en = languageLang === "en" ? languageWord : pairWord;
    }
    const cats = {
      is: parseSymbolRefs(rec.Is),
      unrelated: parseSymbolRefs(rec.Unrelated),
      isNot: parseSymbolRefs(rec["Isn't"] || rec.Isnt),
    };
    const homographs = {};
    if (/★/.test(rec.LanguageWord || "")) homographs[languageLang] = true;
    if (/★/.test(rec.PairWord || "")) homographs[pairLang] = true;
    return {
      schemaVersion: 2,
      _entryId: rec.EntryId || makeEntryId(),
      wordId,
      categories: cats,
      stampSymbols: cats.is.slice(0, 4),
      symbols: cats.is.slice(0, 4),
      tempStamp: cats.is.length ? cats.is.slice(0, 4) : null,
      tempstamped: cats.is.length > 0,
      stamped: false,
      definition: translations.en || languageWord || pairWord,
      isCore: false,
      translationSource: languageLang,
      originLanguage: languageLang,
      translationLanguage: pairLang,
      translations,
      sourceWorldLine: rec.SourceWorldLine || "",
      homographs,
      partOfSpeech: String(rec.POS || "").split(/\s*&\s*|\s*,\s*/).filter(Boolean),
      compoundParts: [],
      pinyin: rec.Pinyin || "",
      hiragana: rec.Hiragana || "",
      latinLetters: rec.LatinLetters || "",
      createdBy: rec.FirstCreatedBy || "",
      createdAt: rec.FirstCreatedAt || "",
      lastEditedBy: rec.LastEditedBy || "",
      lastEditedAt: rec.LastEditedAt || "",
    };
  }

  function importTxtSentences(records) {
    const list = typeof loadTransferSentences === "function" ? loadTransferSentences() : [];
    const byId = new Map(list.map((e) => [String(e.id), e]));
    let added = 0;
    let updated = 0;
    records.forEach((rec) => {
      const id = rec.SentenceId || ("wsc_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8));
      let overrides = {};
      try { overrides = JSON.parse(rec.OverridesJson || "{}"); } catch { overrides = {}; }
      const entry = {
        id,
        sentenceText: String(rec.SentenceText || "").replace(/\\n/g, "\n"),
        sentenceNorm: rec.SentenceNorm || "",
        inputLang: rec.InputLang || "en",
        outputLang: rec.OutputLang || "universal",
        overrides,
        createdBy: rec.FirstCreatedBy || "",
        createdAt: rec.FirstCreatedAt || "",
        lastEditedBy: rec.LastEditedBy || "",
        lastEditedAt: rec.LastEditedAt || "",
      };
      if (byId.has(String(id))) {
        Object.assign(byId.get(String(id)), entry);
        updated += 1;
      } else {
        list.push(entry);
        byId.set(String(id), entry);
        added += 1;
      }
    });
    if (typeof saveTransferSentences === "function") saveTransferSentences(list);
    return { added, updated };
  }

  function detectTxtFromFilename(name) {
    const base = String(name || "").replace(/^.*[\\/]/, "").toLowerCase();
    if (!base.endsWith(".txt")) return null;
    return true;
  }

  window.KanjiBuilderTxtTransfer = {
    buildTxtFilename,
    buildTxtExportContent,
    buildTxtExportHeader,
    measureTxtExport,
    streamTxtExport,
    splitTxtExportIntoChunks,
    chunkTxtFilename,
    utf8ByteLength,
    TXT_CHUNK_MAX_BYTES,
    collectDictionaryRecords,
    parseTxtBlocks,
    previewTxtDictionaryImport,
    previewHasChanges,
    applyTxtDictionaryPreview,
    importTxtDictionary,
    importTxtSentences,
    formatSymbolNames,
    detectTxtFromFilename,
    TXT_LANG_FILE_CODE,
  };
})();
