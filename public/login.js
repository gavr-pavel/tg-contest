import {$, importTemplate, getLabeledElements, buildHtmlElement} from './utils.js';
import {ApiClient} from './api_client.js';
import {I18n} from './i18n.js';

// const TEST_PHONE_NUMBER = '9996618935';
// const TEST_PHONE_CODE = '11111';

// await ApiClient.callMethod('auth.signUp', {phone_number: '9996618935', phone_code_hash: 'ac3525490447971a53', phone_code: '11111', first_name: 'Hello', last_name: 'World'})

const STEP_PHONE = 0;
const STEP_CODE = 1;
const STEP_PASSWORD = 2;
const STEP_TERMS = 3;
const STEP_SETUP_PROFILE = 4;

class Login {
  dom = {};

  mdcComponents = [];

  authParams = {};

  constructor(app) {

  }

  init() {
    const template = importTemplate('login');
    const container = $('.login_container', template);

    this.dom = getLabeledElements(container);

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
        const img = '<img src="logo.svg" alt="Telegram" class="login_image_content">';
        this.setDomContent('image', img, false);
        this.setDomContent('header', 'Sign in to Telegram');
        this.setDomContent('subheader', 'Please confirm your country<br>and enter your phone number.', false);
        this.dom.form.innerHTML = '';
        const input = this.buildInput('Phone Number');
        this.phoneTextField = new mdc.textField.MDCTextField(input);
        this.dom.form.append(input);
      } break;

      case STEP_CODE: {
        const img = '<tgs-player autoplay="" loop="" intermission="1000" mode="normal" src="tgs/TwoFactorSetupMonkeyTracking.tgs" background="transparent" class="login_image_content"></tgs-player>';
        this.setDomContent('image', img, false);
        this.setDomText('header', this.authParams.phoneNumber);
        this.setDomContent('subheader', 'We have sent you an SMS<br>with the code.');
        this.dom.form.innerHTML = '';
        const input = this.buildInput('Code');
        this.codeTextField = new mdc.textField.MDCTextField(input);
        this.dom.form.append(input);
      } break;

      case STEP_PASSWORD: {
        const img =  '<tgs-player autoplay="" loop="" intermission="1000" mode="normal" src="tgs/TwoFactorSetupMonkeyClose.tgs" background="transparent" class="login_image_content"></tgs-player>';
        this.setDomContent('image', img);
        this.setDomContent('header', 'Enter a password');
        this.setDomContent('subheader','Your account is protected with<br>an additional password.', false);
        this.dom.form.innerHTML = '';
        this.dom.form.append(this.buildInput('Password', {type: 'password'}));
      } break;

      case STEP_TERMS: {
        const dialogEl = this.buildDialog('Terms of Service', params.terms_of_service.text, 'Agree');
        const dialog = new mdc.dialog.MDCDialog(dialogEl);
      } break;

      case STEP_SETUP_PROFILE: {

      } break;
    }
  }

  onFormSubmit = (event) => {
    event.preventDefault();

    switch (this.step) {
      case STEP_PHONE:
        this.submitPhoneNumber();
        break;
      case STEP_CODE:
        this.submitConfirmationCode();
        break;
    }
  };

  submitPhoneNumber() {
    const phoneNumber = this.phoneTextField.value.replace(/\D/g, '');
    if (phoneNumber.length < 8) {
      this.phoneTextField.valid = false;
      return;
    }

    ApiClient.callMethod('auth.sendCode', {
      phone_number: phoneNumber,
      api_id: app.API_ID,
      api_hash: app.API_HASH,
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
        console.log(error);
        this.phoneTextField.valid = false;
        app.alert(this.getApiErrorDescription(error.error_code, error.error_message));
      });
  }

  submitConfirmationCode() {
    const code = this.codeTextField.value;
    if (code.length !== this.authParams.codeLength) {
      this.codeTextField.valid = false;
      return;
    }

    ApiClient.callMethod('auth.signIn', {
      phone_number: this.authParams.phoneNumber,
      phone_code_hash: this.authParams.phoneCodeHash,
      phone_code: code
    })
        .then((auth) => {
          if (auth._ === 'auth.authorizationSignUpRequired') {
            this.setStep(STEP_TERMS, {terms_of_service: auth.terms_of_service});
          }
          console.log(auth);
        })
        .catch((error) => {
          if (error.error_message === 'SESSION_PASSWORD_NEEDED') {
            this.setStep(STEP_PASSWORD);
          } else {
            this.codeTextField.valid = false;
            app.alert(this.getApiErrorDescription(error.error_code, error.error_message));
          }
        });
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

  buildInput(label) {
    return buildHtmlElement(`
      <div class="login_input mdc-text-field mdc-text-field--outlined">
        <input type="tel" name="phone_number" class="mdc-text-field__input">
        <div class="mdc-notched-outline">
          <div class="mdc-notched-outline__leading"></div>
          <div class="mdc-notched-outline__notch">
            <label class="mdc-floating-label">${label}</label>
          </div>
          <div class="mdc-notched-outline__trailing"></div>
        </div>
      </div>
    `);
  }

  buildDialog(title, content, confirmText) {
    return buildHtmlElement(`
      <div class="mdc-dialog">
        <div class="mdc-dialog__container">
          <div class="mdc-dialog__surface">
            <!-- Title cannot contain leading whitespace due to mdc-typography-baseline-top() -->
            <h2 class="mdc-dialog__title">${title}</h2>
            <div class="mdc-dialog__content">${content}</div>
            <footer class="mdc-dialog__actions">
              <!--button type="button" class="mdc-button mdc-dialog__button" data-mdc-dialog-action="no">
                <span class="mdc-button__label">No</span>
              </button-->
              <button type="button" class="mdc-button mdc-dialog__button" data-mdc-dialog-action="yes">
                <span class="mdc-button__label">${confirmText}</span>
              </button>
            </footer>
          </div>
        </div>
        <div class="mdc-dialog__scrim"></div>
      </div>    
    `);
  }
}

export {Login};
