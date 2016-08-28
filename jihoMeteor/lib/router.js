FlowRouter.route('/', {
  name: 'home',
  action: function() {
  	$(".ui.sidebar").sidebar('hide')
    BlazeLayout.render("main", {currentPage: "home"})
  }
});

FlowRouter.route('/:currentPage', {
  name: 'editProfile',
  action: function(params) {
    BlazeLayout.render("main", {currentPage: params.currentPage})
    $(".ui.sidebar").sidebar('hide')
  }
});

FlowRouter.route('/songPlayback/:songId', {
  name: 'songPlayback',
  action: function(params) {
    BlazeLayout.render("main", {currentPage: "songPlayback"})
    Session.set("songId", params.songId);
  }
})