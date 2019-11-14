const MessagesManager = new class {
  messages = new Map();
  chats = new Map();
  users = new Map();

  dialogsList = [];

  getInputUser(id) {
    const user = this.users.get(id);
    if (!user) {
      return {_: 'inputUserEmpty'};
    }
    if (user.pFlags.self) {
      return {_: 'inputUserSelf'}
    }
    return {
      _: 'inputUser',
      user_id: id,
      access_hash: user.access_hash || 0
    }
  }

  loadDialogs() {
    ApiClient.callMethod('messages.getDialogs', {

    })
        .then(() => {});
  }

  updateDialogs({count, dialogs, messages, chats, users}) {
    this.dialogs
  }
};

export {MessagesManager};