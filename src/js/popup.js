import {$, Tpl} from './utils';
import '../css/popup.scss';

class Popup {
  constructor({title, content, buttonText = null, onButtonClick = null}) {
    let button = '';
    if (buttonText) {
      button = Tpl.html`
        <button class="mdc-button mdc-button--unelevated popup_header_button">${buttonText}</button>
      `;
    }

    this.el = Tpl.html`
      <div class="popup_layer" hidden>
        <div class="popup">
          <div class="popup_header">
            <button class="mdc-icon-button popup_close_button"></button>
            <div class="popup_title">${title}</div>
            ${button}        
          </div>
          <div class="popup_content">${content}</div>
        </div>
      </div>
    `.buildElement();

    this.el.addEventListener('click', this.onLayerClick);
    $('.popup_close_button', this.el).addEventListener('click', this.hide);

    if (button && onButtonClick) {
      $('.popup_header_button', this.el).addEventListener('click', onButtonClick);
    }
  }

  onLayerClick = (event) => {
    if (event.target === event.currentTarget) {
      this.hide();
    }
  }

  show = () => {
    $('.main_container').appendChild(this.el);
    requestAnimationFrame(() => {
      this.el.hidden = false;
    });
  }

  hide = () => {
    this.el.hidden = true;
    setTimeout(() => {
      this.el.remove();
      this.el = null;
    }, 400);
  }
}

export {Popup};
