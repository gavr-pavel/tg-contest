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

const emojiRegex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;

function isEmoji(char) {
  return emojiRegex.test(char);
}

export {
  Storage,
  Emitter,
  getDeferred,
  debounce,
  $,
  importTemplate,
  buildHtmlElement,
  getLabeledElements,
  cmpStrNum,
  emojiRegex,
  isEmoji
};
