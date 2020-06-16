import {$, attachRipple, buildLoaderElement, Tpl} from './utils';
import {ChatsController} from './chats_controller';
import {MessagesApiManager} from './api/messages_api_manager';
import {I18n} from './i18n';

const PollResultsController = new class {
  show(pollController) {
    this.container = $('.right_sidebar');
    this.container.parentNode.hidden = false;

    this.container.innerHTML = Tpl.html`
      <div class="sidebar_header">
        <button type="button" class="sidebar_close_button mdc-icon-button"></button>
        <div class="sidebar_header_title">Results</div>
      </div>
      <div class="poll_results_sidebar">
        <div class="poll_results_header">${pollController.poll.question}</div>
        <div class="poll_results_options_list"></div>
      </div>
    `;

    $('.sidebar_close_button', this.container).addEventListener('click', this.onBack);

    this.pollController = pollController;

    const loader = buildLoaderElement(this.container);

    pollController.loadAllVotes()
        .then((list) => {
          this.renderOptions(list, pollController.poll, pollController.results);
        })
        .finally(() => loader.remove());
  }

  renderOptions = (votesList, poll, results) => {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < votesList.length; i++) {
      const {count, users, votes, next_offset: nextOffset} = votesList[i];
      MessagesApiManager.updateUsers(users);
      const optionContainer = Tpl.html`
        <div class="poll_results_option" data-index="${i}">
          <div class="poll_results_option_header _cut_text">
            <div class="poll_results_option_title _cut_text">${poll.answers[i].text}</div>
            <div class="poll_results_option_percent">${ results.total_voters ? Math.round(count / results.total_voters * 100) : 0 }%</div>
          </div>
          <div class="poll_results_option_voters"></div>
          <div class="poll_results_option_show_more mdc-ripple-surface" data-index="${i}" hidden></div>
        </div>
      `.buildElement();

      this.renderVoters($('.poll_results_option_voters', optionContainer), votes);
      if (votes.length < count) {
        const moreButton = $('.poll_results_option_show_more', optionContainer);
        moreButton.innerText = I18n.getPlural('poll_n_more_voters', count - votes.length);
        moreButton.hidden = false;
        moreButton.dataset.nextOffset = nextOffset;
        moreButton.addEventListener('click', this.onMoreClick);
        attachRipple(moreButton);
      }

      frag.appendChild(optionContainer);
    }
    $('.poll_results_options_list', this.container).appendChild(frag);
  };

  renderVoters(container, votes) {
    const frag = document.createDocumentFragment();
    for (const vote of votes) {
      const user = MessagesApiManager.users.get(vote.user_id);
      const el = Tpl.html`
        <div class="poll_results_option_votes_item">
          <div class="poll_results_option_votes_item_photo"></div>
          <div class="poll_results_option_votes_item_name _cut_text">${MessagesApiManager.getUserName(user)}</div>
        </div>
      `.buildElement();
      frag.appendChild(el);
      ChatsController.loadPeerPhoto($('.poll_results_option_votes_item_photo', el), MessagesApiManager.getUserPeer(user));
    }
    container.appendChild(frag);
  }

  onMoreClick = (event) => {
    const button = event.currentTarget;
    const index = button.dataset.index;
    const nextOffset = button.dataset.nextOffset;
    const option = this.pollController.poll.answers[index].option;
    this.pollController.loadVotes(option, 50, nextOffset)
        .then(({count, votes, users, next_offset: nextOffset}) => {
          MessagesApiManager.updateUsers(users);
          const container = button.previousElementSibling;
          this.renderVoters(container, votes);
          if (count > container.childElementCount) {
            button.innerText = I18n.getPlural('poll_n_more_voters', count - container.childElementCount);
            button.dataset.nextOffset = nextOffset;
          } else {
            button.hidden = true;
          }
        });
  };

  onBack = () => {
    this.hide();
  };

  hide() {
    this.container.parentNode.hidden = true;
  }
};

export {PollResultsController};