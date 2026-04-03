(function () {
    const MSIParser = {};
  
    MSIParser.readFileSmart = async function (file) {
      const buffer = await file.arrayBuffer();
      return decodeBufferSmart(buffer);
    };
  
    MSIParser.parseMsiText = function (text, fileName = "") {
      const lines = text.split(/\r?\n/);
      const rawMetadata = {};
      const sections = {
        H: { header: "", pattern: {} },
        V: { header: "", pattern: {} }
      };
  
      let mode = null;
  
      for (let rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;
  
        if (/^HORIZONTAL\b/i.test(line)) {
          mode = "H";
          sections.H.header = line;
          continue;
        }
  
        if (/^VERTICAL\b/i.test(line)) {
          mode = "V";
          sections.V.header = line;
          continue;
        }
  
        if (!mode) {
          const pair = splitKeyValue(line);
          if (pair) {
            rawMetadata[pair.key] = pair.value;
          }
          continue;
        }
  
        const point = parsePatternPoint(line);
        if (!point) continue;
  
        if (mode === "H") sections.H.pattern[point.angle] = point.value;
        if (mode === "V") sections.V.pattern[point.angle] = point.value;
      }
  
      const meta = normalizeMetadata(rawMetadata, sections, fileName);
  
      return {
        rawMetadata,
        meta,
        sections,
        fileName
      };
    };
  
    function decodeBufferSmart(buffer) {
      const decoders = ["utf-8", "gb18030", "windows-1252"];
      let bestText = "";
      let bestScore = Infinity;
  
      for (const encoding of decoders) {
        try {
          const decoder = new TextDecoder(encoding, { fatal: false });
          const text = decoder.decode(buffer);
          const score = scoreDecodedText(text);
  
          if (score < bestScore) {
            bestScore = score;
            bestText = text;
          }
        } catch (err) {
          // skip unsupported decoder
        }
      }
  
      return bestText;
    }
  
    function scoreDecodedText(text) {
      const replacementCount = (text.match(/\uFFFD/g) || []).length;
      const weirdEscapes = (text.match(/\\x[0-9a-f]{2}/gi) || []).length;
      return replacementCount * 10 + weirdEscapes;
    }
  
    function splitKeyValue(line) {
      const clean = line.replace(/\s+/g, " ").trim();
      if (!clean) return null;
  
      const firstSpace = clean.indexOf(" ");
      if (firstSpace <= 0) return null;
  
      const key = clean.slice(0, firstSpace).trim().toUpperCase();
      const value = clean.slice(firstSpace + 1).trim();
  
      if (!/^[A-Z_]+$/.test(key)) return null;
  
      return { key, value };
    }
  
    function parsePatternPoint(line) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 2) return null;
  
      const angle = parseFloat(parts[0]);
      const value = parseFloat(parts[1]);
  
      if (Number.isNaN(angle) || Number.isNaN(value)) return null;
  
      return { angle, value };
    }
  
    function normalizeMetadata(raw, sections, fileName) {
      const meta = {
        MODEL: cleanValue(firstNonEmpty(raw.MODEL, raw.NAME)),
        VENDOR: cleanValue(firstNonEmpty(raw.VENDOR, raw.MAKE)),
        FREQUENCY: cleanValue(raw.FREQUENCY),
        GAIN: cleanValue(raw.GAIN),
        GAIN_VALUE: null,
        GAIN_UNIT: "",
        TILT_RAW: cleanValue(raw.TILT),
        TILT_VALUE: null,
        TILT_SOURCE: "",
        HBW: cleanValue(firstNonEmpty(raw.HBW, raw.H_WIDTH)),
        VBW: cleanValue(firstNonEmpty(raw.VBW, raw.V_WIDTH)),
        POLARIZATION: cleanValue(raw.POLARIZATION),
        FBR: cleanValue(firstNonEmpty(raw.FBR, raw.FRONT_TO_BACK)),
        COMMENT: cleanValue(firstNonEmpty(raw.COMMENT, raw.COMMENTS)),
        HBW_PLOT: cleanValue(sections.H.header),
        VBW_PLOT: cleanValue(sections.V.header),
        FILE_NAME_FALLBACK: fileName
      };
  
      const gainParts = parseGain(meta.GAIN);
      meta.GAIN_VALUE = gainParts.value;
      meta.GAIN_UNIT = gainParts.unit;
  
      if (!meta.VENDOR && meta.MODEL) {
        if (/^HUAWEI\b/i.test(meta.MODEL)) meta.VENDOR = "HUAWEI";
      }
  
      const tiltInfo = detectTilt({
        tiltRaw: meta.TILT_RAW,
        comment: meta.COMMENT,
        model: meta.MODEL,
        fileName
      });
  
      meta.TILT_VALUE = tiltInfo.value;
      meta.TILT_SOURCE = tiltInfo.source;
  
      return meta;
    }

    function detectTilt({ tiltRaw, comment, model, fileName }) {
        // 1) direct TILT field
        const fromTiltField = extractTiltNumber(tiltRaw);
        if (fromTiltField !== null) {
          return { value: fromTiltField, source: "TILT" };
        }
      
        // 2) COMMENT / COMMENTS
        const fromComment = extractTiltNumber(comment);
        if (fromComment !== null) {
          return { value: fromComment, source: "COMMENT" };
        }
      
        // 3) NAME inside file
        const fromModel = extractTiltNumber(model);
        if (fromModel !== null) {
          return { value: fromModel, source: "NAME" };
        }
      
        // 4) filename fallback
        const fromFileName = extractTiltFromFilename(fileName);
        if (fromFileName !== null) {
          return { value: fromFileName, source: "FILENAME" };
        }
      
        return { value: null, source: "" };
      }

      function extractTiltNumber(text) {
        if (!text) return null;
      
        const str = String(text).trim();
        if (!str) return null;
      
        if (/^ELECTRICAL$/i.test(str)) {
          return null;
        }
      
        // plain number only
        if (/^-?\d+(\.\d+)?$/.test(str)) {
          return parseFloat(str);
        }
      
        const patterns = [
          /(?:^|[^A-Za-z0-9])T\s*(-?\d+(?:\.\d+)?)(?=$|[^A-Za-z0-9])/i,
          /(?:^|[^A-Za-z0-9])(-?\d+(?:\.\d+)?)\s*T(?=$|[^A-Za-z0-9])/i,
          /\b(-?\d+(?:\.\d+)?)\s*degree\s*downtilt\b/i,
          /\bdowntilt\b.*?\b(-?\d+(?:\.\d+)?)\b/i
        ];
      
        for (const rx of patterns) {
          const match = str.match(rx);
          if (match) {
            const num = parseFloat(match[1]);
            if (!Number.isNaN(num)) return num;
          }
        }
      
        return null;
      }

    function parseGain(gainRaw) {
      if (!gainRaw) return { value: null, unit: "" };
  
      const match = String(gainRaw).match(/(-?\d+(?:\.\d+)?)(?:\s*([A-Za-z]+))?/);
      if (!match) return { value: null, unit: "" };
  
      const value = parseFloat(match[1]);
      const unit = match[2] || "";
  
      return {
        value: Number.isNaN(value) ? null : value,
        unit
      };
    }
  
    function firstNonEmpty(...values) {
      for (const val of values) {
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          return val;
        }
      }
      return "";
    }
  
    function cleanValue(value) {
      if (value === undefined || value === null) return "";
      return String(value).replace(/\s+/g, " ").trim();
    }
    
    function extractTiltFromFilename(fileName) {
        if (!fileName) return null;
      
        // remove extension first
        const name = String(fileName).replace(/\.[^.]+$/, "").trim();
        if (!name) return null;
      
        // split by common filename separators
        const tokens = name.split(/[_\s\-()+]+/).filter(Boolean);
      
        for (const token of tokens) {
          // T10 / T-1
          let m = token.match(/^T(-?\d+(?:\.\d+)?)$/i);
          if (m) {
            const num = parseFloat(m[1]);
            if (!Number.isNaN(num)) return num;
          }
      
          // 10T / -01T / 03T
          m = token.match(/^(-?\d+(?:\.\d+)?)T$/i);
          if (m) {
            const num = parseFloat(m[1]);
            if (!Number.isNaN(num)) return num;
          }
        }
      
        return null;
      }

    window.MSIParser = MSIParser;
  })();