import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Session } from 'meteor/session';

import './main.html';

songs = new Mongo.Collection("songs");

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
    			$("#loading").transition('scale');
	    		let user = {
	    			id: Meteor.user()._id,
	    			name: Meteor.user().firstName,
	    			instrument: $('[name=instrument]').val(),
				}
				Meteor.call('begin', user)
			} else {
				$("#homeDiv").transition('shake');
				alertify.alert("Error!","Please choose an instrument.");
			}
    	}
    })
}
