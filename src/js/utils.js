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

function getDeferred() {
  const deferred = {};
  deferred.promise = new Promise((resolve, reject) => {
    deferred.resolve = resolve;
    deferred.reject = reject;
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

function encodeHtmlEntities(text) {
  return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

function buildHtmlElement(htmlStr) {
  const tmp = document.createElement('div');
  tmp.innerHTML = htmlStr;
  return tmp.firstElementChild;
}

function buildLoaderElement(container = null) {
  const el = buildHtmlElement('<div class="lds-ring"><div></div><div></div><div></div><div></div></div>');
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

function formatDateFull(ts) {
  const date = new Date(ts * 1000);
  return `${ date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
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

function formatTime(ts) {
  const date = new Date(ts * 1000);
  return date.getHours() + ':' + date.getMinutes().toString().padStart(2, '0');
}

export {
  Storage,
  Emitter,
  getDeferred,
  debounce,
  $,
  importTemplate,
  buildHtmlElement,
  buildLoaderElement,
  encodeHtmlEntities,
  getLabeledElements,
  cmpStrNum,
  wait,
  randomLong,
  formatDateFull,
  formatDateRelative,
  formatTime
};
