(window.webpackJsonp=window.webpackJsonp||[]).push([[9],{37:function(e,o,t){"use strict";t.r(o),t.d(o,"PollController",(function(){return l}));var s=t(0),n=t(1);const l=new class{init(e){for(const o of Object(s.b)(".poll_option",e))o.addEventListener("click",this.onOptionClick)}onOptionClick(e){const o=e.target;o.classList.toggle("poll_option-selected");const t=+o.closest(".message").dataset.id;n.a.messages.get(t).media.poll.multiple_choice&&console.log("make vote available")}sendVote(e,o){const t=MessagesController.dialog.peer;return ApiClient.callMethod("messages.sendVote",{peer:n.a.getInputPeer(t),msg_id:e,options:o})}renderResults(){}}}}]);