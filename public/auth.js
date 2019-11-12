import TdClient from './td_client.js';

export default new class Auth {
  constructor() {
    TdClient.listen(this.onUpdate);
  }

  onUpdate = (update) => {
    // console.log('update');
  };
}
