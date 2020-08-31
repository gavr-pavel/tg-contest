import '../css/folders_settings.scss';
import {$, attachRipple, initScrollBorder, Tpl} from './utils';
import {FoldersEditController} from './folders_edit_controller';

class FoldersSettingsController {
  show() {
    this.container = Tpl.html`
      <div class="folders_settings_sidebar" hidden>
        <div class="sidebar_header">
          <button class="mdc-icon-button sidebar_back_button"></button>
          <div class="sidebar_header_title">Chat Folders</div>
        </div>
        <div class="folders_settings">
          <div class="folders_settings_intro">
            <tgs-player src="tgs/Folders_1.tgs" autoplay class="folders_settings_intro_image"></tgs-player>
            <div class="folders_settings_intro_text">Create folders for different groups of chats<br>and quickly switch between them.</div>
            <button class="folders_settings_intro_create_button">Create Folder</button>
          </div>
          <div class="folders_settings_filters_list folders_settings_filters_list-my" hidden>
            <div class="folders_settings_filters_list_title">Folders</div>
          </div>
          <div class="folders_settings_filters_list folders_settings_filters_list-recommended" hidden>
            <div class="folders_settings_filters_list_title">Recommended folders</div>
          </div>
        </div>
      </div>
    `.buildElement();

    $('.left_sidebar').appendChild(this.container);

    initScrollBorder($('.folders_settings', this.container));

    const backButtonEl = $('.sidebar_back_button', this.container);
    backButtonEl.addEventListener('click', this.onBack);
    attachRipple(backButtonEl);

    const createButtonEl = $('.folders_settings_intro_create_button', this.container);
    createButtonEl.addEventListener('click', () => {
      const filter = {
        _: 'dialogFilter',
        id: this.getNewFolderId(),
        title: '',
        pinned_peers: [],
        include_peers: [],
        exclude_peers: []
      };
      new FoldersEditController().show(filter, true, (filter) => {
        this.createFilter(filter);
      });
    });

    requestAnimationFrame(() => this.container.hidden = false);

    this.loadFolders();
  }

  hide() {
    this.container.hidden = true;
    setTimeout(() => this.container.remove(), 1000);
  }

  onBack = () => {
    this.hide();
  };

  async loadFolders() {
    const [filters, suggestedFilters] = await Promise.all([
      ApiClient.callMethod('messages.getDialogFilters'),
      ApiClient.callMethod('messages.getSuggestedDialogFilters')
    ]);

    this.filters = filters;
    this.suggestedFilters = suggestedFilters;

    if (filters.length) {
      this.renderFiltersList('my', filters);
    }
    if (suggestedFilters.length) {
      this.renderFiltersList('recommended', suggestedFilters);
    }
  }

  renderFiltersList(listName, filters) {
    const container = $(`.folders_settings_filters_list-${listName}`, this.container);
    const frag = document.createDocumentFragment();
    for (const item of filters) {
      const suggested = item._ === 'dialogFilterSuggested';
      const filter = suggested ? item.filter : item;
      const description = suggested ? item.description : this.getFilterDescription(filter);
      const el = this.buildFilterEl(filter, description, suggested);
      frag.appendChild(el);
    }
    container.appendChild(frag);
    container.hidden = false;
  }

  buildFilterEl(filter, description, suggested = false) {
    const el = Tpl.html`
      <div class="folders_settings_filter">
        <div class="folders_settings_filter_info">
          <div class="folders_settings_filter_title">${filter.title}</div>
          <div class="folders_settings_filter_description">${description}</div>
        </div>
        ${suggested ? Tpl.html`<button class="folders_settings_filter_add_button">Add</button>` : ''}
      </div>
    `.buildElement();
    if (suggested) {
      const addButton = $('.folders_settings_filter_add_button', el);
      addButton.addEventListener('click', () => this.addSuggestedFilter(el, filter));
    } else {
      el.addEventListener('click', () => this.editFilter(el, filter));
    }
    return el;
  }

  addSuggestedFilter(el, filter) {
    filter.id = this.getNewFolderId();
    this.createFilter(filter);
    el.remove();
    const recommendedContainer = $('.folders_settings_filters_list-recommended', this.container);
    if (!$('.folders_settings_filter', recommendedContainer)) {
      recommendedContainer.hidden = true;
    }
  }

  createFilter(filter) {
    DialogsApiManager.updateDialogFilter(filter);
    const el = this.buildFilterEl(filter, this.getFilterDescription(filter));
    $('.folders_settings_filters_list-my', this.container).appendChild(el);
  }

  editFilter(el, filter) {
    new FoldersEditController().show(filter, false, () => {
      DialogsApiManager.updateDialogFilter(filter);
      if (filter) {
        el.replaceWith(this.buildFilterEl(filter, this.getFilterDescription(filter)));
      } else {
        el.remove();
      }
    });
  }

  getFilterDescription(filter) {
    let description = '';
    const exceptNum = filter.exclude_peers.length;
    if (filter.contacts && filter.non_contacts && filter.groups && filter.broadcasts && filter.bots) {
      const types = [
        filter.exclude_muted && 'unmuted',
        filter.exclude_read && 'unread',
        filter.exclude_archived && 'unarchived',
      ].filter(a => a).join(', ');
      description = `All ${types} `;
      if (exceptNum) {
        description += ` except ${exceptNum} ${exceptNum > 1 ? 'chats' : 'chat'}`;
      } else {
        description += ' chats';
      }
    } else {
      description = [
        filter.contacts && 'Contacts',
        filter.non_contacts && 'Non-Contacts',
        filter.groups && 'Groups',
        filter.broadcasts && 'Channels',
        filter.bots && 'Bots',
      ].filter(a => a).join(', ');
      if (filter.include_peers.length) {
        description += ` and ${filter.include_peers.length}`;
        if (!exceptNum) {
          description += ' chats';
        }
      }
      if (exceptNum) {
        description += ` except ${exceptNum} ${exceptNum > 1 ? 'chats' : 'chat'}`;
      }
    }
    return description;
  }

  getNewFolderId() {
    while (1) {
      const id = Math.round(Math.random() * 255);
      const found = this.filters.some((f) => f.id === id);
      if (!found) {
        return id;
      }
    }
  }
}

export {FoldersSettingsController};
