$(document).ready(function () {
  if (NODE_ENV === 'development') {
    window.socket = io.connect('ws://localhost');
  } else if (NODE_ENV === 'production') {
    window.socket = io.connect('wss://dry-thicket-1171.herokuapp.com')
  }
  socket.on('connected', function () {
    logger.debug('Connected');
  });

  var view = new ChatWindow({el: $('.chat-panel')});
  view.layout();
  view.startChat();
});