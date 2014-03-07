$(document).ready(function () {
  window.socket = io.connect('http://localhost');
  socket.on('connected', function () {
    logger.debug('Connected');
  });

  var view = new ChatWindow({el: $('.chat-panel')});
  view.layout();
  view.startChat();
});