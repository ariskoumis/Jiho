import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';

import './main.html';

songs = new Mongo.Collection("songs");
songData = new Mongo.Collection("songData");

if(Meteor.isClient) {
	$('.ui.modal').modal();

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

    Template.turnBased.onRendered(function() {
    	this.$('.ui.dropdown').dropdown();
    	$("#loading").transition('toggle');
    })

    Template.turnBased.events({
    	"click #startPlaying": function() {
    		if ($('[name=instrument]').val()) {
    			$("#turnBasedDiv").transition('scale');
	    		let user = {
	    			id: Meteor.user()._id,
	    			name: Meteor.user().firstName,
	    			instrument: $('[name=instrument]').val(),
				}
				Meteor.call('begin', user)
				FlowRouter.go("/songEditor");
			} else {
				$("#turnBasedDiv").transition('shake');
				alertify.alert("Error!","Please choose an instrument.");
			}
    	},
    	"click #mySongs": function() {
    		FlowRouter.go("/mySongs");
    	}
    })

    Template.songEditor.onRendered(function() {
    	console.log('hey')
    	Meteor.call('getSongData', function(err, result) {
    		if (result) {
                otherInstruments = result;
                if (scrubber) {
                    scrubber.loadOtherInstruments(result);
                }
    			console.log(result)
    		}
    	})
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
            if (!scrubber) {
                return;
            }
            
    		Meteor.call('doneEditing', scrubber.notes, Meteor.user().profile.currentSong, function(err, result) {
                FlowRouter.go("/turnBased");
				if (result) {
					alertify.prompt("Song finished!", "Your song is all done! What's it called?", "Song name ...", function(evt, val) {
						Meteor.call('nameSong', val);
					}, function() {});
				}
    		});
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
    	"click #goBack": function() {
    		FlowRouter.go("/turnBased");
    	}
    })

    Template.modalContent.events({
    	"click #turnBased": function() {
    		$(".ui.modal").modal('hide all')
    		FlowRouter.go("/turnBased")
    	}, 
    	"click #freeJam": function() {
    		$(".ui.modal").modal('hide all')
    		FlowRouter.go("/freeJam");
    	}
    })

    Template.home.onRendered(function() {
    	$(".ui.basic.modal").modal("show")
    })
}
