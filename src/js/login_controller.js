import {$, importTemplate, getLabeledElements} from './utils.js';
import {ApiClient} from './api/api_client.js';
import {I18n} from './i18n.js';
import {App} from './app';
import {MDCTextField} from '@material/textfield/index';
import {MDCRipple} from '@material/ripple/component';
import {CountryCodesConfig} from './country_codes_config';
import {getCountryCodeEmojiFlag} from './emoji_config';
import {Tpl} from './utils';

const STEP_PHONE = 0;
const STEP_CODE = 1;
const STEP_PASSWORD = 2;
const STEP_SIGN_UP = 3;

const LoginController = new class {
  dom = {};

  mdcComponents = [];

  authParams = {};

  init() {
    const template = importTemplate('login');
    const container = $('.login_container', template);
    this.dom = getLabeledElements(container);
    this.dom.container = container;
    this.dom.form.addEventListener('submit', this.onFormSubmit);

    this.setStep(STEP_PHONE);

    document.body.append(container);
  }

  setDomContent(label, content) {
    this.dom[label].innerHTML = content;
  }

  setDomText(label, text) {
    this.dom[label].textContent = text;
  }

  setStep(step, params = {}) {
    this.step = step;

    switch (step) {
      case STEP_PHONE: {
        const img = '<div class="login_telegram_logo login_image_content"></div>';
        this.setDomContent('image', img, false);
        this.setDomContent('header', 'Sign in to Telegram');
        this.setDomContent('subheader', 'Please enter your phone number', false);
        this.dom.form.innerHTML = '';
        const countryInput = this.buildInput('Country');
        const phoneInput = this.buildInput('Phone Number', 'tel');
        const countryMenu = this.buildCountryMenu(countryInput, phoneInput);
        this.submitButton = this.buildButton('Next');
        this.countryTextField = new MDCTextField(countryInput);
        this.phoneTextField = new MDCTextField(phoneInput);
        this.dom.form.append(countryInput, countryMenu, phoneInput, this.submitButton);
        this.mdcComponents.push(this.phoneTextField);
        if (this.authParams.phoneNumber) {
          this.phoneTextField.value = this.authParams.phoneNumber;
        }
        this.phoneTextField.focus();
      } break;

      case STEP_CODE: {
        const img = '<tgs-player autoplay="" loop="" intermission="1000" mode="normal" src="tgs/TwoFactorSetupMonkeyTracking.tgs" background="transparent" class="login_image_content"></tgs-player>';
        this.setDomContent('image', img, false);
        this.setDomText('header', '+' + this.authParams.phoneNumber);
        this.setDomContent('subheader', 'We have sent you an SMS<br>with the code.');
        this.dom.header.append(this.buildEditPhoneButton());
        this.dom.form.innerHTML = '';
        const input = this.buildInput('Code');
        this.submitButton = this.buildButton('Next');
        this.codeTextField = new MDCTextField(input);
        this.dom.form.append(input, this.submitButton);
        this.mdcComponents.push(this.codeTextField);
      } break;

      case STEP_PASSWORD: {
        const img =  '<tgs-player autoplay="" loop="" intermission="3000" mode="normal" src="tgs/TwoFactorSetupMonkeyPeek.tgs" background="transparent" class="login_image_content"></tgs-player>';
        this.setDomContent('image', img);
        this.setDomContent('header', 'Enter a password');
        this.setDomContent('subheader','Your account is protected with<br>an additional password', false);
        this.dom.form.innerHTML = '';
        const input = this.buildPasswordInput();
        this.submitButton = this.buildButton('Next');
        this.passwordTextField = new MDCTextField(input);
        this.dom.form.append(input, this.submitButton);
        this.mdcComponents.push(this.passwordTextField);
        import('./api/password_manager.js');
      } break;

      case STEP_SIGN_UP: {
        const img =  '<div class="login_upload_photo login_image_content">';
        this.setDomContent('image', img);
        this.setDomContent('header', 'Your Name');
        this.setDomContent('subheader','Enter your name and add<br>a profile picture', false);
        this.dom.form.innerHTML = '';
        const firstNameInput = this.buildInput('Name');
        const lastNameInput = this.buildInput('Last Name (optional)');
        this.submitButton = this.buildButton('Start messaging');
        this.firstNameTextField = new MDCTextField(firstNameInput);
        this.lastNameTextField = new MDCTextField(lastNameInput);
        this.dom.form.append(firstNameInput, lastNameInput, this.submitButton);
        this.mdcComponents.push(this.firstNameTextField, this.lastNameTextField);
      } break;

    }
  }

  checkInput = () => {
    switch (this.step) {
      case STEP_PHONE: {
        const phoneNumber = this.phoneTextField.value.replace(/\D/g, '');
        if (phoneNumber.length >= 8) {
          this.submitButton.hidden = false;
        }
      } break;

      case STEP_CODE: {
        const code = this.codeTextField.value;
        if (code.length >= this.authParams.codeLength) {
          this.submitButton.hidden = false;
        }
      } break;

      case STEP_PASSWORD: {
        const password = this.passwordTextField.value;
        if (password) {
          this.submitButton.hidden = false;
        }
      } break;

      case STEP_SIGN_UP: {
        const firstName = this.firstNameTextField.value;
        if (firstName.trim()) {
          this.submitButton.hidden = false;
        }
      } break;
    }
  };

  onFormSubmit = (event) => {
    event.preventDefault();

    switch (this.step) {
      case STEP_PHONE:
        this.submitPhoneNumber();
        break;
      case STEP_CODE:
        this.submitConfirmationCode();
        break;
      case STEP_PASSWORD:
        this.submitPassword();
        break;
      case STEP_SIGN_UP:
        this.submitSignUp();
    }
  };

  submitPhoneNumber() {
    const phoneNumber = this.phoneTextField.value.replace(/\D/g, '');
    if (phoneNumber.length < 8) {
      this.phoneTextField.valid = false;
      return;
    }

    this.submitButton.disabled = true;

    ApiClient.callMethod('auth.sendCode', {
      phone_number: phoneNumber,
      api_id: App.API_ID,
      api_hash: App.API_HASH,
      settings: {_: 'codeSettings'}
    })
        .then((res) => {
          console.log(res);
          this.authParams.phoneNumber = phoneNumber;
          this.authParams.phoneCodeHash = res.phone_code_hash;
          this.authParams.codeType = res.type._;
          this.authParams.codeLength = res.type.length;
          this.setStep(STEP_CODE);
        })
        .catch((error) => {
          if (error.error_message === 'AUTH_RESTART') {
            this.submitPhoneNumber();
          } else {
            this.phoneTextField.valid = false;
            App.alert(this.getApiErrorDescription(error.error_code, error.error_message));
          }
        })
        .finally(() => {
          this.submitButton.disabled = false;
        });
  }

  submitConfirmationCode() {
    const code = this.codeTextField.value;
    if (code.length !== this.authParams.codeLength) {
      this.codeTextField.valid = false;
      return;
    }

    this.submitButton.disabled = true;

    ApiClient.callMethod('auth.signIn', {
      phone_number: this.authParams.phoneNumber,
      phone_code_hash: this.authParams.phoneCodeHash,
      phone_code: code
    })
        .then((auth) => {
          this.onAuthResult(auth);
        })
        .catch((error) => {
          if (error.error_message === 'PHONE_CODE_INVALID') {
            this.codeTextField.valid = false;
          } else if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
            this.setStep(STEP_PASSWORD);
          } else if (error.error_message === 'PHONE_NUMBER_UNOCCUPIED') {
            this.authParams.phoneCode = code;
            this.setStep(STEP_SIGN_UP);
          } else {
            this.codeTextField.valid = false;
            App.alert(this.getApiErrorDescription(error.error_code, error.error_message));
          }
        })
        .finally(() => {
          this.submitButton.disabled = false;
        });
  }

  async submitPassword() {
    const password = this.passwordTextField.value;
    if (!password.length) {
      this.passwordTextField.valid = false;
      return;
    }

    this.submitButton.disabled = true;

    const accountPassword = await ApiClient.callMethod('account.getPassword');
    const {getInputPasswordSRP} = await import('./api/password_manager.js');
    const inputPasswordSRP = await getInputPasswordSRP(password, accountPassword);

    ApiClient.callMethod('auth.checkPassword', {
      password: Object.assign({_: 'inputCheckPasswordSRP'}, inputPasswordSRP)
    })
        .then((auth) => {
          this.onAuthResult(auth);
        })
        .catch((error) => {
          this.passwordTextField.valid = false;
          App.alert(this.getApiErrorDescription(error.error_code, error.error_message));
        })
        .finally(() => {
          this.submitButton.disabled = false;
        });
  }

  submitSignUp() {
    const firstName = this.firstNameTextField.value;
    const lastName = this.lastNameTextField.value;

    if (!firstName) {
      this.firstNameTextField.valid = false;
      return;
    }

    this.submitButton.disabled = true;

    ApiClient.callMethod('auth.signUp', {
      phone_number: this.authParams.phoneNumber,
      phone_code_hash: this.authParams.phoneCodeHash,
      phone_code: this.authParams.phoneCode,
      first_name: firstName,
      last_name: lastName,
    })
        .then((auth) => {
          this.onAuthResult(auth);
        })
        .catch((error) => {
          this.passwordTextField.valid = false;
          App.alert(this.getApiErrorDescription(error.error_code, error.error_message));
        })
        .finally(() => {
          this.submitButton.disabled = false;
        });
  }

  onAuthResult(auth) {
    if (auth._ === 'auth.authorizationSignUpRequired') {
      this.setStep(STEP_SIGN_UP, {terms_of_service: auth.terms_of_service});
    } else {
      App.authDone(auth);
    }
  }

  getApiErrorDescription(code, message) {
    switch (message) {
      case 'PHONE_NUMBER_INVALID':
        return 'The phone number is invalid';
      case 'PHONE_NUMBER_OCCUPIED':
        return 'The phone number is already in use';
      case 'PHONE_NUMBER_UNOCCUPIED':
        return 'The phone number is not yet being used';
      case 'PHONE_CODE_EXPIRED':
        return 'The confirmation code has expired';
      case 'PHONE_NUMBER_BANNED':
        return 'The provided phone number is banned from telegram';
      case 'PHONE_NUMBER_FLOOD':
        return 'You asked for the code too many times';
      case 'PHONE_PASSWORD_FLOOD':
        return 'You have tried logging in too many times';
      case 'PHONE_PASSWORD_PROTECTED':
        return 'This phone is password protected';
    }
    if (code === 420 && message.startsWith('FLOOD_WAIT_')) {
      const seconds = +message.match(/\d+$/)[0];
      if (seconds < 60) {
        return I18n.getPlural('login_flood_pluralize_seconds', seconds);
      } else if (seconds < 60 * 60) {
        const minutes = Math.floor(seconds / 60);
        return I18n.getPlural('login_flood_pluralize_minutes', minutes);
      } else {
        const hours = Math.floor(seconds / 60 / 60);
        return I18n.getPlural('login_flood_pluralize_hours', hours);
      }
    }
    return 'An error occurred';
  }

  buildInput(label, type = 'text') {
    const input = Tpl.html`
      <div class="login_input mdc-text-field mdc-text-field--outlined">
        <input type="${type}" class="mdc-text-field__input">
        <div class="mdc-notched-outline">
          <div class="mdc-notched-outline__leading"></div>
          <div class="mdc-notched-outline__notch">
            <label class="mdc-floating-label">${label}</label>
          </div>
          <div class="mdc-notched-outline__trailing"></div>
        </div>
      </div>
    `.buildElement();
    input.querySelector('input').addEventListener('keyup', this.checkInput);
    return input;
  }

  buildPasswordInput() {
    const wrap = this.buildInput('Password', 'password');

    const input = $('input', wrap);

    const button = Tpl.html`<span class="login_password_visibility_button"></span>`.buildElement();
    button.addEventListener('click', () => {
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.classList.toggle('login_password_visibility_button-visible', visible);
    });

    wrap.append(button);

    return wrap;
  }

  buildButton(text, hidden = true) {
    const button = Tpl.html`
      <button class="login_button mdc-button mdc-button--unelevated" type="submit" ${hidden ? ' hidden' : ''}><span class="mdc-button__ripple"></span>${text}</button>
    `.buildElement();
    this.mdcComponents.push(new MDCRipple(button));
    return button;
  }

  buildCountryMenu(inputWrap, phoneInputWrap) {
    const arrow = Tpl.html`<div class="login_input_arrow"></div>`.buildElement();
    inputWrap.appendChild(arrow);

    const prefixes = [];
    const items = [];
    for (const country of CountryCodesConfig) {
      const [code, name, prefix] = country;
      prefixes.push([prefix.replace(/\s+/g, ''), country]);
      const emoji = getCountryCodeEmojiFlag(code);
      const el = Tpl.html`
        <li class="mdc-list-item login_countries_item" role="menuitem" data-code="${code}" data-name="${name.toLowerCase()}">
          <div class="login_countries_item_emoji">${emoji}</div>
          <div class="login_countries_item_country">${name}</div>
          <div class="login_countries_item_prefix">${prefix}</div>
        </li>
      `.buildElement();
      el.addEventListener('mousedown', onItemClick);
      items.push(el);
    }

    const el = Tpl.html`
      <div class="mdc-menu mdc-menu-surface login_countries_menu" hidden>
        <ul class="mdc-list login_countries_list" role="menu" aria-hidden="true" aria-orientation="vertical" tabindex="-1"></ul>
      </div>
    `.buildElement();

    $('.login_countries_list', el).append(...items);

    let itemsFound = items.length;

    const input = inputWrap.querySelector('input');
    input.addEventListener('focus', () => {
      if (itemsFound) {
        toggleVisibility(true);
      }
    });
    input.addEventListener('blur', () => {
      toggleVisibility(false);
    });
    input.addEventListener('input', () => {
      const value = input.value.trim().toLowerCase();
      itemsFound = 0;
      for (const item of items) {
        if (item.dataset.name.indexOf(value) > -1) {
          item.style.display = '';
          itemsFound++;
        } else {
          item.style.display = 'none';
        }
      }
      toggleVisibility(!!itemsFound);
    });

    function onItemClick(event) {
      event.preventDefault();
      const item = event.currentTarget;
      const name = $('.login_countries_item_country', item).innerText;
      const prefix = $('.login_countries_item_prefix', item).innerText.replace(/\s+/g, '');
      LoginController.countryTextField.value = name;
      LoginController.phoneTextField.value = prefix;
      LoginController.phoneTextField.focus();
    }

    function toggleVisibility(visible) {
      el.hidden = !visible;
      arrow.classList.toggle('login_input_arrow_open', visible);
    }

    const phoneInput = phoneInputWrap.querySelector('input');
    phoneInput.addEventListener('input', checkPhoneInput);

    function checkPhoneInput() {
      let val = phoneInput.value.replace(/(?<!^)\+|(?<=^|\+)0+|[^\d+]/g, '');
      if (val && !val.startsWith('+')) {
        val = '+' + val;
      }
      phoneInput.value = val;
      const matchedPrefixes = [];
      const maybePrefixes = [];
      for (const item of prefixes) {
        const [prefix] = item;
        if (val.startsWith(prefix)) {
          matchedPrefixes.push(item)
        } else if (prefix.startsWith(val)) {
          maybePrefixes.push(item);
        }
      }
      let matchedCountry;
      if (matchedPrefixes.length && !maybePrefixes.length) {
        if (matchedPrefixes.length === 1 || matchedPrefixes[0][0] !== matchedPrefixes[1][0]) {
          matchedCountry = matchedPrefixes.sort((a, b) => b[0].length - a[0].length)[0][1];
        }
      }
      LoginController.countryTextField.value = matchedCountry ? matchedCountry[1] : '';
    }

    return el;
  }

  buildEditPhoneButton() {
    const el = Tpl.html`
      <span class="login_edit_phone_button"></span>
    `.buildElement();
    el.addEventListener('click', () => {
      this.setStep(STEP_PHONE);
    });
    return el;
  }

  destroy() {
    this.dom.container.remove();
    this.dom = null;
    for (const component of this.mdcComponents) {
      component.destroy();
    }
    this.mdcComponents = [];
  }
};

window.LoginController = LoginController;

export {LoginController};
