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
  
    folderInput.addEventListener("change", onFolderSelected);
    plotBtn.addEventListener("click", onPlotClicked);
  
    function onFolderSelected() {
      const files = Array.from(folderInput.files || []);
      const msiFiles = files.filter((f) => /\.msi$/i.test(f.name));
  
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
  
        const grouped = groupByFrequency(parsedResults);
        const freqs = Object.keys(grouped)
          .map(Number)
          .sort((a, b) => a - b);
  
        let plotCount = 0;
  
        for (const freq of freqs) {
          const band = grouped[freq];
          const block = createFrequencyBlock(freq, band);
          plotsContainer.appendChild(block.root);
  
          const rotateVertical = !!rotateToggle.checked;
  
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
  
          fillBandSummary(block.summaryWrap, band);
          bindCopyButtons(block, freq);
        }
  
        updateGlobalSummary({
          selected: files.length,
          used: parsedResults.length,
          freqCount: freqs.length,
          plotCount
        });
  
        let doneText =
          `Done.\nSelected files: ${files.length}` +
          `\nMSI files used: ${parsedResults.length}` +
          `\nFrequencies found: ${freqs.length}` +
          `\nPlots created: ${plotCount}`;
  
        if (skipped.length) {
          doneText += `\nSkipped: ${skipped.length}`;
        }
  
        setStatus(doneText, "good");
      } catch (err) {
        console.error(err);
        setStatus("Something went wrong while plotting.", "bad");
      } finally {
        plotBtn.disabled = false;
      }
    }
  
    function groupByFrequency(parsedResults) {
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
  
        const label = buildTraceLabel(item.meta, item.fileName);
  
        if (Object.keys(item.sections.H.pattern).length) {
          grouped[freq].H.push({
            label,
            meta: item.meta,
            pattern: item.sections.H.pattern,
            fileName: item.fileName
          });
        }
  
        if (Object.keys(item.sections.V.pattern).length) {
          grouped[freq].V.push({
            label,
            meta: item.meta,
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
  
    function fillBandSummary(container, band) {
      const meta = summarizeBandMeta(band.metas);
  
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
    }
  
    function summarizeBandMeta(metas) {
      return {
        VENDOR: joinUnique(metas.map((m) => m.VENDOR)),
        MODEL: joinUnique(metas.map((m) => m.MODEL)),
        GAIN: joinUnique(metas.map((m) => m.GAIN)),
        TILT_RAW: joinUnique(metas.map((m) => m.TILT_RAW)),
        TILT_VALUE: joinUnique(
          metas
            .map((m) => (m.TILT_VALUE === null ? "" : formatNumber(m.TILT_VALUE)))
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
  
      // avoid showing broken non-utf text in summary/label
      return !/[^\u0000-\u007F]/.test(str) || /[+\-]?\d+/.test(str);
    }
  
    function escapeHtml(text) {
      return String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
    }
  })();