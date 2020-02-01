import {$, importTemplate, getLabeledElements, buildHtmlElement} from './utils.js';
import {ApiClient} from './api/api_client.js';
import {I18n} from './i18n.js';
import {App} from './app';
import {MDCTextField} from '@material/textfield/index';
import {MDCRipple} from '@material/ripple/component';

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

    import('./api/password_manager.js');
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
        const input = this.buildInput('Phone Number', 'tel');
        this.submitButton = this.buildButton('Next');
        this.phoneTextField = new MDCTextField(input);
        this.dom.form.append(input, this.submitButton);
        this.mdcComponents.push(this.phoneTextField);
      } break;

      case STEP_CODE: {
        const img = '<tgs-player autoplay="" loop="" intermission="1000" mode="normal" src="tgs/TwoFactorSetupMonkeyTracking.tgs" background="transparent" class="login_image_content"></tgs-player>';
        this.setDomContent('image', img, false);
        this.setDomText('header', '+' + this.authParams.phoneNumber);
        this.setDomContent('subheader', 'We have sent you an SMS<br>with the code.');
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
        const input = this.buildInput('Password', 'password');
        this.submitButton = this.buildButton('Next');
        this.passwordTextField = new MDCTextField(input);
        this.dom.form.append(input, this.submitButton);
        this.mdcComponents.push(this.passwordTextField);
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

    const accountPassword = await ApiClient.callMethod('account.getPassword');
    console.log(accountPassword);
    const {getInputPasswordSRP} = await import('./api/password_manager.js');
    const inputPasswordSRP = await getInputPasswordSRP(password, accountPassword);

    this.submitButton.disabled = true;

    // ApiClient.callMethod('auth.checkPassword', {
    //   password_hash: passwordHash
    // })
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

  loadPasswordManager() {
    return import('./api/password_manager.js');
  }

  async getPasswordHash(password, accountPassword) {
    const {bufferConcat} = await import('./mtproto/bin.js');
    const {sha256Hash} = await import('./mtproto/crypto.js');
    const passwordBytes = new TextEncoder().encode(password);
    return sha256Hash(bufferConcat(accountPassword.current_salt, passwordBytes, accountPassword.current_salt));
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
    const input = buildHtmlElement(`
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
    `);
    input.querySelector('input').addEventListener('keyup', this.checkInput);
    return input;
  }

  buildButton(text, hidden = true) {
    const button = buildHtmlElement(`
      <button class="login_button mdc-button mdc-button--unelevated" type="submit" ${hidden ? ' hidden' : ''}><span class="mdc-button__ripple"></span>${text}</button>
    `);
    this.mdcComponents.push(new MDCRipple(button));
    return button;
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
