//
// Usage:
//
//   var view = new ChatDisplay({
//     el: ...
//   });
//
var ChatDisplay = Backbone.View.extend({
  initialize: function (options) {
    this.entries = [];
  },


  // Public
  // ------

  setStatus: function (text) {
    this.$('.status').html(text);
  },

  receiveText: function (text) {
    this.$('.content').append('<span class="callee">Partner:</span> '+text+'<br/>');
  },

  sendText: function (text) {
    this.$('.content').append('<span class="caller">You:</span> '+text+'<br/>');
  },


  dispose: function () {
    this.off();
    this.undelegateEvents();
  }
});