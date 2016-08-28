import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';

import './main.html';

songs = new Mongo.Collection("songs");
songData = new Mongo.Collection("songData");

if(Meteor.isClient) {
	Meteor.subscribe("userData");

	Template.registerHelper( 'firstName', () => {
		return Meteor.user().firstName
		}
	);

	Template.login.onRendered(function(){
        $('#createAccountDiv').hide();
        $('#forgotPasswordDiv').hide();
        $('#createAccountForm').validate();
        $('#loginForm').validate();
    });

    Template.login.events({
        "submit #loginForm": function(event) {
            event.preventDefault();
            var email = $('[name=loginEmail]').val();
            var password = $('[name=loginPassword]').val();
            Meteor.loginWithPassword(email,password, function(err) {
                if (err) {
                    $('#loginDiv').transition('shake');
                    alertify.alert("Error :(", err.reason);
                }
            });
        },
        "submit #createAccountForm": function(event) {
            event.preventDefault();
            var user = {
                email: $('[name=email]').val(),
                firstName: $('[name=firstName]').val(),
                lastName: $('[name=lastName]').val(),
                password: $('[name=password]').val(),
                birthday: $('[name=birthday]').val()
            }
            Accounts.createUser(user, function(err) {
                if (err) {
                    $('#createAccountDiv').transition('shake');
                    alertify.alert(err.reason)
                } else {
                    Meteor.loginWithPassword(user.email,user.password, function(err) {
                        if (err) {
                            $('#createAccountDiv').transition('shake');
                            alertify.alert(err.reason);
                        } else {
                            $('.ui.basic.modal').modal('show');
                        }
                    });
                }
            });
        },
        "click #createAccount": function() {
            $('#loginDiv').hide(500);
            $('#createAccountDiv').show(500);
        },
        "click #forgotPassword": function() {
            $('#loginDiv').hide(500);
            $('#forgotPasswordDiv').show(500);
        },
        "click #backToLogin": function() {
            $('#createAccountDiv').hide(500)
            $('#forgotPasswordDiv').hide(500)
            $('#loginDiv').show(500)
        }
    });

    Template.home.onRendered(function() {
    	this.$('.ui.dropdown').dropdown();
    	$("#loading").transition('toggle');
    })

    Template.home.events({
    	"click #startPlaying": function() {
    		if ($('[name=instrument]').val()) {
    			$("#homeDiv").transition('scale');
	    		let user = {
	    			id: Meteor.user()._id,
	    			name: Meteor.user().firstName,
	    			instrument: $('[name=instrument]').val(),
				}
				Meteor.call('begin', user)
				FlowRouter.go("/songEditor");
			} else {
				$("#homeDiv").transition('shake');
				alertify.alert("Error!","Please choose an instrument.");
			}
    	},
    	"click #mySongs": function() {
    		FlowRouter.go("/mySongs");
    	}
    })

    Template.songEditor.helpers({
    	'waiting': function() {
    		var user = Meteor.user();
    		if (user && user.profile)
	    		return user.profile.waiting;
	    	else
	    		return false;
    	},
    	// 'currentlyBass': function() {
    	// 	var user = Meteor.user();
    	// 	if (user && user.profile) {
	    // 		return (user.profile.instrument == "Bass");
    	// 	}
	    // 	else {
	    // 		return false;
	    // 	}
    	// }
    })

    Template.songEditor.events({
    	'click #doneEditing': function() {
    		Meteor.call('doneEditing', Meteor.user().profile.currentSong, function(err, result) {
				FlowRouter.go("/home");
				if (result) {
					alertify.prompt("Song finished!", "Your song is all done! What's it called?", "Song name ...", function(evt, val) {
						Meteor.call('nameSong', val);
					}, function() {});
				}
    		});
    	},
    	'click #goHome': function() {
    		FlowRouter.go("/home");
    	},
    })

    Template.mySongs.onRendered(function() {
    	$("#goHome").hide();
    });

    Template.mySongs.helpers({
    	"songList": function() {
    		return songs.find({players: Meteor.user()._id}).fetch()
    	},
    	"apostrophe": function(name) {
    		if((name.charAt(name.length - 1)) == "s") {
    			return name+"'"
    		} else {
    			return name+"'s"
    		}
    	}
    })

    Template.mySongs.events({
    	"click #backHome": function() {
    		FlowRouter.go("/home");
    	}
    })
}
