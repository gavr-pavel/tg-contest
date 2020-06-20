import {MDCRipple} from '@material/ripple/component';
import {MDCMenu} from '@material/menu';
import {I18n} from './i18n';

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
      result += str + this.stringifyValue(data.shift());
    }
    return new TplResult(result);
  }
  static stringifyValue(val) {
    if (val === void(0)) {
      return '';
    }
    if (val instanceof TplResult) {
      return val.toString();
    }
    if (Array.isArray(val)) {
      return val.map((v) => this.stringifyValue(v)).join('');
    }
    return this.sanitize(val);
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
  prependHtml(...args) {
    const res = Tpl.html(...args);
    this.html = res.html + this.html;
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

function escapeRegExp(string){
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
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

function buildLoaderElement(container = null, color = '#5FA1E3') {
  const el = Tpl.html`
    <svg class="circular-loader" viewBox="25 25 50 50" xmlns="http://www.w3.org/2000/svg">
      <circle class="loader-path" stroke="${color}" cx="50" cy="50" r="20" fill="none" stroke-width="3" />
    </svg>
  `.buildElement();
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
    if (minutes > 0) {
      return I18n.getPlural('date_n_minutes_ago', minutes);
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

function formatDuration(duration, fractionDigits = 0) {
  const fraction = fractionDigits ? duration.toFixed(fractionDigits).substr(-fractionDigits) : '';
  duration = Math.floor(duration);
  const hours = Math.floor(duration / 3600);
  const minutes = String(Math.floor(duration / 60) % 60).padStart(hours ? 2 : 1, '0');
  const seconds = String(duration % 60).padStart(2, '0');
  return (hours ? `${hours}:` : '') + `${minutes}:${seconds}` + (fraction ? `,${fraction}` : '');
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

function formatFileSize(bytes) {
  const i = bytes === 0 ? 0 : Math.floor(Math.log(bytes) / Math.log(1024));
  return `${ (bytes / Math.pow(1024, i)).toFixed(1) } ${ ['B', 'KB', 'MB', 'GB', 'TB'][i] }`;
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

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.onload = () => resolve();
    script.onerror = (event) => console.log(event) && 0 || reject(new Error('Could not load script'));
    script.src = src;
    document.head.appendChild(script);
  });
}

function getEventPageXY(event) {
  const {pageX, pageY} = event.touches ? event.touches[0] : event;
  return {pageX, pageY};
}

function initAnimation(callback) {
  let _args;
  let _requestId;
  function start(...args) {
    stop();
    _args = args;
    loop();
  }
  function stop() {
    cancelAnimationFrame(_requestId);
  }
  function loop() {
    callback(..._args);
    _requestId = requestAnimationFrame(loop);
  }
  return [start, stop];
}

function attachMenuListener(el, callback) {
  if (isTouchDevice()) {
    let timeoutId;
    el.addEventListener('touchstart', (event) => {
      const onTouchEnd = (event) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        } else {
          event.preventDefault();
        }
        el.removeEventListener('touchend', onTouchEnd);
        el.removeEventListener('touchmove', onTouchEnd);
      };
      el.addEventListener('touchend', onTouchEnd);
      el.addEventListener('touchmove', onTouchEnd);
      timeoutId = setTimeout(() => {
        timeoutId = null;
        callback(event);
      }, 300);
    });
  } else {
    el.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      callback(event);
    });
  }
}

function attachRipple(...elements) {
  return elements.map((el) => {
    const r = new MDCRipple(el);
    if (el.classList.contains('mdc-icon-button')) {
      r.unbounded = true;
    }
    return r;
  });
}

function initMenu(container) {
  attachRipple(...$$('.mdc-list-item', container));
  return new MDCMenu(container);
}

function buildMenu(actions, {container, menuClass, itemClass, itemCallback}) {
  const el = Tpl.html`
    <div class="${menuClass} mdc-menu mdc-menu-surface">
      <ul class="mdc-list" role="menu" aria-hidden="true" aria-orientation="vertical">
        ${ actions.map(([actionType, text]) => Tpl.html`
          <li class="mdc-list-item ${itemClass} ${itemClass}-${actionType}" data-action="${actionType}" role="menuitem">
            <span class="mdc-list-item__text">${text}</span>
          </li>
        `) }
      </ul>
    </div>
  `.buildElement();

  const onItemClick = (event) => {
    event.stopPropagation();
    const action = event.currentTarget.dataset.action;
    itemCallback(action);
    closeMenu();
  };

  const closeMenu = () => {
    menu.open = false;
    setTimeout(() => {
      el.remove();
    }, 500);
  };

  const onTouch = (event) => {
    if (!el.contains(event.target)) {
      closeMenu();
    }
    document.removeEventListener(touchEventType, onTouch);
  };
  const touchEventType = isTouchDevice() ? 'touchstart' : 'mousedown';
  document.addEventListener(touchEventType, onTouch);

  for (const item of $$('.chats_dialog_menu_item', el)) {
    item.addEventListener('click', onItemClick);
  }

  const menu = initMenu(el);
  container.appendChild(el);
  return menu;
}

function downloadFile(url, filename) {
  const a = window.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
  const webkit = !!ua.match(/WebKit/i);
  return iOS && webkit && !ua.match(/CriOS/i);
}

export {
  Storage,
  Emitter,
  Tpl,
  escapeRegExp,
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
  formatDuration,
  cutText,
  formatCountShort,
  formatCountLong,
  formatFileSize,
  isTouchDevice,
  checkWebPSupport,
  convertWebP,
  blobToBuffer,
  loadScript,
  getEventPageXY,
  initAnimation,
  attachMenuListener,
  attachRipple,
  initMenu,
  buildMenu,
  downloadFile,
  isIosSafari
};
