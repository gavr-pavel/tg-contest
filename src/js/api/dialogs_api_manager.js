import {ApiClient} from './api_client';
import {MessagesApiManager} from './messages_api_manager';

const DialogsApiManager = new class {
  emitter = ApiClient.emitter;

  toggleDialogPin(dialog, pinned) {
    ApiClient.callMethod('messages.toggleDialogPin', {
      peer: MessagesApiManager.getInputDialogPeer(dialog.peer),
      pinned
    });
    dialog.pinned = pinned;
    const list = dialog.folder_id === 1 ? MessagesApiManager.archivedDialogs : MessagesApiManager.dialogs;
    if (pinned) {
      const index = MessagesApiManager.getDialogIndex(dialog, list);
      list.splice(index, 1);
      list.unshift(dialog);
      this.emitter.trigger('dialogOrderUpdate', {dialog, index: 0, folderId: dialog.folder_id});
    } else {
      MessagesApiManager.handleDialogOrder(dialog);
    }
    this.emitter.trigger('dialogPinnedUpdate', {dialog});
  }

  toggleDialogMute(dialog, muted) {
    const settings = Object.assign({}, dialog.notify_settings, {
      _: 'inputPeerNotifySettings',
      mute_until: muted ? 0x7fffffff : void(0)
    });
    ApiClient.callMethod('account.updateNotifySettings', {
      peer: {_: 'inputNotifyPeer', peer: MessagesApiManager.getInputPeer(dialog.peer)},
      settings,
    });
    dialog.notify_settings.mute_until = settings.mute_until;
    this.emitter.trigger('dialogNotifySettingsUpdate', {dialog});
  }

  async toggleDialogArchive(dialog, archived) {
    const updates = await ApiClient.callMethod('folders.editPeerFolders', {
      folder_peers: [
        {
          _: 'inputFolderPeer',
          peer: MessagesApiManager.getInputPeer(dialog.peer),
          folder_id: archived ? 1 : 0
        }
      ]
    });
    MessagesApiManager.onUpdates(updates);
  }
};

window.DialogsApiManager = DialogsApiManager;

export {DialogsApiManager};