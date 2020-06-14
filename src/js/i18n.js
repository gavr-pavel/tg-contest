const keys = {
  'login_flood_pluralize_seconds': ['', 'Try again in {} second', 'Try again in {} seconds'],
  'login_flood_pluralize_minutes': ['', 'Try again in {} minute', 'Try again in {} minutes'],
  'login_flood_pluralize_hours': ['', 'Try again in {} hour', 'Try again in {} hours'],

  'messages_search_n_results_found': ['No messages found', '{} message found', '{} messages found'],
  'messages_send_n_files': ['', 'Send {} File', 'Send {} files'],

  'chats_n_members': ['', '{n} member', '{n} members'],
  'chats_n_followers': ['', '{n} follower', '{n} followers'],

  'date_n_minutes_ago': ['', '{} minute ago', '{} miinutes ago'],
};

const I18n = new class {
  get(key, tokens = false) {
    const string = keys[key] || '';
    return this.replaceTokens(string, tokens);
  }

  replaceTokens(string, tokens) {
    if (!tokens) {
      return string;
    }
    for (const [token, value] of Object.entries(tokens)) {
      string = string.replace(`{${token}}`, value);
    }
    return string;
  }

  getPlural(key, n, tokens) {
    const options = keys[key];
    let string;
    if (!n && options[0]) {
      string = options[0];
    } else if (n === 1) {
      string = options[1];
    } else {
      string = options[2];
    }
    string = string.replace('{}', n);
    return this.replaceTokens(string, tokens)
  }
};

export {I18n};
