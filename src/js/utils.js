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

export {
  Storage,
  Emitter,
  getDeferred,
  $,
  importTemplate,
  buildHtmlElement,
  getLabeledElements,
  cmpStrNum
};