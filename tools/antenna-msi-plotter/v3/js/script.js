(function () {
  const folderInput = document.getElementById("folderInput");
  const rotateToggle = document.getElementById("rotateToggle");
  const plotBtn = document.getElementById("plotBtn");
  const folderSelectionInfo = document.getElementById("folderSelectionInfo");
  const statusEl = document.getElementById("status");
  const plotsContainer = document.getElementById("plotsContainer");
  const globalSummary = document.getElementById("globalSummary");
  const observatoryStatusText = document.getElementById("observatoryStatusText");
  const scanSummaryText = document.getElementById("scanSummaryText");
  const scanUpdatedText = document.getElementById("scanUpdatedText");
  const frequencyNavTrigger = document.getElementById("frequencyNavTrigger");
  const frequencyFlyout = document.getElementById("frequencyFlyout");
  const frequencyFlyoutList = document.getElementById("frequencyFlyoutList");
  const frequencyFlyoutCount = document.getElementById("frequencyFlyoutCount");

  const sumSelected = document.getElementById("sumSelected");
  const sumUsed = document.getElementById("sumUsed");
  const sumFreq = document.getElementById("sumFreq");
  const sumPlots = document.getElementById("sumPlots");
  const sumTilt = document.getElementById("sumTilt");

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

  // shape: { "1710": { "20": 0, "-2": 1.5 } }
  const manualTiltOffsetsByFreq = {};

  // shape: { "1710": { hbwStart:null, hbwStop:null, vbwBeam1Start:null, vbwBeam1Stop:null, vbwBeam2Start:null, vbwBeam2Stop:null } }
  const manualGuideLinesByFreq = {};

  let parsedResultsCache = [];
  let skippedCache = [];
  let totalSelectedFiles = 0;
  let currentFrequencyNav = null;
  let autoPlotInProgress = false;

  folderInput.addEventListener("change", onFolderSelected);
  plotBtn.addEventListener("click", onPlotClicked);
  rotateToggle.addEventListener("change", rerenderIfReady);

  initFrequencyNavigation();

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

  async function onFolderSelected() {
    const files = Array.from(folderInput.files || []);
    const msiFiles = files.filter((f) => /\.msi$/i.test(f.name));

    parsedResultsCache = [];
    skippedCache = [];
    totalSelectedFiles = files.length;

    clearObject(manualTiltOffsetsByFreq);
    clearObject(manualGuideLinesByFreq);

    resetTiltFilterUi();
    clearOutput();
    updateFrequencyNavigation([]);
    updateLastScanSummary(null);
    updateFolderSelectionUi(files.length);

    if (!files.length) {
      plotBtn.textContent = "Replot Folder";
      setStatus("Waiting for folder selection...");
      return;
    }

    plotBtn.textContent = "Replot Folder";
    setStatus(
      `Folder selected.\nTotal files: ${files.length}\nMSI files found: ${msiFiles.length}\nAwaiting browser confirmation if prompted.\nPlotting starts automatically.`,
      "good"
    );

    if (autoPlotInProgress) return;
    autoPlotInProgress = true;
    try {
      await onPlotClicked();
    } finally {
      autoPlotInProgress = false;
    }
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
      updateFrequencyNavigation([]);
      updateLastScanSummary(null);
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
      updateFrequencyNavigation([]);
      updateLastScanSummary({
        selected: totalSelectedFiles,
        used: 0,
        freqCount: 0,
        plotCount: 0
      });

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

    updateFrequencyNavigation(freqs);

    let plotCount = 0;

    for (const freq of freqs) {
      const band = grouped[freq];
      const block = createFrequencyBlock(freq, band);
      plotsContainer.appendChild(block.root);

      block.refreshBtn.addEventListener("click", async () => {
        await rerenderIfReady();
      });

      const rotateVertical = !!rotateToggle.checked || hasManualTiltOffsetForBand(freq);

      if (band.H.length) {
        await MSIPlotter.renderPlot(block.hPlot, band.H, {
          zeroDirection: "N",
          rotateEnabled: false,
          guideAngles: getManualGuideAngles(freq, "H")
        });
        plotCount++;
      }

      if (band.V.length) {
        await MSIPlotter.renderPlot(block.vPlot, band.V, {
          zeroDirection: "E",
          rotateEnabled: rotateVertical,
          guideAngles: getManualGuideAngles(freq, "V")
        });
        plotCount++;
      }

      fillBandSummary(block.summaryWrap, band, freq);
      renderManualTiltSection(block.manualTiltWrap, band, freq);
      renderManualReadLineSection(block.manualReadWrap, freq);
      bindCopyButtons(block, freq);
    }

    updateGlobalSummary({
      selected: totalSelectedFiles,
      used: filteredResults.length,
      freqCount: freqs.length,
      plotCount
    });
    updateLastScanSummary({
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

  async function rerenderIfReady() {
    if (!parsedResultsCache.length) return;

    try {
      await renderCurrentView();
    } catch (err) {
      console.error(err);
      setStatus("Something went wrong while refreshing the plots.", "bad");
    }
  }

  function initFrequencyNavigation() {
    updateFrequencyNavigation([]);

    if (!frequencyNavTrigger || !frequencyFlyout) return;

    frequencyNavTrigger.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleFrequencyFlyout();
    });

    frequencyFlyout.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    document.addEventListener("click", () => {
      closeFrequencyFlyout();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeFrequencyFlyout();
      }
    });
  }

  function updateFrequencyNavigation(freqs) {
    if (!frequencyFlyoutList || !frequencyFlyoutCount) return;

    const normalizedFreqs = [...new Set(freqs.map(Number).filter((freq) => !Number.isNaN(freq)))]
      .sort((a, b) => a - b);

    frequencyFlyoutList.innerHTML = "";
    frequencyFlyoutCount.textContent = normalizedFreqs.length
      ? `${normalizedFreqs.length} bands`
      : "No scan";

    if (!normalizedFreqs.length) {
      currentFrequencyNav = null;
      frequencyFlyoutList.innerHTML = `<div class="frequency-empty">Plot a folder to load frequencies.</div>`;
      updateFrequencyNavActiveState();
      return;
    }

    const allButton = document.createElement("button");
    allButton.type = "button";
    allButton.className = "frequency-flyout-item";
    allButton.dataset.freqTarget = "all";
    allButton.setAttribute("role", "menuitem");
    allButton.innerHTML = `
      <span class="frequency-node" aria-hidden="true"></span>
      <span class="frequency-label">All Bands</span>
      <span class="frequency-meta">${normalizedFreqs.length}</span>
    `;
    allButton.addEventListener("click", () => {
      currentFrequencyNav = null;
      scrollToFrequency(null);
      updateFrequencyNavActiveState();
      closeFrequencyFlyout();
    });
    frequencyFlyoutList.appendChild(allButton);

    for (const freq of normalizedFreqs) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "frequency-flyout-item";
      item.dataset.freqTarget = String(freq);
      item.setAttribute("role", "menuitem");
      item.innerHTML = `
        <span class="frequency-node" aria-hidden="true"></span>
        <span class="frequency-label">${freq} MHz</span>
        <span class="frequency-meta">band</span>
      `;
      item.addEventListener("click", () => {
        currentFrequencyNav = String(freq);
        scrollToFrequency(freq);
        updateFrequencyNavActiveState();
        closeFrequencyFlyout();
      });
      frequencyFlyoutList.appendChild(item);
    }

    if (currentFrequencyNav && !normalizedFreqs.includes(Number(currentFrequencyNav))) {
      currentFrequencyNav = null;
    }

    updateFrequencyNavActiveState();
  }

  function scrollToFrequency(freq) {
    const target = freq
      ? document.getElementById(`freq-panel-${freq}`)
      : plotsContainer.querySelector(".freq-console");

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function toggleFrequencyFlyout() {
    if (!frequencyFlyout || !frequencyNavTrigger) return;
    const isOpen = frequencyFlyout.classList.toggle("is-open");
    frequencyNavTrigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
  }

  function closeFrequencyFlyout() {
    if (!frequencyFlyout || !frequencyNavTrigger) return;
    frequencyFlyout.classList.remove("is-open");
    frequencyNavTrigger.setAttribute("aria-expanded", "false");
  }

  function updateFrequencyNavActiveState() {
    if (!frequencyFlyoutList) return;

    for (const item of frequencyFlyoutList.querySelectorAll(".frequency-flyout-item")) {
      const isActive = item.dataset.freqTarget === (currentFrequencyNav || "all");
      item.classList.toggle("is-current", isActive);
      item.setAttribute("aria-current", isActive ? "true" : "false");
    }
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

    if (meta.MODEL) parts.push(shorten(meta.MODEL, 42));

    if (meta.POLARIZATION && looksSafeText(meta.POLARIZATION)) {
      parts.push(meta.POLARIZATION);
    }

    if (meta.TILT_VALUE !== null) {
      parts.push(`Trk ${formatNumber(meta.TILT_VALUE)}`);
    } else if (meta.TILT_RAW) {
      parts.push(meta.TILT_RAW);
    }

    if (!parts.length) {
      parts.push(fileName);
    }

    return parts.join(" | ");
  }

  function createFrequencyBlock(freq, band) {
    const root = document.createElement("article");
    root.className = "freq-console";
    root.id = `freq-panel-${freq}`;
    root.dataset.frequency = String(freq);

    const head = document.createElement("div");
    head.className = "freq-head";

    const left = document.createElement("div");
    left.innerHTML = `
      <div class="freq-title-wrap">
        <span class="freq-star" aria-hidden="true"></span>
        <div class="freq-title">${freq} MHz</div>
      </div>
      <div class="freq-subtitle">${band.H.length} horizontal traces | ${band.V.length} vertical traces</div>
    `;

    const refreshBtn = document.createElement("button");
    refreshBtn.className = "small-btn";
    refreshBtn.type = "button";
    refreshBtn.textContent = "Refresh Data";

    const updated = document.createElement("div");
    updated.className = "last-updated";
    updated.innerHTML = `
      <div class="last-updated-label">Last Updated</div>
      <div class="last-updated-value">${formatTimestamp(new Date())}</div>
    `;

    const actions = document.createElement("div");
    actions.className = "freq-actions";
    actions.appendChild(refreshBtn);
    actions.appendChild(updated);

    head.appendChild(left);
    head.appendChild(actions);
    root.appendChild(head);

    const stage = document.createElement("div");
    stage.className = "plot-stage";

    const hPanel = createPlotStagePanel("Horizontal Pattern");
    const vPanel = createPlotStagePanel(
      rotateToggle.checked ? "Vertical Pattern (Tilt Adjusted)" : "Vertical Pattern"
    );

    stage.appendChild(hPanel.panel);
    stage.appendChild(vPanel.panel);
    root.appendChild(stage);

    const summaryWrap = document.createElement("div");
    summaryWrap.className = "meta-readout";
    root.appendChild(summaryWrap);

    const manualTiltWrap = document.createElement("section");
    manualTiltWrap.className = "integrated-section";
    root.appendChild(manualTiltWrap);

    const manualReadWrap = document.createElement("section");
    manualReadWrap.className = "integrated-section";
    root.appendChild(manualReadWrap);

    return {
      root,
      refreshBtn,
      hPlot: hPanel.plot,
      vPlot: vPanel.plot,
      hCopyBtn: hPanel.copyBtn,
      vCopyBtn: vPanel.copyBtn,
      summaryWrap,
      manualTiltWrap,
      manualReadWrap
    };
  }

  function createPlotStagePanel(title) {
    const panel = document.createElement("section");
    panel.className = "plot-stage-panel";

    const head = document.createElement("div");
    head.className = "plot-stage-head";

    const titleEl = document.createElement("h3");
    titleEl.className = "plot-stage-title";
    titleEl.textContent = title;

    const copyBtn = document.createElement("button");
    copyBtn.className = "small-btn copy-btn";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy PNG";

    head.appendChild(titleEl);
    head.appendChild(copyBtn);

    const wrap = document.createElement("div");
    wrap.className = "plot-wrap";

    const plot = document.createElement("div");
    plot.className = "plot";

    wrap.appendChild(plot);
    panel.appendChild(head);
    panel.appendChild(wrap);

    return {
      panel,
      plot,
      copyBtn
    };
  }

  function bindCopyButtons(block, freq) {
    block.hCopyBtn.addEventListener("click", async () => {
      try {
        const result = await MSIPlotter.copyPlotAsWhitePng(block.hPlot, "N");
        setStatus(
          result.mode === "clipboard"
            ? `Copied horizontal ${freq} MHz plot to clipboard.`
            : `Clipboard unavailable. Downloaded horizontal ${freq} MHz plot instead.`,
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
            : `Clipboard unavailable. Downloaded vertical ${freq} MHz plot instead.`,
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
      ["Model", meta.MODEL],
      ["Gain", meta.GAIN],
      ["Tilt field", meta.TILT_RAW],
      ["Detected rotation tilt", meta.TILT_VALUE],
      ["Tilt source", meta.TILT_SOURCE],
      ["Horizontal plot label", meta.HBW_PLOT],
      ["Vertical plot label", meta.VBW_PLOT]
    ];

    container.innerHTML = `<div class="meta-strip"></div>`;
    const strip = container.querySelector(".meta-strip");

    for (const [key, value] of rows) {
      const cell = document.createElement("div");
      cell.className = "meta-cell";
      cell.innerHTML = `
        <div class="meta-key">${escapeHtml(key)}</div>
        <div class="meta-value">${escapeHtml(value || "-")}</div>
      `;
      strip.appendChild(cell);
    }
  }

  function renderManualTiltSection(container, band, freq) {
    const tiltKeys = getBandDetectedTiltKeys(band.metas);

    if (!tiltKeys.length) {
      container.innerHTML = "";
      return;
    }

    ensureManualTiltOffsets(freq, tiltKeys);

    container.innerHTML = `
      <h4 class="section-title">Manual Tilt Calibration</h4>
      <div class="manual-tilt-grid"></div>
    `;

    const grid = container.querySelector(".manual-tilt-grid");

    for (const key of tiltKeys) {
      const item = document.createElement("div");
      item.className = "manual-tilt-item";

      const label = document.createElement("label");
      label.className = "manual-label";
      label.textContent = `Offset for Tilt ${key}`;

      const input = document.createElement("input");
      input.className = "manual-tilt-input";
      input.type = "number";
      input.step = "0.1";
      input.value = String(getManualTiltOffset(freq, key));
      input.placeholder = "0";

      const help = document.createElement("div");
      help.className = "manual-help";
      help.textContent = rotateToggle.checked
        ? `Applied tilt = detected ${key} - offset`
        : "Applied tilt = -offset";

      const applyManualTiltChange = async () => {
        setManualTiltOffset(freq, key, input.value);
        await rerenderIfReady();
      };

      input.addEventListener("change", applyManualTiltChange);
      input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          await applyManualTiltChange();
        }
      });

      item.appendChild(label);
      item.appendChild(input);
      item.appendChild(help);
      grid.appendChild(item);
    }
  }

  function renderManualReadLineSection(container, freq) {
    ensureManualGuideLines(freq);
    const guideConfig = manualGuideLinesByFreq[String(freq)];

    container.innerHTML = `
      <h4 class="section-title">Manual Read Line</h4>
      <div class="manual-read-grid">
        ${buildManualReadInput("HBW Start", "hbwStart", guideConfig.hbwStart, freq)}
        ${buildManualReadInput("HBW Stop", "hbwStop", guideConfig.hbwStop, freq)}
        ${buildManualReadInput("Start VBW Beam 1", "vbwBeam1Start", guideConfig.vbwBeam1Start, freq)}
        ${buildManualReadInput("Stop VBW Beam 1", "vbwBeam1Stop", guideConfig.vbwBeam1Stop, freq)}
        ${buildManualReadInput("Start VBW Beam 2", "vbwBeam2Start", guideConfig.vbwBeam2Start, freq)}
        ${buildManualReadInput("Stop VBW Beam 2", "vbwBeam2Stop", guideConfig.vbwBeam2Stop, freq)}
      </div>
      <div class="manual-line-actions">
        <button type="button" class="small-btn" data-manual-read-update>Update Guide Lines</button>
        <small>Blank = hide line, 0 = draw at 0°, -20 and 340 map to the same direction.</small>
      </div>
    `;

    const fields = [
      "hbwStart",
      "hbwStop",
      "vbwBeam1Start",
      "vbwBeam1Stop",
      "vbwBeam2Start",
      "vbwBeam2Stop"
    ];

    const applyGuideChanges = async () => {
      for (const field of fields) {
        const input = container.querySelector(`[data-manual-field="${field}"]`);
        setManualGuideLine(freq, field, parseManualAngleInput(input?.value));
      }

      await rerenderIfReady();
    };

    const updateBtn = container.querySelector("[data-manual-read-update]");
    if (updateBtn) {
      updateBtn.addEventListener("click", applyGuideChanges);
    }

    for (const field of fields) {
      const input = container.querySelector(`[data-manual-field="${field}"]`);
      if (!input) continue;

      input.addEventListener("keydown", async (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          await applyGuideChanges();
        }
      });
    }
  }

  function buildManualReadInput(label, fieldKey, value, freq) {
    const val = value === null ? "" : formatNumber(value);
    const inputId = `manual-${freq}-${fieldKey}`;

    return `
      <div class="manual-read-item">
        <label class="manual-label" for="${escapeHtml(inputId)}">${escapeHtml(label)}</label>
        <input
          id="${escapeHtml(inputId)}"
          class="manual-input"
          data-manual-field="${fieldKey}"
          type="number"
          step="0.1"
          value="${escapeHtml(val)}"
          placeholder="blank = hide"
        />
        <div class="manual-line-rail" aria-hidden="true"></div>
        <div class="manual-help">Blank = hide line, 0 = draw at 0°.</div>
      </div>
    `;
  }

  function ensureManualGuideLines(freq) {
    const key = String(freq);

    if (!manualGuideLinesByFreq[key]) {
      manualGuideLinesByFreq[key] = {
        hbwStart: null,
        hbwStop: null,
        vbwBeam1Start: null,
        vbwBeam1Stop: null,
        vbwBeam2Start: null,
        vbwBeam2Stop: null
      };
    }
  }

  function setManualGuideLine(freq, fieldKey, angleValue) {
    ensureManualGuideLines(freq);
    manualGuideLinesByFreq[String(freq)][fieldKey] = angleValue;
  }

  function getManualGuideAngles(freq, plotType) {
    ensureManualGuideLines(freq);

    const config = manualGuideLinesByFreq[String(freq)];

    if (plotType === "H") {
      return [config.hbwStart, config.hbwStop].filter((v) => v !== null);
    }

    return [
      config.vbwBeam1Start,
      config.vbwBeam1Stop,
      config.vbwBeam2Start,
      config.vbwBeam2Stop
    ].filter((v) => v !== null);
  }

  function parseManualAngleInput(rawValue) {
    const str = String(rawValue ?? "").trim();
    if (!str) return null;

    const num = Number(str);
    if (Number.isNaN(num)) return null;

    return normalizeAngle(num);
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

    if (!useDetectedBase) {
      return -offset;
    }

    return detectedNum - offset;
  }

  function summarizeBandMeta(metas) {
    return {
      MODEL: joinUnique(metas.map((m) => m.MODEL)),
      GAIN: joinUnique(metas.map((m) => m.GAIN)),
      TILT_RAW: joinUnique(metas.map((m) => m.TILT_RAW)),
      TILT_VALUE: joinUnique(
        metas.map((m) => (m.TILT_VALUE === null ? "" : formatNumber(m.TILT_VALUE)))
      ),
      TILT_SOURCE: joinUnique(metas.map((m) => m.TILT_SOURCE)),
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

    if (uniq.length <= 5) {
      return uniq.join("  |  ");
    }

    return `${uniq.slice(0, 5).join("  |  ")}  |  +${uniq.length - 5} more`;
  }

  function updateGlobalSummary({ selected, used, freqCount, plotCount }) {
    sumSelected.textContent = selected;
    sumUsed.textContent = used;
    sumFreq.textContent = freqCount;
    sumPlots.textContent = plotCount;
    if (sumTilt) {
      sumTilt.textContent = getTiltFilterSummary();
    }
    globalSummary.classList.remove("hidden");
  }

  function updateFolderSelectionUi(fileCount) {
    if (!folderSelectionInfo) return;

    if (!fileCount) {
      folderSelectionInfo.textContent = "No folder selected";
      return;
    }

    folderSelectionInfo.textContent =
      `${fileCount} file${fileCount === 1 ? "" : "s"} selected`;
  }

  function updateLastScanSummary(summary) {
    if (!scanSummaryText || !scanUpdatedText) return;

    if (!summary) {
      scanSummaryText.textContent = "No scan loaded";
      scanUpdatedText.textContent = "Awaiting folder";
      return;
    }

    scanSummaryText.textContent =
      `${summary.used} traces · ${summary.freqCount} bands · ${summary.plotCount} plots`;
    scanUpdatedText.textContent =
      `${summary.selected} selected · ${formatTimestamp(new Date())}`;
  }

  function clearOutput() {
    plotsContainer.innerHTML = "";
    globalSummary.classList.add("hidden");
  }

  function setStatus(message, cls = "") {
    if (statusEl) {
      statusEl.className = `scan-status-token ${cls}`.trim();
      statusEl.textContent = deriveScanStateLabel(message, cls);
    }

    if (!observatoryStatusText) return;

    observatoryStatusText.classList.remove("is-good", "is-warn", "is-bad");

    if (cls === "bad") {
      observatoryStatusText.textContent = "Alert";
      observatoryStatusText.classList.add("is-bad");
      return;
    }

    if (cls === "warn") {
      observatoryStatusText.textContent = "Attention";
      observatoryStatusText.classList.add("is-warn");
      return;
    }

    observatoryStatusText.textContent = "Nominal";
    observatoryStatusText.classList.add("is-good");
  }

  function compactStatusMessage(message) {
    return String(message || "")
      .split("\n")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" · ");
  }

  function deriveScanStateLabel(message, cls) {
    const text = String(message || "").toLowerCase();
    if (cls === "bad") return "SCAN ERROR";
    if (text.includes("reading") || text.includes("plotting")) return "SCANNING";
    if (text.includes("waiting")) return "WAITING FOR FOLDER";
    if (cls === "warn") return "SCAN WARNING";
    return "SCAN READY";
  }

  function formatNumber(num) {
    const n = Number(num);
    if (Number.isNaN(n)) return "";
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  }

  function normalizeAngle(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function formatTimestamp(date) {
    const d = date instanceof Date ? date : new Date();

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
  }

  function shorten(text, max = 50) {
    const str = String(text || "").trim();
    if (str.length <= max) return str;
    return str.slice(0, max - 1) + "...";
  }

  function looksSafeText(value) {
    const str = String(value || "").trim();
    if (!str) return false;

    return !/[^\u0000-\u007F]/.test(str) || /[+\-]?\d+/.test(str);
  }

  function chunkArray(list, chunkSize) {
    const out = [];

    for (let i = 0; i < list.length; i += chunkSize) {
      out.push(list.slice(i, i + chunkSize));
    }

    return out;
  }

  function clearObject(obj) {
    Object.keys(obj).forEach((key) => {
      delete obj[key];
    });
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
})();
