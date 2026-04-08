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
  
      if (rotateEnabled && tiltValue !== null && !Number.isNaN(tiltValue)) {
        theta = theta.map((a) => normalizeAngle(a - tiltValue));
      }
  
      return { theta, gains };
    };
  
    MSIPlotter.buildPlotData = function (traceItems, options) {
      const {
        zeroDirection = "N",
        rotateEnabled = false,
        include3dB = true
      } = options || {};
  
      const traces = traceItems.map((item, idx) => {
        const prepared = MSIPlotter.preparePatternData(
          item.pattern,
          item.meta.TILT_VALUE,
          rotateEnabled
        );
  
        return {
          type: "scatterpolar",
          mode: "lines",
          theta: prepared.theta,
          r: prepared.gains,
          customdata: prepared.theta.map(v => Math.round(v)),
          name: item.label,
          line: {
            color: getVividColor(idx, traceItems.length),
            width: 1
          },
          hovertemplate:
            `<b>${escapeHtml(item.label)}</b><br>` +
            `Angle: %{customdata}°<br>` +
            `Gain: %{r:.2f} dB` +
            `<extra></extra>`
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
            color: "lightcoral",
            width: 1,
            dash: "dot"
          },
          hovertemplate: "-3 dB<extra></extra>"
        });
      }
  
      const layout = buildPolarLayout({
        title: "",
        zeroDirection,
        theme: "dark",
        showLegend: true
      });
  
      return { traces, layout };
    };
  
    MSIPlotter.renderPlot = async function (plotDiv, traceItems, options) {
      const zeroDirection = options.zeroDirection || "N";
      const rotateEnabled = !!options.rotateEnabled;
  
      const { traces, layout } = MSIPlotter.buildPlotData(traceItems, {
        zeroDirection,
        rotateEnabled
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
            line: {
              ...(trace.line || {}),
              width: is3dB ? 1.6 : 2.8
            }
          };
        });
      
        const exportLayout = buildPolarLayout({
            title: "",
            zeroDirection,
            theme: "light",
            showLegend: false,
            compactForClipboard: true,
            angularTickFontSize: 40,
            radialTickFontSize: 40
          });
      
        const tempDiv = document.createElement("div");
        tempDiv.style.position = "fixed";
        tempDiv.style.left = "-99999px";
        tempDiv.style.top = "-99999px";
        tempDiv.style.width = "1100px";
        tempDiv.style.height = "1100px";
        document.body.appendChild(tempDiv);
      
        try {
          await Plotly.newPlot(tempDiv, exportData, exportLayout, {
            staticPlot: true,
            displaylogo: false
          });
      
          const dataUrl = await Plotly.toImage(tempDiv, {
            format: "png",
            width: 1400,
            height: 1400,
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
          } catch (_) {}
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
        angularTickFontSize = 10,
        radialTickFontSize = 10
      }) {
        const dark = theme === "dark";
      
        const colors = dark
          ? {
              paper: "#0b1220",
              plot: "#0b1220",
              font: "#e5e7eb",
              muted: "#cbd5e1",
              grid: "#334155",
              line: "#64748b"
            }
          : {
              paper: "#ffffff",
              plot: "#ffffff",
              font: "#111827",
              muted: "#334155",
              grid: "#cbd5e1",
              line: "#94a3b8"
            };
      
        const { vals, texts } = makeAngleTicks();
      
        return {
          title: {
            text: title,
            font: { size: compactForClipboard ? 1 : 18, color: colors.font }
          },
          paper_bgcolor: colors.paper,
          plot_bgcolor: colors.plot,
          margin: compactForClipboard
            ? { l: 140, r: 140, t: 140, b: 140 }
            : { l: 40, r: 220, t: 36, b: 40 },

            showlegend: showLegend,

            legend: {
                x: 1.08,
                y: 1,
                xanchor: "left",
                yanchor: "top",
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
                }
            }
        };
      }
  
    function makeAngleTicks() {
      const vals = [];
      const texts = [];
  
      for (let d = 0; d < 360; d += 10) {
        vals.push(d);
        texts.push(d <= 180 ? String(d) : String(d - 360));
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
  
    function getVividColor(index, total) {
      if (total <= 1) return "hsl(0, 95%, 55%)";
      const hue = (index / total) * 300;
      return `hsl(${hue}, 95%, 58%)`;
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