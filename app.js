
/**
 * Module dependencies.
 */

var express = require('express');
var http = require('http');
var path = require('path');

var routes = require('./routes');
var assets = require('./assets');

var app = express();
var server = http.createServer(app);
var io = require('socket.io').listen(server);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('k0ngk0w_t1ll_d4wn'));
app.use(express.session());
app.use(app.router);
app.use(assets.middleware);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());

  // Socket IO configuration
  io.set('transports', [
    'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
} else {
  // Disable console.assert on staging or production
  console.assert = function () {};

  // Socket IO configuration
  io.enable('browser client minification');  // send minified client
  io.enable('browser client etag');          // apply etag caching logic based on version number
  io.enable('browser client gzip');          // gzip the file

  io.set('transports', [
    'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
}

app.get('/', routes.index);

var waiting = null; // User currently waiting for chat {socket_id, channel}
var channels = {};

io.set('log level', 1); // reduce logging

io.sockets.on('connection', function (socket) {
  socket.emit('connected');
  socket.on('start_handshake', function (data) {
    // Create channel, then send the channel to the client
    if (!!waiting) {
      // Someone is waiting
      var channel = waiting.channel;
      var channelObj = channels[channel];
      console.assert(!!channelObj);
      console.assert(channelObj.participants.length === 1);
      channelObj.participants.push(socket.id);
      console.assert(channelObj.participants.length === 2);

      // Notify client of its channel
      socket.emit('message', {type: 'channel', channel: channel});

      // Send message to participant1 to start sending offer
      console.log('Socket: send start signal');
      io.sockets.socket(waiting.socket_id).emit('message', {type: 'start'});

      waiting = null;
    } else {
      // No one is waiting, first create a channel then put self into waiting list
      var channel;
      while (true) {
        channel = Math.random().toString(36).substr(2);
        if (!channels[channel]) break;
      }

      channels[channel] = {participants: [socket.id], end_handshake_count: 0};
      waiting = {socket_id: socket.id, channel: channel};

      console.log('Number of channels: ' + Object.keys(channels).length);

      // Notify client of its channel
      socket.emit('message', {type: 'channel', channel: channel});
    }
  });
  socket.on('end_handshake', function (data) {
    channels[data.channel].end_handshake_count++;
    if (channels[data.channel].end_handshake_count === 2) {
      delete channels[data.channel];
    }
    console.log('Number of channels: ' + Object.keys(channels).length);
  });
  socket.on('message', function (data) {
    // Only message with existing channel will be processed.
    var channel = data.channel;
    if (!channel) return;
    if (!channels[channel]) return;

    // Relay the message to the other participant
    var channelObj = channels[channel];
    var socketIds = channelObj.participants;
    console.assert(socketIds.length === 2);
    for (var i=0; i<socketIds.length; ++i) {
      var socketId = socketIds[i];
      if (socketId !== socket.id) {
        console.log('Relaying message');
        io.sockets.socket(socketId).emit('message', data);
      }
    }
  });
});

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
