import {$, importTemplate, getLabeledElements} from './utils.js';
import {ApiClient} from './api/api_client.js';
import {I18n} from './i18n.js';
import {App} from './app';
import {MDCTextField} from '@material/textfield/index';
import {CountryCodesConfig} from './country_codes_config';
import {getCountryCodeEmojiFlag} from './emoji_config';
import {attachRipple, Tpl} from './utils';

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

    this.preloadAnimations();

    this.setStep(STEP_PHONE);

    document.body.append(container);
  }

  setDomContent(label, content) {
    if (typeof content === 'string') {
      this.dom[label].innerHTML = content;
    } else {
      this.dom[label].innerHTML = '';
      this.dom[label].append(content);
    }
  }

  async setNearestCountry() {
    const {country} = await ApiClient.callMethod('help.getNearestDc');
    if (this.countryTextField.value || this.phoneTextField.value) {
      return;
    }
    const found = CountryCodesConfig.find(([code]) => code === country);
    if (found) {
      const [, countryName, prefix] = found;
      this.countryTextField.value = countryName;
      this.phoneTextField.value = prefix.replace(/\s+/g, '') + ' ';
    }
  }

  setDomText(label, text) {
    this.dom[label].textContent = text;
  }

  setAnimatedImage(animation, segments = null) {
    this.setDomContent('image', animation);
    try {
      if (segments) {
        animation.getLottie().playSegments(segments, true);
      } else {
        animation.play();
      }
    } catch (e) {
      console.log('Can not play animation', animation);
    }
  }

  setStep(step) {
    this.step = step;

    switch (step) {
      case STEP_PHONE: {
        this.setDomContent('image', '<div class="login_telegram_logo login_image_content"></div>');
        this.setDomContent('header', 'Sign in to Telegram');
        this.setDomContent('subheader', 'Please enter your phone number', false);
        this.dom.form.innerHTML = '';
        const countryInput = this.buildInput('Country');
        const phoneInput = this.buildInput('Phone Number', {type:'tel'});
        const countryMenu = this.buildCountryMenu(countryInput, phoneInput);
        this.submitButton = this.buildButton('Next');
        this.countryTextField = new MDCTextField(countryInput);
        this.phoneTextField = new MDCTextField(phoneInput);
        this.dom.form.append(countryInput, countryMenu, phoneInput, this.submitButton);
        this.mdcComponents.push(this.phoneTextField);
        if (this.authParams.phoneNumber) {
          this.phoneTextField.value = this.authParams.phoneNumber;
        } else {
          this.setNearestCountry();
        }
        setTimeout(() => this.phoneTextField.focus(), 0);
      } break;

      case STEP_CODE: {
        this.setAnimatedImage(this.animations.idle);
        this.setDomText('header', '+' + this.authParams.phoneNumber);
        this.setDomContent('subheader', 'We have sent you an SMS<br>with the code.');
        this.dom.header.append(this.buildEditPhoneButton());
        this.dom.form.innerHTML = '';
        const input = this.buildCodeInput();
        this.submitButton = this.buildButton('Next');
        this.codeTextField = new MDCTextField(input);
        this.dom.form.append(input, this.submitButton);
        $('input', input).focus();
        this.mdcComponents.push(this.codeTextField);
      } break;

      case STEP_PASSWORD: {
        this.setAnimatedImage(this.animations.close, [0, 50]);
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
        const img =  Tpl.html`<div class="login_upload_photo login_image_content">`.buildElement();
        img.addEventListener('click', this.chooseProfilePhoto);
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
          this.submitConfirmationCode();
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
          this.uploadProfilePhoto();
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

  buildInput(label, attr = {}) {
    const inputAttr = Object.entries(attr).map(([k, v]) => `${k}="${v}"`).join(' ');
    const input = Tpl.html`
      <div class="login_input mdc-text-field mdc-text-field--outlined">
        <input ${Tpl.raw`${inputAttr}`} class="mdc-text-field__input">
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

  buildCodeInput() {
    const wrap = this.buildInput('Code', {inputmode: 'numeric'});
    const input = wrap.querySelector('input');
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
      playTrackingAnimation();
    });

    let animationEl;
    let animationPlaying = false;
    const playTrackingAnimation = () => {
      if (animationPlaying) {
        return;
      }
      animationPlaying = true;
      if (animationEl) {
        animationEl.stop();
        animationEl.play();
      } else {
        animationEl = this.animations.tracking;
        this.setAnimatedImage(animationEl);
        animationEl.addEventListener('complete', () => {
          animationPlaying = false;
        });
      }
    };

    return wrap;
  }

  buildPasswordInput() {
    const wrap = this.buildInput('Password', {type: 'password'});
    const input = $('input', wrap);
    const button = Tpl.html`<span class="login_password_visibility_button"></span>`.buildElement();
    wrap.append(button);

    button.addEventListener('click', () => {
      const visible = input.type === 'password';
      input.type = visible ? 'text' : 'password';
      button.classList.toggle('login_password_visibility_button-visible', visible);
      if (visible) {
        this.setAnimatedImage(this.animations.peek, [0, 21]);
      } else {
        this.setAnimatedImage(this.animations.peek, [21, 33]);
      }
    });

    return wrap;
  }

  buildButton(text, hidden = true) {
    const button = Tpl.html`
      <button class="login_button mdc-button mdc-button--unelevated" type="submit" ${hidden ? ' hidden' : ''}><span class="mdc-button__ripple"></span>${text}</button>
    `.buildElement();
    this.mdcComponents.push(...attachRipple(button));
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
    phoneInput.addEventListener('input', () => {
      let val = phoneInput.value;
      if (val && val !== '+') {
        val = val.replace(/^0+|\D/g, '');
        if (val) {
          val = '+' + val;
        }
      }
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
          const prefix = matchedPrefixes.sort((a, b) => b[0].length - a[0].length)[0]; // longest matched prefix
          if (val !== prefix[0]) {
            val = val.replace(prefix[0], prefix[0] + ' ');
          }
          matchedCountry = prefix[1];
        }
      }
      phoneInput.value = val;
      LoginController.countryTextField.value = matchedCountry ? matchedCountry[1] : '';
    });

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

  preloadAnimations() {
    this.animations = {
      idle: Tpl.html`<tgs-player mode="normal" src="tgs/TwoFactorSetupMonkeyIdle.tgs" class="login_image_content"></tgs-player>`.buildElement(),
      tracking: Tpl.html`<tgs-player mode="normal" src="tgs/TwoFactorSetupMonkeyTracking.tgs" class="login_image_content"></tgs-player>`.buildElement(),
      close: Tpl.html`<tgs-player mode="normal" src="tgs/TwoFactorSetupMonkeyClose.tgs" class="login_image_content"></tgs-player>`.buildElement(),
      peek: Tpl.html`<tgs-player mode="normal" src="tgs/TwoFactorSetupMonkeyPeek.tgs" class="login_image_content"></tgs-player>`.buildElement(),
    };
    const wrap = document.createElement('div');
    wrap.hidden = true;
    wrap.append(...Object.values(this.animations));
    this.dom.container.appendChild(wrap);
  }

  chooseProfilePhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.click();
    input.addEventListener('change', () => {
      this.profilePhotoFile = input.files[0];
      const url = URL.createObjectURL(this.profilePhotoFile);
      const photoEl = $('.login_upload_photo');
      photoEl.style.backgroundImage = `url(${url})`;
      photoEl.style.backgroundSize = 'cover';
      this.profiilePhotoInput = null;
    });
    this.profiilePhotoInput = input; // prevent gc
  };

  // showProfilePhotoCropBox(file) {
  //   const layer = Tpl.html`
  //     <div class="login_profile_photo_layer">
  //         <div class="login_profile_photo_box">
  //           <div class="login_profile_photo_box_title">Drag to Reposition</div>
  //           <div class="login_profile_photo_box_close_btn"></div>
  //           <div class="login_profile_photo_box_confirm_btn"></div>
  //           <div class="login_profile_photo_box_image_wrap">
  //             <img class="login_profile_photo_box_image" width="360" src="${URL.createObjectURL(file)}">
  //           </div>
  //         </div>
  //     </div>
  //   `.buildElement();
  //
  //   document.body.appendChild(layer);
  //
  //   const image = $('.login_profile_photo_box_image', layer);
  //   const imageWrap = image.parentElement;
  //
  //   console.log(image.naturalWidth, image.naturalHeight);
  //
  //   let scale = 1;
  //
  //   imageWrap.addEventListener('mousewheel', (event) => {
  //     scale += event.deltaY / 10;
  //     scale = Math.min(5, Math.max(1, scale));
  //     applyTransform();
  //   });
  //
  //   let dragging = false;
  //   let translateX = 0;
  //   let translateY = 0;
  //
  //   let lastMouseX;
  //   let lastMouseY;
  //
  //   imageWrap.addEventListener('mousedown', (event) => {
  //     event.preventDefault();
  //     dragging = true;
  //     lastMouseX = event.pageX;
  //     lastMouseY = event.pageY;
  //     console.log('mousedown', event.pageX, event.pageY);
  //   });
  //   imageWrap.addEventListener('mouseup', () => {
  //     dragging = false;
  //   });
  //   imageWrap.addEventListener('mousemove', (event) => {
  //     if (dragging) {
  //       translateX += event.pageX - lastMouseX;
  //       translateY += event.pageY - lastMouseY;
  //       lastMouseX = event.pageX;
  //       lastMouseY = event.pageY;
  //       console.log('mousemove', event.pageX, event.pageY);
  //       applyTransform();
  //     }
  //   });
  //
  //   function applyTransform() {
  //     image.style.transform = `scale(${scale}) translate(${translateX}px, ${translateY}px)`;
  //   }
  // }

  async uploadProfilePhoto() {
    if (!this.profilePhotoFile) {
      return;
    }
    const inputFile = await FileApiManager.uploadFile(this.profilePhotoFile);
    await ApiClient.callMethod('photos.uploadProfilePhoto', {
      file: inputFile
    });
    MessagesApiManager.reloadUser(App.getAuthUserId());
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
