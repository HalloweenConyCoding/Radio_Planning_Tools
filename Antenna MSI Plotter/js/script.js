(function () {
  const folderInput = document.getElementById("folderInput");
  const rotateToggle = document.getElementById("rotateToggle");
  const plotBtn = document.getElementById("plotBtn");
  const statusEl = document.getElementById("status");
  const plotsContainer = document.getElementById("plotsContainer");
  const globalSummary = document.getElementById("globalSummary");

  const sumSelected = document.getElementById("sumSelected");
  const sumUsed = document.getElementById("sumUsed");
  const sumFreq = document.getElementById("sumFreq");
  const sumPlots = document.getElementById("sumPlots");

  // optional tilt-filter controls (works only if present in HTML)
  const tiltFilterBtn = document.getElementById("tiltFilterBtn");
  const tiltPanel = document.getElementById("tiltPanel");
  const tiltAllBtn = document.getElementById("tiltAllBtn");
  const tiltNoneBtn = document.getElementById("tiltNoneBtn");
  const tiltList = document.getElementById("tiltList");
  const tiltHint = document.getElementById("tiltHint");

  const tiltFilterState = {
    available: [],
    selected: new Set()
  };

  // NEW: per-frequency manual tilt offsets
  // shape:
  // {
  //   "1710": { "20": 0, "-2": 1.5, "-11": 0, "-20": -0.5 }
  // }
  const manualTiltOffsetsByFreq = {};

  let parsedResultsCache = [];
  let skippedCache = [];
  let totalSelectedFiles = 0;

  folderInput.addEventListener("change", onFolderSelected);
  plotBtn.addEventListener("click", onPlotClicked);
  rotateToggle.addEventListener("change", rerenderIfReady);

  if (tiltFilterBtn && tiltPanel) {
    tiltFilterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      tiltPanel.classList.toggle("hidden");
    });

    tiltPanel.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.addEventListener("click", () => {
      tiltPanel.classList.add("hidden");
    });
  }

  if (tiltAllBtn) {
    tiltAllBtn.addEventListener("click", () => {
      tiltFilterState.selected = new Set(tiltFilterState.available);
      renderTiltList();
      updateTiltHint();
      rerenderIfReady();
    });
  }

  if (tiltNoneBtn) {
    tiltNoneBtn.addEventListener("click", () => {
      tiltFilterState.selected.clear();
      renderTiltList();
      updateTiltHint();
      rerenderIfReady();
    });
  }

  function onFolderSelected() {
    const files = Array.from(folderInput.files || []);
    const msiFiles = files.filter((f) => /\.msi$/i.test(f.name));

    parsedResultsCache = [];
    skippedCache = [];
    totalSelectedFiles = files.length;

    // reset manual tilt cache
    Object.keys(manualTiltOffsetsByFreq).forEach((k) => delete manualTiltOffsetsByFreq[k]);

    resetTiltFilterUi();
    clearOutput();

    if (!files.length) {
      setStatus("Waiting for folder selection...");
      return;
    }

    setStatus(
      `Folder selected.\nTotal files: ${files.length}\nMSI files found: ${msiFiles.length}\nClick "Plot Folder" to continue.`,
      "good"
    );
  }

  async function onPlotClicked() {
    const files = Array.from(folderInput.files || []);
    const msiFiles = files.filter((f) => /\.msi$/i.test(f.name));

    clearOutput();

    if (!files.length) {
      setStatus("Please select a folder first.", "warn");
      return;
    }

    if (!msiFiles.length) {
      setStatus("No .msi files found in the selected folder.", "bad");
      return;
    }

    plotBtn.disabled = true;
    setStatus(`Reading ${msiFiles.length} MSI file(s)...`, "good");

    try {
      const parsedResults = [];
      const skipped = [];

      for (const file of msiFiles) {
        try {
          const text = await MSIParser.readFileSmart(file);
          const parsed = MSIParser.parseMsiText(text, file.name);

          const hasH = Object.keys(parsed.sections.H.pattern).length > 0;
          const hasV = Object.keys(parsed.sections.V.pattern).length > 0;
          const hasFreq = parsed.meta.FREQUENCY !== "";

          if (!hasFreq || (!hasH && !hasV)) {
            skipped.push(`${file.name} -> missing frequency or pattern`);
            continue;
          }

          parsedResults.push(parsed);
        } catch (err) {
          skipped.push(`${file.name} -> parse error`);
          console.error(err);
        }
      }

      if (!parsedResults.length) {
        setStatus("No valid MSI file could be plotted.", "bad");
        plotBtn.disabled = false;
        return;
      }

      parsedResultsCache = parsedResults;
      skippedCache = skipped;
      totalSelectedFiles = files.length;

      initTiltFilter(parsedResultsCache);
      await renderCurrentView();
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong while plotting.", "bad");
    } finally {
      plotBtn.disabled = false;
    }
  }

  async function renderCurrentView() {
    clearOutput();

    if (!parsedResultsCache.length) {
      setStatus("No parsed MSI data available.", "warn");
      return;
    }

    const filteredResults = applyTiltFilter(parsedResultsCache);

    if (!filteredResults.length) {
      updateGlobalSummary({
        selected: totalSelectedFiles,
        used: 0,
        freqCount: 0,
        plotCount: 0
      });
      globalSummary.classList.remove("hidden");

      let msg =
        `No plot matches current tilt selection.` +
        `\nParsed MSI files: ${parsedResultsCache.length}` +
        `\nTilt filter: ${getTiltFilterSummary()}`;

      if (skippedCache.length) {
        msg += `\nSkipped: ${skippedCache.length}`;
      }

      setStatus(msg, "warn");
      return;
    }

    const grouped = groupByFrequency(filteredResults, !!rotateToggle.checked);
    const freqs = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b);

    let plotCount = 0;

    for (const freq of freqs) {
      const band = grouped[freq];
      const block = createFrequencyBlock(freq, band);
      plotsContainer.appendChild(block.root);

      const rotateVertical = !!rotateToggle.checked || hasManualTiltOffsetForBand(freq);

      if (band.H.length) {
        await MSIPlotter.renderPlot(block.hPlot, band.H, {
          zeroDirection: "N",
          rotateEnabled: false
        });
        plotCount++;
      }

      if (band.V.length) {
        await MSIPlotter.renderPlot(block.vPlot, band.V, {
          zeroDirection: "E",
          rotateEnabled: rotateVertical
        });
        plotCount++;
      }

      fillBandSummary(block.summaryWrap, band, freq);
      bindCopyButtons(block, freq);
    }

    updateGlobalSummary({
      selected: totalSelectedFiles,
      used: filteredResults.length,
      freqCount: freqs.length,
      plotCount
    });

    let doneText =
      `Done.` +
      `\nSelected files: ${totalSelectedFiles}` +
      `\nMSI files parsed: ${parsedResultsCache.length}` +
      `\nMSI files currently plotted: ${filteredResults.length}` +
      `\nFrequencies shown: ${freqs.length}` +
      `\nPlots created: ${plotCount}`;

    if (tiltHint) {
      doneText += `\nTilt filter: ${getTiltFilterSummary()}`;
    }

    if (skippedCache.length) {
      doneText += `\nSkipped: ${skippedCache.length}`;
    }

    setStatus(doneText, "good");
  }

  function rerenderIfReady() {
    if (!parsedResultsCache.length) return;

    renderCurrentView().catch((err) => {
      console.error(err);
      setStatus("Something went wrong while refreshing the plots.", "bad");
    });
  }

  function resetTiltFilterUi() {
    tiltFilterState.available = [];
    tiltFilterState.selected = new Set();
    renderTiltList();
    updateTiltHint();

    if (tiltPanel) {
      tiltPanel.classList.add("hidden");
    }
  }

  function initTiltFilter(parsedResults) {
    tiltFilterState.available = getAvailableTiltKeys(parsedResults);
    tiltFilterState.selected = new Set(tiltFilterState.available);
    renderTiltList();
    updateTiltHint();
  }

  function getAvailableTiltKeys(parsedResults) {
    const keys = [
      ...new Set(parsedResults.map((item) => tiltKeyFromValue(item.meta.TILT_VALUE)))
    ];

    return keys.sort((a, b) => {
      if (a === "NO_TILT") return 1;
      if (b === "NO_TILT") return -1;
      return Number(a) - Number(b);
    });
  }

  function tiltKeyFromValue(value) {
    if (value === null || value === undefined || value === "") {
      return "NO_TILT";
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
      return String(value).trim();
    }

    return formatNumber(num);
  }

  function tiltLabelFromKey(key) {
    if (key === "NO_TILT") return "No Tilt";
    return `Tilt ${key}`;
  }

  function renderTiltList() {
    if (!tiltList) return;

    tiltList.innerHTML = "";

    if (!tiltFilterState.available.length) {
      tiltList.innerHTML = `<div class="tilt-empty">No tilt values yet</div>`;
      return;
    }

    for (const key of tiltFilterState.available) {
      const row = document.createElement("label");
      row.className = "tilt-option";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = tiltFilterState.selected.has(key);

      cb.addEventListener("change", () => {
        if (cb.checked) {
          tiltFilterState.selected.add(key);
        } else {
          tiltFilterState.selected.delete(key);
        }

        updateTiltHint();
        rerenderIfReady();
      });

      const text = document.createElement("span");
      text.textContent = tiltLabelFromKey(key);

      row.appendChild(cb);
      row.appendChild(text);
      tiltList.appendChild(row);
    }
  }

  function updateTiltHint() {
    if (!tiltHint) return;
    tiltHint.textContent = getTiltFilterSummary();
  }

  function getTiltFilterSummary() {
    const available = tiltFilterState.available;
    const selected = [...tiltFilterState.selected];

    if (!available.length) return "All tilts";
    if (selected.length === available.length) return "All tilts";
    if (!selected.length) return "None";

    const labels = selected
      .sort((a, b) => {
        if (a === "NO_TILT") return 1;
        if (b === "NO_TILT") return -1;
        return Number(a) - Number(b);
      })
      .map(tiltLabelFromKey);

    if (labels.length <= 4) {
      return labels.join(", ");
    }

    return `${labels.slice(0, 4).join(", ")} +${labels.length - 4} more`;
  }

  function applyTiltFilter(parsedResults) {
    if (!tiltFilterState.available.length) {
      return parsedResults.slice();
    }

    if (!tiltFilterState.selected.size) {
      return [];
    }

    return parsedResults.filter((item) => {
      const key = tiltKeyFromValue(item.meta.TILT_VALUE);
      return tiltFilterState.selected.has(key);
    });
  }

  function groupByFrequency(parsedResults, useDetectedBase = true) {
    const grouped = {};

    for (const item of parsedResults) {
      const freq = parseInt(item.meta.FREQUENCY, 10);
      if (Number.isNaN(freq)) continue;

      if (!grouped[freq]) {
        grouped[freq] = {
          H: [],
          V: [],
          metas: []
        };
      }

      grouped[freq].metas.push(item.meta);

      // apply manual tilt offset per frequency + detected tilt group
      const adjustedMeta = {
        ...item.meta,
        TILT_VALUE: getEffectiveTiltValue(freq, item.meta.TILT_VALUE, useDetectedBase)
      };
      
      const label = buildTraceLabel(adjustedMeta, item.fileName);

      if (Object.keys(item.sections.H.pattern).length) {
        grouped[freq].H.push({
          label,
          meta: adjustedMeta,
          pattern: item.sections.H.pattern,
          fileName: item.fileName
        });
      }

      if (Object.keys(item.sections.V.pattern).length) {
        grouped[freq].V.push({
          label,
          meta: adjustedMeta,
          pattern: item.sections.V.pattern,
          fileName: item.fileName
        });
      }
    }

    return grouped;
  }

  function buildTraceLabel(meta, fileName) {
    const parts = [];

    if (meta.MODEL) parts.push(shorten(meta.MODEL, 40));

    if (meta.POLARIZATION && looksSafeText(meta.POLARIZATION)) {
      parts.push(meta.POLARIZATION);
    }

    if (meta.TILT_VALUE !== null) {
      parts.push(`Tilt ${formatNumber(meta.TILT_VALUE)}`);
    } else if (meta.TILT_RAW) {
      parts.push(meta.TILT_RAW);
    }

    if (!parts.length) {
      parts.push(fileName);
    }

    return parts.join(" | ");
  }

  function createFrequencyBlock(freq, band) {
    const root = document.createElement("div");
    root.className = "freq-block";

    const head = document.createElement("div");
    head.className = "freq-head";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="freq-title">${freq} MHz</div>
      <div class="freq-subtitle">${band.H.length} horizontal trace(s) • ${band.V.length} vertical trace(s)</div>
    `;

    head.appendChild(left);
    root.appendChild(head);

    const plotGrid = document.createElement("div");
    plotGrid.className = "plot-grid";

    const hCard = createPlotCard("Horizontal Pattern");
    const vCard = createPlotCard(
      rotateToggle.checked ? "Vertical Pattern (Tilt Adjusted)" : "Vertical Pattern"
    );

    plotGrid.appendChild(hCard.card);
    plotGrid.appendChild(vCard.card);
    root.appendChild(plotGrid);

    const summaryWrap = document.createElement("div");
    summaryWrap.className = "band-summary";
    root.appendChild(summaryWrap);

    return {
      root,
      hPlot: hCard.plot,
      vPlot: vCard.plot,
      hCopyBtn: hCard.copyBtn,
      vCopyBtn: vCard.copyBtn,
      summaryWrap
    };
  }

  function createPlotCard(title) {
    const card = document.createElement("div");
    card.className = "plot-card";

    const head = document.createElement("div");
    head.className = "plot-card-head";

    const titleEl = document.createElement("div");
    titleEl.className = "plot-card-title";
    titleEl.textContent = title;

    const actions = document.createElement("div");
    actions.className = "plot-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "small-btn copy-btn";
    copyBtn.textContent = "Copy PNG";

    actions.appendChild(copyBtn);
    head.appendChild(titleEl);
    head.appendChild(actions);

    const wrap = document.createElement("div");
    wrap.className = "plot-wrap";

    const plot = document.createElement("div");
    plot.className = "plot";

    wrap.appendChild(plot);
    card.appendChild(head);
    card.appendChild(wrap);

    return { card, plot, copyBtn };
  }

  function bindCopyButtons(block, freq) {
    block.hCopyBtn.addEventListener("click", async () => {
      try {
        const result = await MSIPlotter.copyPlotAsWhitePng(block.hPlot, "N");
        setStatus(
          result.mode === "clipboard"
            ? `Copied horizontal ${freq} MHz plot to clipboard.`
            : `Clipboard not available. Downloaded horizontal ${freq} MHz plot instead.`,
          "good"
        );
      } catch (err) {
        console.error(err);
        setStatus(`Could not copy horizontal ${freq} MHz plot.`, "bad");
      }
    });

    block.vCopyBtn.addEventListener("click", async () => {
      try {
        const result = await MSIPlotter.copyPlotAsWhitePng(block.vPlot, "E");
        setStatus(
          result.mode === "clipboard"
            ? `Copied vertical ${freq} MHz plot to clipboard.`
            : `Clipboard not available. Downloaded vertical ${freq} MHz plot instead.`,
          "good"
        );
      } catch (err) {
        console.error(err);
        setStatus(`Could not copy vertical ${freq} MHz plot.`, "bad");
      }
    });
  }

  function fillBandSummary(container, band, freq) {
    const adjustedMetas = band.metas.map((m) => ({
      ...m,
      TILT_VALUE: getEffectiveTiltValue(freq, m.TILT_VALUE, !!rotateToggle.checked)
    }));
  
    const meta = summarizeBandMeta(adjustedMetas);

    const rows = [
      ["Vendor", meta.VENDOR],
      ["Model", meta.MODEL],
      ["Gain", meta.GAIN],
      ["Tilt field", meta.TILT_RAW],
      ["Detected rotation tilt", meta.TILT_VALUE],
      ["Tilt source", meta.TILT_SOURCE],
      ["HBW", meta.HBW],
      ["VBW", meta.VBW],
      ["Polarization", meta.POLARIZATION],
      ["FBR", meta.FBR],
      ["Comment", meta.COMMENT],
      ["Horizontal plot label", meta.HBW_PLOT],
      ["Vertical plot label", meta.VBW_PLOT]
    ].filter((item) => item[1]);

    container.innerHTML = `
      <div class="band-summary-title">Band Summary</div>
      <div class="meta-grid"></div>
    `;

    const grid = container.querySelector(".meta-grid");

    for (const [key, value] of rows) {
      const item = document.createElement("div");
      item.className = "meta-item";
      item.innerHTML = `
        <div class="meta-key">${key}</div>
        <div class="meta-value">${escapeHtml(String(value))}</div>
      `;
      grid.appendChild(item);
    }

    renderManualTiltSection(container, band, freq);
  }

  function renderManualTiltSection(container, band, freq) {
    const tiltKeys = getBandDetectedTiltKeys(band.metas);
    if (!tiltKeys.length) return;
  
    ensureManualTiltOffsets(freq, tiltKeys);
  
    const section = document.createElement("div");
    section.className = "manual-tilt-section";
  
    const title = document.createElement("div");
    title.className = "manual-tilt-title";
    title.textContent = "Manual Tilt";
  
    const grid = document.createElement("div");
    grid.className = "manual-tilt-grid";
  
    for (const key of tiltKeys) {
      const item = document.createElement("div");
      item.className = "manual-tilt-item";
  
      const displayTilt = formatNumber(
        getEffectiveTiltValue(freq, Number(key), !!rotateToggle.checked)
      );
  
      const label = document.createElement("div");
      label.className = "manual-tilt-label";
      label.textContent = `Offset for Tilt ${displayTilt}`;
  
      const input = document.createElement("input");
      input.className = "manual-tilt-input";
      input.type = "number";
      input.step = "0.1";
      input.value = formatNumber(getManualTiltOffset(freq, key)) || "0";
      input.placeholder = "0";
  
      const applyManualTiltChange = async () => {
        setManualTiltOffset(freq, key, input.value);
  
        try {
          await renderCurrentView();
        } catch (err) {
          console.error(err);
          setStatus("Something went wrong while refreshing the plots.", "bad");
        }
      };
  
      input.addEventListener("change", applyManualTiltChange);
  
      input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          await applyManualTiltChange();
        }
      });
  
      const help = document.createElement("div");
      help.className = "manual-tilt-help";
      help.textContent = rotateToggle.checked
        ? `Applied tilt = detected ${key} - offset`
        : `Applied tilt = -offset`;
  
      item.appendChild(label);
      item.appendChild(input);
      item.appendChild(help);
      grid.appendChild(item);
    }
  
    section.appendChild(title);
    section.appendChild(grid);
    container.appendChild(section);
  }

  function getBandDetectedTiltKeys(metas) {
    const uniq = [
      ...new Set(
        metas
          .map((m) => manualTiltKeyFromValue(m.TILT_VALUE))
          .filter((key) => key !== "NO_TILT")
      )
    ];
  
    return uniq.sort((a, b) => Number(a) - Number(b));
  }

  function manualTiltKeyFromValue(value) {
    if (value === null || value === undefined || value === "") {
      return "NO_TILT";
    }

    const num = Number(value);
    if (Number.isNaN(num)) {
      return String(value).trim();
    }

    return formatNumber(num);
  }

  function ensureManualTiltOffsets(freq, tiltKeys) {
    const freqKey = String(freq);

    if (!manualTiltOffsetsByFreq[freqKey]) {
      manualTiltOffsetsByFreq[freqKey] = {};
    }

    for (const key of tiltKeys) {
      if (!(key in manualTiltOffsetsByFreq[freqKey])) {
        manualTiltOffsetsByFreq[freqKey][key] = 0;
      }
    }
  }

  function getManualTiltOffset(freq, tiltKey) {
    const freqKey = String(freq);
    return manualTiltOffsetsByFreq[freqKey]?.[tiltKey] ?? 0;
  }

  function setManualTiltOffset(freq, tiltKey, rawValue) {
    const freqKey = String(freq);

    if (!manualTiltOffsetsByFreq[freqKey]) {
      manualTiltOffsetsByFreq[freqKey] = {};
    }

    const num = parseFloat(rawValue);
    manualTiltOffsetsByFreq[freqKey][tiltKey] = Number.isNaN(num) ? 0 : num;
  }

  function hasManualTiltOffsetForBand(freq) {
    const freqKey = String(freq);
    const offsets = manualTiltOffsetsByFreq[freqKey];
    if (!offsets) return false;
  
    return Object.values(offsets).some((v) => Math.abs(Number(v) || 0) > 0);
  }
  
  function getEffectiveTiltValue(freq, detectedTiltValue, useDetectedBase = true) {
    if (detectedTiltValue === null || detectedTiltValue === undefined || detectedTiltValue === "") {
      return detectedTiltValue;
    }
  
    const detectedNum = Number(detectedTiltValue);
    if (Number.isNaN(detectedNum)) {
      return detectedTiltValue;
    }
  
    const tiltKey = manualTiltKeyFromValue(detectedTiltValue);
    const offset = getManualTiltOffset(freq, tiltKey);
  
    // Auto Adjust Tilt OFF:
    // use manual value only
    if (!useDetectedBase) {
      return -offset;
    }
  
    // Auto Adjust Tilt ON:
    // invert manual direction: +10 behaves like -10
    return detectedNum - offset;
  }

  function summarizeBandMeta(metas) {
    return {
      VENDOR: joinUnique(metas.map((m) => m.VENDOR)),
      MODEL: joinUnique(metas.map((m) => m.MODEL)),
      GAIN: joinUnique(metas.map((m) => m.GAIN)),
      TILT_RAW: joinUnique(metas.map((m) => m.TILT_RAW)),
      TILT_VALUE: joinUnique(
        metas.map((m) => (m.TILT_VALUE === null ? "" : formatNumber(m.TILT_VALUE)))
      ),
      TILT_SOURCE: joinUnique(metas.map((m) => m.TILT_SOURCE)),
      HBW: joinUnique(metas.map((m) => m.HBW)),
      VBW: joinUnique(metas.map((m) => m.VBW)),
      POLARIZATION: joinUnique(
        metas.map((m) => (looksSafeText(m.POLARIZATION) ? m.POLARIZATION : ""))
      ),
      FBR: joinUnique(metas.map((m) => m.FBR)),
      COMMENT: joinUnique(metas.map((m) => shorten(m.COMMENT, 90))),
      HBW_PLOT: joinUnique(metas.map((m) => m.HBW_PLOT)),
      VBW_PLOT: joinUnique(metas.map((m) => m.VBW_PLOT))
    };
  }

  function joinUnique(values) {
    const cleaned = values
      .map((v) => String(v || "").trim())
      .filter(Boolean);

    if (!cleaned.length) return "";

    const uniq = [...new Set(cleaned)];

    if (uniq.length <= 4) {
      return uniq.join(" | ");
    }

    return `${uniq.slice(0, 4).join(" | ")} | +${uniq.length - 4} more`;
  }

  function updateGlobalSummary({ selected, used, freqCount, plotCount }) {
    sumSelected.textContent = selected;
    sumUsed.textContent = used;
    sumFreq.textContent = freqCount;
    sumPlots.textContent = plotCount;
    globalSummary.classList.remove("hidden");
  }

  function clearOutput() {
    plotsContainer.innerHTML = "";
    globalSummary.classList.add("hidden");
  }

  function setStatus(message, cls = "") {
    statusEl.className = `status ${cls}`.trim();
    statusEl.textContent = message;
  }

  function formatNumber(num) {
    const n = Number(num);
    if (Number.isNaN(n)) return "";
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  }

  function shorten(text, max = 50) {
    const str = String(text || "").trim();
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + "…";
  }

  function looksSafeText(value) {
    const str = String(value || "").trim();
    if (!str) return false;

    return !/[^\u0000-\u007F]/.test(str) || /[+\-]?\d+/.test(str);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
})();