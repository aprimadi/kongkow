//
// Usage:
//
//   var view = new ChatWindow({
//     el: ...
//   });
//   view.layout();
//
// Subviews:
// - ChatDisplay
//
var ChatWindow = Backbone.View.extend({
  events: {
    'keypress .chat-text-box': 'onKeypressChatTextBox',
    'click .send-button': 'onClickSendButton'
  },

  initialize: function () {
    this.channel = null;          // Store channel id, which is used as an identifier for initial communication between peer
    this.pc = null;               // Store RTCPeerConnection object
    this.localStream = null;      // MediaStream object representing local stream
    this.dataChannel = null;      // RTCDataChannel used for sending message

    $(window).on('resize.chat_window', $.proxy(this.onWindowResize, this));

    this.chatDisplayView = new ChatDisplay({el: this.$('.chat-display')});
  },

  render: function () {

  },

  layout: function () {
    var width, height;

    // Layout chat panel
    height = $(window).height() - $('#navbar').outerHeight(true);
    this.$el.css('height', height+'px');

    // Layout right panel
    width = $(window).width() - this.$('.left-panel').outerWidth(true);
    this.$('.right-panel').css('width', width+'px');

    // Layout chat display
    height = this.$el.height() - this.$('.chat-input').outerHeight(true) - 40;
    this.$('.chat-display').css('height', height+'px');

    // Layout chat text box
    width = this.$('.right-panel').width() - this.$('.send-button').outerWidth(true);
    this.$('.chat-text-box').css('width', width+'px');
  },

  enableTextChat: function () {
    this.$('.chat-text-box').removeAttr('disabled');
    this.$('.send-button').removeAttr('disabled');
  },

  disableTextChat: function () {
    this.$('.chat-text-box').addAttr('disabled');
    this.$('.send-button').addAttr('disabled');
  },

  startChat: function () {
    var self = this;
    var localVideo = this.$('#local-video')[0];

    socket.on('message', $.proxy(this.handleMessage, this));

    // Get user media
    navigator.getUserMedia({"video": true}, function (stream) {
      attachMediaStream(localVideo, stream);
      localVideo.play();
      self.localStream = stream;

      self.createPeerConnection();
      self.pc.addStream(stream);

      // Signal that this client is ready for handshaking
      socket.emit('start_handshake');
    });
  },

  createPeerConnection: function () {
    var servers = {"iceServers": [
      {
        "url": "stun:stun.l.google.com:19302"
      },
      {
        'url': 'turn:46.137.226.11:3478?transport=udp',
        'credential': 'hero',
        'username': 'gorst'
      },
      {
        'url': 'turn:46.137.226.11:3478?transport=tcp',
        'credential': 'hero',
        'username': 'gorst'
      }
    ]};
    this.pc = new RTCPeerConnection(servers, {optional: [{RtpDataChannels: true}]});
    this.pc.onicecandidate = $.proxy(this.pcOnIceCandidate, this);

    this.pc.onconnecting = $.proxy(this.pcOnSessionConnecting, this);
    this.pc.onopen = $.proxy(this.pcOnSessionOpened, this);
    this.pc.onaddstream = $.proxy(this.pcOnRemoteStreamAdded, this);
    this.pc.onremovestream = $.proxy(this.pcOnRemoteStreamRemoved, this);
    this.pc.ondatachannel = $.proxy(this.pcOnDataChannelAdded, this);
  },

  handleMessage: function (message) {
    logger.debug(message);

    if (message.type === 'channel') {
      logger.debug('ChatWindow.handleMessage: channel received.');
      this.channel = message.channel;
    } else if (message.type === 'start') {
      // Let the client knows that he should start WebRTC handshaking
      logger.debug('ChatWindow.handleMessage: start handshaking.');

      this.dataChannel = this.pc.createDataChannel("text-chat", {reliable: true});
      this.dataChannel.onmessage = $.proxy(this.handleDataChannelMessage, this);
      window.dataChannel = this.dataChannel;
      this.enableTextChat();

      this.pc.createOffer($.proxy(this.setLocalAndSendMessage, this));
    } else if (message.type === 'offer') {
      // Callee creates PeerConnection
      logger.debug('ChatWindow.handleMessage: receiving offer.');
      this.pc.setRemoteDescription(new RTCSessionDescription(message.rtcSessionDescription));
      this.pc.createAnswer($.proxy(this.setLocalAndSendMessage, this));
    } else if (message.type === 'answer') {
      logger.debug('ChatWindow.handleMessage: receiving answer.');
      this.pc.setRemoteDescription(new RTCSessionDescription(message.rtcSessionDescription));
      //socket.emit('end_handshake', {channel: this.channel});
    } else if (message.type === 'candidate') {
      logger.debug('ChatWindow.handleMessage: receiving candidate.');
      var candidate = new RTCIceCandidate({
        sdpMLineIndex: message.label,
        candidate: message.candidate
      });
      this.pc.addIceCandidate(candidate);
    }
  },

  pcOnIceCandidate: function (event) {
    if (event.candidate) {
      socket.emit('message', {
        channel: this.channel,
        type: 'candidate',
        label: event.candidate.sdpMLineIndex,
        id: event.candidate.sdpMid,
        candidate: event.candidate.candidate
      });
    } else {
      logger.debug('ChatWindow.pcOnIceCandidate: End of candidate.');
      socket.emit('end_handshake', {channel: this.channel});
      this.channel = null;
    }
  },

  pcOnSessionConnecting: function () { logger.debug(arguments); },
  pcOnSessionOpened: function () { logger.debug(arguments); },
  pcOnRemoteStreamRemoved: function () { logger.debug(arguments); },

  pcOnRemoteStreamAdded: function (event) {
    var remoteVideo = this.$('#remote-video')[0];
    attachMediaStream(remoteVideo, event.stream);
    remoteVideo.play();
  },

  pcOnDataChannelAdded: function (event) {
    logger.debug('ChatWindow.pcOnDataChannelAdded: called.');

    this.dataChannel = event.channel;
    this.dataChannel.onmessage = $.proxy(this.handleDataChannelMessage, this);
    window.dataChannel = this.dataChannel;

    this.enableTextChat();
  },

  handleDataChannelMessage: function (event) {
    var data = JSON.parse(event.data);
    if (data.type === 'text') {
      this.chatDisplayView.receiveText(data.text);
    }
  },

  setLocalAndSendMessage: function (rtcSessionDescription) {
    this.pc.setLocalDescription(rtcSessionDescription);
    logger.debug(rtcSessionDescription);
    socket.emit('message', {
      channel: this.channel,
      type: rtcSessionDescription.type,
      rtcSessionDescription: rtcSessionDescription
    });
  },

  sendTextAndUpdateChatDisplay: function (text) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({type: 'text', text: text}));
      this.chatDisplayView.sendText(text);
    }
  },


  // Events

  onWindowResize: function (e) {
    this.layout();
  },

  onKeypressChatTextBox: function (e) {
    if (e.keyCode === 13) { // ENTER
      e.preventDefault();

      var text = this.$('.chat-text-box').val();
      if (text.trim() !== '') {
        // Empty text box
        this.$('.chat-text-box').val('');

        // Send message
        this.sendTextAndUpdateChatDisplay(text);
      }
    }
  },

  onClickSendButton: function (e) {
    var text = this.$('.chat-text-box').val();
    if (text.trim() !== '') {
      // Empty text box
      this.$('.chat-text-box').val('');

      // Send message
      this.sendTextAndUpdateChatDisplay(text);
    }
  },


  dispose: function () {
    $(window).off('.chat_window');

    this.off();
    this.undelegateEvents();
  }
});