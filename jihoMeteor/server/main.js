import { Meteor } from 'meteor/meteor';

songs = new Mongo.Collection("songs");

Meteor.startup(() => {

  	Accounts.onCreateUser(function(options, user) {
        user.firstName = options.firstName;
        user.lastName = options.lastName;
        user.birthday = options.birthday;
        return user
    })

    Meteor.publish("userData", function () {
        if (this.userId) {
            return Meteor.users.find({_id: this.userId},
            {fields: {'firstName': 1, 'lastName': 1, 'profile': 1}});
        } else {
            this.ready();
        }
    });

    Meteor.methods({
    	begin: function(user) {
    		Meteor.users.update(user.id, {$set: {"profile.instrument": user.instrument}});
    		if(user.instrument == "Drums") {
    			let newSong = {
    				players: [],
    				state: 1
    			}
    		newSong.players.push(user.id);
    		songID = songs.insert(newSong);
    		Meteor.users.update(user.id, {$set: {"profile.currentSong": songID}});
    		} else if(user.instrument == "Synth") {
    			Meteor.users.update(user.id, {$set: {"profile.waiting": true}});
    		} else if(user.instrument == "Bass") {
				Meteor.users.update(user.id, {$set: {"profile.waiting": true}});
    		}
    	},
    	doneEditing: function(songID) {
    		if(songs.findOne({_id: songID}).state == "1") {
				let newUser = Meteor.users.findOne({"profile.waiting":true, "profile.instrument": "Synth"})
				songs.update(songID, {
    				$set: {state: 2}, 
    				$push: {players: newUser._id}
    			})
				Meteor.users.update(newUser._id, {$set: {"profile.waiting": false, "profile.currentSong": songID}});
    		}
    		else if(songs.findOne({_id: songID}).state == "2") {
    			let newUser = Meteor.users.findOne({"profile.waiting":true, "profile.instrument": "Bass"})
    			songs.update(songID, {
    				$set: {state: 3},
    				$push: {players: newUser._id} 
    			})
				Meteor.users.update(newUser._id, {$set: {"profile.waiting": false, "profile.currentSong": songID}});
    		} else {
	    		songs.update(songID, {
    				$set: {state: 1}
    			})
    		}
    	},
    	nameSong: function(nameInput) {
    		songs.update(Meteor.user().profile.currentSong, {
    			$set: {name: nameInput}
    		});
    	}
    })
});
