import {$, $$, formatCountLong, formatDuration, initAnimation, Tpl} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';
import {ChatsController} from './chats_controller';
import {PollResultsController} from './poll_results_controller';
import {I18n} from './i18n';
import {ApiClient} from './api/api_client';

const DEBUG = true;

class PollController {
  constructor(messageEl, message) {
    this.container = $('.poll', messageEl);
    this.message = message;
    this.poll = message.media.poll;
    this.results = message.media.results;

    for (const option of $$('.poll_option', this.container)) {
      option.addEventListener('click', this.onOptionClick);
    }
    if (this.poll.multiple_choice) {
      this.submitButton = $('.poll_vote_button', this.container);
      this.submitButton.addEventListener('click', () => this.submit());
    }
    if (this.poll.public_voters) {
      this.resultsButton = $('.poll_results_button', this.container);
      this.resultsButton.addEventListener('click', () => this.showResults());
    }
    if (this.poll.quiz) {
      this.solutionButton = $('.poll_quiz_solution_button', this.container);
      this.solutionButton.addEventListener('click', () => this.showSolution());
    }
    if (this.poll.close_date || this.poll.close_period) {
      this.initQuizTimer();
    }
    if (this.results.recent_voters) {
      this.showRecentVoters();
    }

    MessagesApiManager.emitter.on('messagePollUpdate', this.onPollUpdate);

    if (DEBUG) {
      messageEl.pollController = this;
      window.PollsWeekSet.add(this);
    }
  }

  onOptionClick = (event) => {
    if (this.isVotedPoll()) {
      return;
    }

    const option = event.currentTarget;
    option.classList.toggle('poll_option-selected');

    if (this.poll.multiple_choice) {
      const anySelected = !!$('.poll_option-selected', this.container);
      this.submitButton.disabled = !anySelected;
    } else {
      this.submit();
    }
  };

  showRecentVoters() {
    const frag = document.createDocumentFragment();
    for (const userId of this.results.recent_voters) {
      const el = Tpl.html`<div class="poll_recent_voters_item"></div>`.buildElement();
      frag.appendChild(el);
      ChatsController.loadPeerPhoto(el, MessagesApiManager.getPeerById(userId));
    }
    $('.poll_recent_voters', this.container).appendChild(frag);
  }

  async submit() {
    const options = Array.from($$('.poll_option-selected', this.container))
        .map((el) => this.poll.answers[el.dataset.index].option);

    await this.sendVote(options);

    if (this.poll.quiz) {
      const selectedOption = $('.poll_option-selected', this.container);
      if (selectedOption.classList.contains('poll_option-correct')) {
        this.confetti();
      } else {
        this.wiggle();
        if (this.results.solution) {
          this.showSolution();
        }
      }
    }
  }

  isVotedPoll() {
    return this.container.classList.contains('poll-voted');
  }

  wiggle() {
    const messageEl = this.container.closest('.message');
    messageEl.classList.add('message-wiggle');
  }

  confetti() {
    // todo
  }

  initQuizTimer() {
    const poll = this.poll;
    console.log('poll with timer', poll);
    let closeDate;
    let closePeriod;
    if (poll.close_date) {
      closeDate = (poll.close_date - ApiClient.getServerTimeOffset()) * 1000;
      closePeriod = closeDate - Date.now();
    } else {
      closePeriod = poll.close_period * 1000;
      closeDate = Date.now() + closePeriod;
    }

    const textEl = Tpl.html`<span class="poll_quiz_timer_text"></span>`.buildElement();
    const progressEl = Tpl.html`
      <svg class="poll_quiz_timer_svg" viewBox="8 8 16 16" xmlns="http://www.w3.org/2000/svg">
        <circle class="poll_quiz_timer_circle" cx="16" cy="16" r="7" transform="matrix(0 -1 -1 0 32 32)"/>
      </svg>
    `.buildElement();

    const timerContainer = $('.poll_quiz_timer', this.container);
    timerContainer.append(textEl, progressEl);

    let lastLeftSeconds;

    const [startAnimation, stopAnimation] = initAnimation(() => {
      const now = Date.now();
      if (now >= closeDate) {
        if (this.stopTimer) {
          this.stopTimer();
          this.container.classList.add('poll-voted');
        }
      } else {
        const timeLeft = Math.max(0, closeDate - now);
        const leftSeconds = Math.floor(timeLeft / 1000);
        if (leftSeconds !== lastLeftSeconds) {
          lastLeftSeconds = leftSeconds;
          textEl.innerText = formatDuration(leftSeconds);
        }
        progressEl.firstElementChild.style.setProperty('--progress-value', timeLeft / closePeriod);
      }
    });

    this.stopTimer = () => {
      stopAnimation();
      timerContainer.innerHTML = '';
      this.stopTimer = null;
    }

    startAnimation();
  }

