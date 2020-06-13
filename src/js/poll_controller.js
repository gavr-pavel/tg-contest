import {$$} from './utils';
import {MessagesApiManager} from './api/messages_api_manager';

const PollController = new class {
  init(container) {
    for (const option of $$('.poll_option', container)) {
      option.addEventListener('click', this.onOptionClick);
    }
  }

  onOptionClick(event) {
    const option = event.target;
    option.classList.toggle('poll_option-selected');

    const msgId = +option.closest('.message').dataset.id;
    const message = MessagesApiManager.messages.get(msgId);
    const poll = message.media.poll;

    if (poll.multiple_choice) {
      console.log('make vote available');
    } else {
      // this.sendVote(msgId, options);

    }
  }

  sendVote(msgId, options) {
    const peer = MessagesController.dialog.peer;
    return ApiClient.callMethod('messages.sendVote', {
      peer: MessagesApiManager.getInputPeer(peer),
      msg_id: msgId,
      options
    });
  }

  renderResults() {}
};

export {PollController};