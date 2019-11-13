import {$, importTemplate, getLabeledElements, buildHtmlElement} from './utils.js';
import {ApiClient} from './api_client.js';

const STEP_PHONE = 0;
const STEP_CODE = 1;
const STEP_PASSWORD = 2;

class Login {
  dom = {};

  mdcComponents = [];

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

  setStep(step, params) {
    this.step = step;

    switch (step) {
      case STEP_PHONE: {
        const img = '<img src="logo.svg" alt="Telegram" class="login_image_content">';
        this.setDomContent('image', img, false);
        this.setDomContent('header', 'Sign in to Telegram');
        this.setDomContent('subheader', 'Please confirm your country<br>and enter your phone number.', false);
        this.dom.form.append(this.buildInput('Phone number'));
      } break;

      case STEP_CODE: {
        const img = '<tgs-player autoplay="" loop="" intermission="1000" mode="normal" src="tgs/TwoFactorSetupMonkeyTracking.tgs" background="transparent" class="login_image_content"></tgs-player>';
        this.setDomContent('image', img, false);
        this.setDomText('header', params.phoneNumber);
        this.setDomContent('subheader', 'We have sent you an SMS<br>with the code.');
      } break;

      case STEP_PASSWORD: {
        const img =  '<tgs-player autoplay="" loop="" intermission="1000" mode="normal" src="tgs/TwoFactorSetupMonkeyClose.tgs" background="transparent" class="login_image_content"></tgs-player>';
        this.setDomContent('image', img);
        this.setDomContent('header', 'Enter a password');
        this.setDomContent('subheader','Your account is protected with<br>an additional password.', false);
      } break;
    }
  }

  onFormSubmit = (event) => {
    event.preventDefault();

    switch (this.step) {
      case STEP_PHONE: {
        const phoneNumber = this.phoneTextField.value;
        if (phoneNumber.length)
        ApiClient.callMethod('auth.sendCode', {
          phone_number: phoneNumber,
          api_id: app.API_ID,
          api_hash: app.API_HASH,
        })
            .then(this.onAuthCodeSent)
            .catch(this.onApiError);
      } break;
    }
  };

  getFormValue(field) {
    return this.dom.form.elements[field].value;
  }

  onAuthCodeSent = (res) => {
    console.log(res);

    const options = {
      codeType: res.type._,
      codeHash: res.phone_code_hash,
      phoneRegistered: res.pFlags.phone_registered,
    };

    this.setStep(STEP_CODE, options);
  };

  onApiError = (error) => {
    debugger;
    app.alert(this.getApiErrorDescription(error.error_code, error.error_message));
  };

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
    }
    return 'An error occurred';
  }

  buildInput(label) {
    const input = buildHtmlElement(`
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

    this.phoneTextField = new mdc.textField.MDCTextField(input);

    return input;
  }
}


export {Login};