  showSolution() {
    const results = this.results;
    const solution = MessagesController.processTextEntities(results.solution, results.solution_entities);
    const solutionBubble = Tpl.html`<div class="poll_solution_bubble" hidden>${solution}</div>`.buildElement();
    $('.messages_container').appendChild(solutionBubble);
    requestAnimationFrame(() => solutionBubble.hidden = false);
    let hideTimeout;
    const setHideTimeout = (ms) => {
      hideTimeout = setTimeout(() => {
        solutionBubble.hidden = true;
        setTimeout(() => solutionBubble.remove(), 200);
      }, ms);
    };
    solutionBubble.addEventListener('mouseenter', () => clearTimeout(hideTimeout));
    solutionBubble.addEventListener('mouseleave', () => setHideTimeout(500));
    setHideTimeout(3000);
  }

  async sendVote(options) {
    const peer = MessagesApiManager.getMessageDialogPeer(this.message);
    const updates = await ApiClient.callMethod('messages.sendVote', {
      peer: MessagesApiManager.getInputPeer(peer),
      msg_id: this.message.id,
      options
    });
    MessagesApiManager.onUpdates(updates);
  }

  showResults() {
    PollResultsController.show(this);
  }

  loadAllVotes() {
    const requests = this.poll.answers.map((answer) => this.loadVotes(answer.option, 4));
    return Promise.all(requests);
  }

  loadVotes(option, limit, offset = '') {
    const peer = MessagesApiManager.getMessageDialogPeer(this.message);
    const inputPeer = MessagesApiManager.getInputPeer(peer);
    return ApiClient.callMethod('messages.getPollVotes', {
      peer: inputPeer,
      id: this.message.id,
      option,
      limit,
      offset
    });
  }

  updateResults(results) {
    this.results = results;
    const poll = this.poll;
    const total = results.total_voters;
    let voted = false;

    if (results.results) {
      for (const option of $$('.poll_option', this.container)) {
        const index = option.dataset.index;
        const answerResult = results.results[index];
        const percent = total ? Math.round(answerResult.voters / total * 100) : 0;
        const percentEl = $('.poll_option_percent', option);
        percentEl.innerText = percent + '%';
        percentEl.classList.toggle('poll_option_percent-long', percent === 100);
        const scaleEl = $('.poll_option_scale', option);
        scaleEl.style.setProperty('--voters-percent', percent + '%');
        option.classList.toggle('poll_option-selected', !!answerResult.chosen);
        if (poll.quiz) {
          option.classList.toggle('poll_option-correct', !!answerResult.correct);
          option.classList.toggle('poll_option-wrong', !answerResult.correct);
        }
        if (answerResult.chosen) {
          voted = true;
        }
      }
    }

    this.container.classList.toggle('poll-voted', voted);
    if (poll.quiz) {
      this.solutionButton.hidden = !results.solution;
    }
    if (voted && this.stopTimer) {
      this.stopTimer();
    }
    $('.poll_voters', this.container).innerText = MessagesController.formatPollFooterText(poll, total);
  }

  onPollUpdate = (event) => {
    const data = event.detail;
    if (data.poll_id === this.poll.id) {
      this.updateResults(data.results);
    }
  };

  destroy() {
    MessagesApiManager.emitter.off('messagePollUpdate', this.onPollUpdate);
  }
}

window.PollsWeekSet = new WeakSet();

export {PollController};