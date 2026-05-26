(function () {
  const MSIPlotter = {};

  MSIPlotter.preparePatternData = function (pattern, tiltValue = null, rotateEnabled = false) {
    const angles = Object.keys(pattern)
      .map(Number)
      .filter((v) => !Number.isNaN(v))
      .sort((a, b) => a - b);

    const rawValues = angles.map((a) => -Math.abs(Number(pattern[a])));
    const maxVal = Math.max(...rawValues);
    const gains = rawValues.map((v) => v - maxVal);

    let theta = angles.slice();

    if (rotateEnabled && tiltValue !== null && !Number.isNaN(Number(tiltValue))) {
      theta = theta.map((a) => normalizeAngle(a - Number(tiltValue)));
    }

    return { theta, gains };
  };

  MSIPlotter.buildPlotData = function (traceItems, options) {
    const {
      zeroDirection = "N",
      rotateEnabled = false,
      include3dB = true,
      guideAngles = []
    } = options || {};

    const traces = traceItems.map((item, idx) => {
      const prepared = MSIPlotter.preparePatternData(
        item.pattern,
        item.meta.TILT_VALUE,
        rotateEnabled
      );

      const freqText = item.meta?.FREQUENCY ? `${item.meta.FREQUENCY} MHz` : "N/A";
      const tiltText =
        item.meta?.TILT_VALUE === null || item.meta?.TILT_VALUE === undefined || item.meta?.TILT_VALUE === ""
          ? "N/A"
          : `${formatSignedNumber(item.meta.TILT_VALUE)}\u00b0`;
      const tiltSource = item.meta?.TILT_SOURCE || "N/A";

      const customdata = prepared.theta.map((a) => [
        formatAngleLabel(a),
        freqText,
        tiltText,
        tiltSource
      ]);

      return {
        type: "scatterpolar",
        mode: "lines",
        theta: prepared.theta,
        r: prepared.gains,
        customdata,
        name: item.label,
        line: {
          color: getTraceColor(idx, traceItems.length),
          width: 1.8
        },
        hovertemplate:
          `<b>${escapeHtml(item.label)}</b><br>` +
          "Frequency: %{customdata[1]}<br>" +
          "Angle: %{customdata[0]}\u00b0<br>" +
          "Gain: %{r:.2f} dB<br>" +
          "Tilt: %{customdata[2]} (%{customdata[3]})" +
          "<extra></extra>"
      };
    });

    if (include3dB) {
      const circle = make3dBCircle();
      traces.push({
        type: "scatterpolar",
        mode: "lines",
        theta: circle.theta,
        r: circle.r,
        name: "-3 dB",
        line: {
          color: "#ff4d4f",
          width: 1.2,
          dash: "dot"
        },
        hovertemplate: "-3 dB<extra></extra>"
      });
    }

    for (const angle of guideAngles) {
      const guideTrace = makeManualGuideTrace(angle);
      if (guideTrace) {
        traces.push(guideTrace);
      }
    }

    const layout = buildPolarLayout({
      title: "",
      zeroDirection,
      theme: "dark",
      showLegend: true
    });

    return { traces, layout };
  };

  MSIPlotter.renderPlot = async function (plotDiv, traceItems, options = {}) {
    const zeroDirection = options.zeroDirection || "N";
    const rotateEnabled = !!options.rotateEnabled;
    const guideAngles = Array.isArray(options.guideAngles) ? options.guideAngles : [];

    const { traces, layout } = MSIPlotter.buildPlotData(traceItems, {
      zeroDirection,
      rotateEnabled,
      guideAngles
    });

    await Plotly.newPlot(plotDiv, traces, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d", "autoScale2d", "toImage"]
    });

    plotDiv.dataset.zeroDirection = zeroDirection;
    plotDiv.dataset.rotateEnabled = rotateEnabled ? "true" : "false";
  };

  MSIPlotter.copyPlotAsWhitePng = async function (plotDiv, zeroDirection = "N") {
    const exportData = (plotDiv.data || []).map((trace) => {
      const is3dB = trace.name === "-3 dB";

      return {
        ...trace,
        showlegend: false,
        line: {
          ...(trace.line || {}),
          width: is3dB ? 1.8 : 3
        }
      };
    });

    const exportLayout = buildPolarLayout({
      title: "",
      zeroDirection,
      theme: "light",
      showLegend: false,
      compactForClipboard: true,
      angularTickFontSize: 26,
      radialTickFontSize: 24
    });

    const tempDiv = document.createElement("div");
    tempDiv.style.position = "fixed";
    tempDiv.style.left = "-99999px";
    tempDiv.style.top = "-99999px";
    tempDiv.style.width = "1200px";
    tempDiv.style.height = "1200px";
    document.body.appendChild(tempDiv);

    try {
      await Plotly.newPlot(tempDiv, exportData, exportLayout, {
        staticPlot: true,
        displaylogo: false
      });

      const dataUrl = await Plotly.toImage(tempDiv, {
        format: "png",
        width: 1300,
        height: 1300,
        scale: 2
      });

      const blob = dataUrlToBlob(dataUrl);

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": blob })
        ]);
        await Plotly.purge(tempDiv);
        tempDiv.remove();
        return { ok: true, mode: "clipboard" };
      }

      downloadBlob(blob, "beam_plot.png");
      await Plotly.purge(tempDiv);
      tempDiv.remove();
      return { ok: true, mode: "download" };
    } catch (err) {
      try {
        await Plotly.purge(tempDiv);
      } catch (_) {
        // ignore purge failure
      }
      tempDiv.remove();
      throw err;
    }
  };

  function buildPolarLayout({
    title = "",
    zeroDirection = "N",
    theme = "dark",
    showLegend = true,
    compactForClipboard = false,
    angularTickFontSize = 11,
    radialTickFontSize = 11
  }) {
    const dark = theme === "dark";

    const colors = dark
      ? {
          paper: "#041125",
          plot: "#05162f",
          font: "#e8f0ff",
          muted: "#c8d7ee",
          grid: "rgba(110, 145, 193, 0.32)",
          line: "rgba(134, 168, 214, 0.52)",
          hoverBg: "rgba(4, 14, 31, 0.96)",
          hoverBorder: "rgba(219, 176, 99, 0.72)",
          hoverFont: "#f2f7ff"
        }
      : {
          paper: "#ffffff",
          plot: "#ffffff",
          font: "#101828",
          muted: "#334155",
          grid: "#cbd5e1",
          line: "#94a3b8",
          hoverBg: "#ffffff",
          hoverBorder: "#334155",
          hoverFont: "#101828"
        };

    const { vals, texts } = makeAngleTicks();
    const showLegendResolved = !!showLegend;

    return {
      title: {
        text: title,
        font: { size: compactForClipboard ? 1 : 18, color: colors.font }
      },
      paper_bgcolor: colors.paper,
      plot_bgcolor: colors.plot,
      font: { color: colors.font },
      margin: compactForClipboard
        ? { l: 56, r: 56, t: 56, b: 56 }
        : { l: 30, r: 184, t: 26, b: 28 },
      showlegend: showLegendResolved,
      hoverlabel: {
        bgcolor: colors.hoverBg,
        bordercolor: colors.hoverBorder,
        font: { color: colors.hoverFont, size: 12, family: "IBM Plex Mono, Manrope, sans-serif" },
        align: "left",
        namelength: -1
      },
      legend: {
        x: 1.01,
        y: 0.5,
        xanchor: "left",
        yanchor: "middle",
        orientation: "v",
        bgcolor: "rgba(0,0,0,0)",
        font: { size: 10, color: colors.font },
        itemsizing: "constant"
      },
      polar: {
        bgcolor: colors.plot,
        radialaxis: {
          range: [-35, 0],
          tickvals: [-30, -25, -20, -15, -10, -5, 0],
          tickfont: { color: colors.muted, size: radialTickFontSize },
          gridcolor: colors.grid,
          linecolor: colors.line,
          angle: zeroDirection === "N" ? 45 : -45
        },
        angularaxis: {
          rotation: zeroDirection === "N" ? 90 : 0,
          direction: "clockwise",
          tickmode: "array",
          tickvals: vals,
          ticktext: texts,
          tickfont: { color: colors.muted, size: angularTickFontSize },
          gridcolor: colors.grid,
          linecolor: colors.line
        },
        domain: compactForClipboard
          ? { x: [0.03, 0.97], y: [0.03, 0.97] }
          : showLegendResolved
            ? { x: [0, 0.84], y: [0, 1] }
            : { x: [0, 1], y: [0, 1] }
      }
    };
  }

  function makeAngleTicks() {
    const vals = [];
    const texts = [];

    for (let d = 0; d < 360; d += 10) {
      vals.push(d);
      texts.push(String(d));
    }

    return { vals, texts };
  }

  function make3dBCircle() {
    const theta = [];
    const r = [];

    for (let i = 0; i < 360; i++) {
      theta.push(i);
      r.push(-3);
    }

    return { theta, r };
  }

  function makeManualGuideTrace(angleValue) {
    if (angleValue === null || angleValue === undefined || angleValue === "") {
      return null;
    }

    const angleNum = Number(angleValue);
    if (Number.isNaN(angleNum)) {
      return null;
    }

    const theta = normalizeAngle(angleNum);

    return {
      type: "scatterpolar",
      mode: "lines",
      theta: [theta, theta],
      r: [-35, 0],
      showlegend: false,
      line: {
        color: "#ff2d2d",
        width: 2.2
      },
      hovertemplate: `Guide: ${formatAngleLabel(theta)}\u00b0<extra></extra>`
    };
  }

  function formatAngleLabel(angle) {
    const n = normalizeAngle(Number(angle));
    if (Number.isNaN(n)) return "";
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  }

  function formatSignedNumber(value) {
    const n = Number(value);
    if (Number.isNaN(n)) return "";
    return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, "");
  }

  function getTraceColor(index, total) {
    const palette = [
      "#ff4040",
      "#ff8b2d",
      "#f8c537",
      "#adf83d",
      "#43ff78",
      "#24ffd6",
      "#18ddff",
      "#3da0ff",
      "#8f72ff",
      "#d569ff"
    ];

    if (total <= palette.length) {
      return palette[index % palette.length];
    }

    const hue = (index / total) * 320;
    return `hsl(${hue}, 92%, 58%)`;
  }

  function normalizeAngle(deg) {
    return ((deg % 360) + 360) % 360;
  }

  function dataUrlToBlob(dataUrl) {
    const parts = dataUrl.split(",");
    const mime = parts[0].match(/:(.*?);/)[1];
    const binary = atob(parts[1]);
    const len = binary.length;
    const array = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      array[i] = binary.charCodeAt(i);
    }

    return new Blob([array], { type: mime });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  window.MSIPlotter = MSIPlotter;
})();
