class Storage {
  static get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  static set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }
}

class Emitter {
  port = new MessageChannel().port1;

  on(event, listener) {
    this.port.addEventListener(event, listener)
  }

  off(event, listener) {
    this.port.removeEventListener(event, listener);
  }

  trigger(event, data) {
    this.port.dispatchEvent(new CustomEvent(event, {detail: data}));
  }
}

class Tpl {
  static html(strings, ...data) {
    let result = '';
    for (const str of strings) {
      result += str;
      const val = data.shift();
      if (val !== void(0)) {
        result += val instanceof TplResult ? val.toString() : this.sanitize(val);
      }
    }
    return new TplResult(result);
  }
  static raw(...args) {
    return new TplResult(String.raw(...args));
  }
  static sanitize(text) {
    const map = {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'};
    return String(text).replace(/[&<>"']/g, (char) => map[char]);
  }
}

class TplResult {
  constructor(html) {
    this.html = html;
  }
  appendHtml(...args) {
    const res = Tpl.html(...args);
    this.html += res.html;
    return this;
  }
  replaceLineBreaks() {
    this.html = this.html.replace(/\n/g, '<br>');
    return this;
  }
  valueOf() {
    return this.html;
  }
  toString() {
    return this.html;
  }
  get length() {
    return this.html.length;
  }
  buildFragment() {
    const tmp = document.createElement('template');
    tmp.innerHTML = this.html;
    return tmp.content;
  }
  buildElement() {
    return this.buildFragment().firstElementChild;
  }
}

function getDeferred() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = (...args) => {
      resolve(...args);
      return deferred.promise;
    };
    deferred.reject = (...args) => {
      reject(...args);
      return deferred.promise;
    }
  });
  return deferred;
}

function debounce(func, wait, immediate) {
  let timeout;
  return function(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) {
        func(...args);
      }
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) {
      func(...args);
    }
  };
}

function $(selector, parent = document) {
  return parent.querySelector(selector);
}

function $$(selector, parent = document) {
  return parent.querySelectorAll(selector);
}

function importTemplate(id) {
  const template = $('#template_' + id);
  return document.importNode(template.content, true);
}

function getLabeledElements(container) {
  const result = {};
  if (container.childElementCount) {
    for (const child of container.children) {
      const label = child.dataset.jsLabel;
      if (label) {
        result[child.dataset.jsLabel] = child;
      }
      Object.assign(result, getLabeledElements(child, result));
    }
  }
  return result;
}

function buildLoaderElement(container = null) {
  const el = Tpl.html`<div class="lds-ring"><div></div><div></div><div></div><div></div></div>`.buildElement();
  if (container) {
    container.appendChild(el);
  }
  return el;
}

function cmpStrNum(a, b) {
  const diff = a.length - b.length;
  if (diff !== 0) {
    return diff < 0 ? -1 : 1;
  }
  if (a === b) {
    return 0;
  }
  return a > b ? 1 : -1;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomLong() {
  return crypto.getRandomValues(new Uint32Array(2));
}

function formatDateFull(ts, {withYear = true, longMonth = true} = {}) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: longMonth ? 'long' : 'short',
    year: withYear ? 'numeric' : void(0)
  }).format(ts * 1000);
}

function formatDateWeekday(ts) {
  return new Intl.DateTimeFormat('en-US', {weekday: 'short'}).format(ts * 1000);
}

function formatDateRelative(ts, now) {
  if (now - ts < 3600) {
    const minutes = Math.floor((now - ts) / 60);
    if (minutes) {
      return minutes + ' minutes ago';
    } else {
      return 'just now';
    }
  }
  const dateToday = new Date(now * 1000);
  dateToday.setHours(0, 0, 0, 0);
  if (ts > dateToday.getTime() / 1000) {
    return 'today at ' + formatTime(ts);
  }
  dateToday.setDate(dateToday.getDate() - 1);
  if (ts > dateToday.getTime() / 1000) {
    return 'yesterday at ' + formatTime(ts);
  }
  return formatDateFull(ts);
}

function formatTime(ts, {withSeconds = false} = {}) {
  return new Intl.DateTimeFormat('en-GB', {
    hour: 'numeric',
    minute: 'numeric',
    second: withSeconds ? 'numeric' : void(0)
  }).format(ts * 1000);
}

function cutText(text, checkLength, cutLength) {
  if (text && text.length > checkLength) {
    return text.substr(0, cutLength) + '...';
  }
  return text;
}

function formatCountShort(count) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short'
  }).format(count);
}

function formatCountLong(count) {
  return new Intl.NumberFormat('en-US').format(count);
}

function isTouchDevice() {
  return ('ontouchstart' in window);
}

const checkWebPSupport = (() => {
  const promise = new Promise((resolve) => {
    const image = new Image();
    image.onerror = setResult;
    image.onload = setResult;
    image.src = 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAwA0JaQAA3AA/vuUAAA=';
    function setResult(event) {
      resolve(event && event.type === 'load' ? image.width === 1 : false);
    }
  }, 0);
  return () => promise;
})();

const webPDecoderTask = (() => {
  let worker;
  let workerPromise;

  const loadWorker = () => {
    workerPromise = workerPromise || new Promise(resolve => {
      new Worker('./webp_worker.js').addEventListener('message', (event) => {
        if (event.data === 'ready') {
          worker = event.target;
          resolve(worker);
        } else {
          const deferred = tasksCallbacks[event.data.taskId];
          delete tasksCallbacks[event.data.taskId];
          if (event.data.error) {
            deferred.reject(event.data.error);
          } else {
            deferred.resolve(event.data.result);
          }
        }
      });
    });
  };

  const newTaskId = (() => {
    let i = 0;
    return () => ++i;
  })();

  const tasksCallbacks = {};

  return async (task, params) => {
    if (!worker) {
      loadWorker();
      await workerPromise;
    }
    const taskId = newTaskId();
    const deferred = getDeferred();
    tasksCallbacks[taskId] = deferred;
    worker.postMessage({taskId, task, params});
    return deferred.promise;
  }
})();

async function convertWebP(buffer) {
  const bytes = new Uint8Array(buffer);
  return convert(await webPDecoderTask('decode', {data: bytes}));

  function convert({output, width, height}) {
    return new Promise((resolve) => {
      const imageData = new ImageData(new Uint8ClampedArray(output.buffer), width, height);
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob(resolve, 'image/png');
    });
  }
}

function blobToBuffer(blob) {
  if (blob.arrayBuffer) {
    return blob.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      resolve(event.target.result);
    };
    fileReader.onerror = (event) => {
      console.error(event);
      reject();
    };
    fileReader.readAsArrayBuffer(blob);
  });
}

export {
  Storage,
  Emitter,
  Tpl,
  getDeferred,
  debounce,
  $, $$,
  importTemplate,
  buildLoaderElement,
  getLabeledElements,
  cmpStrNum,
  wait,
  randomLong,
  formatDateFull,
  formatDateWeekday,
  formatDateRelative,
  formatTime,
  cutText,
  formatCountShort,
  formatCountLong,
  isTouchDevice,
  checkWebPSupport,
  convertWebP,
  blobToBuffer
};
