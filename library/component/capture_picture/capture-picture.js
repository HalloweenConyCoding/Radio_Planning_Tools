(function (global) {
  'use strict';

  function withTimeout(promise, timeoutMs, message) {
    var duration = Number.isFinite(timeoutMs) ? timeoutMs : 10000;
    if (duration <= 0) {
      return Promise.reject(new Error(message || 'Operation timed out'));
    }

    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error(message || 'Operation timed out'));
      }, duration);

      promise.then(function (value) {
        clearTimeout(timer);
        resolve(value);
      }, function (error) {
        clearTimeout(timer);
        reject(error);
      });
    });
  }

  function svgStringToPngBlob(svg, options) {
    options = options || {};
    var width = Number(options.width);
    var height = Number(options.height);
    var scale = Number(options.scale);

    if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) {
      return Promise.reject(new TypeError('width and height must be positive numbers'));
    }
    if (!Number.isFinite(scale) || scale <= 0) {
      scale = 1;
    }

    var canvasWidth = Math.ceil(width * scale);
    var canvasHeight = Math.ceil(height * scale);
    var blobUrl = URL.createObjectURL(new Blob([String(svg)], { type: 'image/svg+xml;charset=utf-8' }));
    var image = new Image();

    var render = new Promise(function (resolve, reject) {
      image.onload = function () {
        try {
          var canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          var context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Canvas 2D context is unavailable');
          }
          if (options.background) {
            context.fillStyle = options.background;
            context.fillRect(0, 0, canvasWidth, canvasHeight);
          }
          context.drawImage(image, 0, 0, canvasWidth, canvasHeight);
          canvas.toBlob(function (pngBlob) {
            if (pngBlob) {
              resolve(pngBlob);
            } else {
              reject(new Error('Unable to create PNG blob'));
            }
          }, 'image/png');
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = function () {
        reject(new Error('Unable to load SVG image'));
      };
      image.src = blobUrl;
    });

    return withTimeout(render, options.timeoutMs, 'SVG capture timed out').finally(function () {
      image.onload = null;
      image.onerror = null;
      URL.revokeObjectURL(blobUrl);
    });
  }

  function copyComputedStyles(source, target, windowRef) {
    if (!source || !target || !windowRef || typeof windowRef.getComputedStyle !== 'function') return;
    var computed = windowRef.getComputedStyle(source);
    var style = '';
    for (var index = 0; index < computed.length; index += 1) {
      var property = computed[index];
      var value = computed.getPropertyValue(property);
      if (value) style += property + ':' + value + ';';
    }
    if (style) target.setAttribute('style', style);
    var sourceChildren = source.children || [];
    var targetChildren = target.children || [];
    for (var childIndex = 0; childIndex < sourceChildren.length; childIndex += 1) {
      copyComputedStyles(sourceChildren[childIndex], targetChildren[childIndex], windowRef);
    }
  }

  function copyCanvasSnapshots(source, target, documentRef) {
    if (!source || !target || typeof source.querySelectorAll !== 'function') return;
    var sourceCanvases = source.querySelectorAll('canvas');
    var targetCanvases = target.querySelectorAll('canvas');
    for (var index = 0; index < sourceCanvases.length; index += 1) {
      var sourceCanvas = sourceCanvases[index];
      var targetCanvas = targetCanvases[index];
      if (!targetCanvas || !targetCanvas.parentNode || typeof sourceCanvas.toDataURL !== 'function') continue;
      try {
        var image = documentRef.createElement('img');
        image.src = sourceCanvas.toDataURL('image/png');
        image.width = sourceCanvas.width;
        image.height = sourceCanvas.height;
        image.setAttribute('aria-hidden', 'true');
        targetCanvas.parentNode.replaceChild(image, targetCanvas);
      } catch (error) {
        // A tainted or unavailable canvas should not block the SVG fallback.
      }
    }
  }

  function domElementToPngBlob(element, options) {
    options = options || {};
    if (!element || !element.ownerDocument || typeof element.cloneNode !== 'function') {
      return Promise.reject(new Error('Rendered UI capture is unavailable'));
    }
    var documentRef = element.ownerDocument;
    var windowRef = documentRef.defaultView || global;
    if (!global.XMLSerializer || typeof documentRef.createElement !== 'function') {
      return Promise.reject(new Error('Rendered UI capture is unsupported in this browser'));
    }
    var width = Math.ceil(Number(options.width) || element.scrollWidth || element.getBoundingClientRect().width);
    var height = Math.ceil(Number(options.height) || element.scrollHeight || element.getBoundingClientRect().height);
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return Promise.reject(new Error('Rendered UI capture has no visible dimensions'));
    }
    var clone = element.cloneNode(true);
    copyComputedStyles(element, clone, windowRef);
    copyCanvasSnapshots(element, clone, documentRef);
    clone.style.width = width + 'px';
    clone.style.height = height + 'px';
    clone.style.maxWidth = 'none';
    clone.style.maxHeight = 'none';
    clone.style.overflow = 'visible';
    clone.style.position = 'relative';
    var serializer = new global.XMLSerializer();
    var markup = serializer.serializeToString(clone);
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="width:' + width + 'px;height:' + height + 'px;overflow:visible;background:' + (options.background || 'transparent') + '">' + markup + '</div></foreignObject></svg>';
    return svgStringToPngBlob(svg, {
      width: width,
      height: height,
      scale: options.scale,
      background: options.background,
      timeoutMs: options.timeoutMs
    });
  }

  function writePngToClipboard(blob, options) {
    options = options || {};
    if (!global.navigator || !global.navigator.clipboard || typeof global.navigator.clipboard.write !== 'function' || typeof global.ClipboardItem !== 'function') {
      return Promise.reject(new Error('PNG clipboard writing is unavailable'));
    }

    var write = global.navigator.clipboard.write([
      new global.ClipboardItem({ 'image/png': blob })
    ]);
    var timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 5000;
    return withTimeout(Promise.resolve(write), timeoutMs, 'PNG clipboard write timed out');
  }

  function downloadPngBlob(blob, options) {
    options = options || {};
    var link = document.createElement('a');
    var url = URL.createObjectURL(blob);
    link.href = url;
    link.download = options.filename || 'capture.png';
    if (link.style) link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
  }

  async function copyOrDownloadPng(blob, options) {
    try {
      await writePngToClipboard(blob, options);
      return { method: 'clipboard', status: 'success' };
    } catch (error) {
      downloadPngBlob(blob, options);
      return { method: 'download', status: 'downloaded' };
    }
  }

  global.ConyCapture = {
    svgStringToPngBlob: svgStringToPngBlob,
    domElementToPngBlob: domElementToPngBlob,
    writePngToClipboard: writePngToClipboard,
    downloadPngBlob: downloadPngBlob,
    copyOrDownloadPng: copyOrDownloadPng
  };
}(window));
