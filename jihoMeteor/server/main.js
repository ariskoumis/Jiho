import { Meteor } from 'meteor/meteor';

songs = new Mongo.Collection("songs");
songData = new Mongo.Collection("songData");

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
    				state: 1,
    				locked: true
    			}
    		newSong.players.push(user.id);
    		songID = songs.insert(newSong);
    		Meteor.users.update(user.id, {$set: {"profile.currentSong": songID, "profile.waiting": false}});
    		} else if(user.instrument == "Synth") {
    			var availableSong = songs.findOne({state:2, locked: false});
    			if(availableSong) {
    				songs.update(availableSong._id, { $set: {locked: true} });
    				Meteor.users.update(user.id, {$set: {"profile.currentSong": availableSong._id}})
    			} else {
    				Meteor.users.update(user.id, {$set: {"profile.waiting": true}});
    			}
    		} else if(user.instrument == "Bass") {
    			var availableSong = songs.findOne({state:3, locked: false});
    			if (availableSong) {
    				songs.update(availableSong._id, { $set: {locked: true} });
    				Meteor.users.update(user.id, {$set: {"profile.currentSong": availableSong._id}})
    			} else {
    				Meteor.users.update(user.id, {$set: {"profile.waiting": true}});
    			}
    		}
    	},
    	doneEditing: function(songID) {
    		if(songs.findOne({_id: songID}).state == "1") {
				let newUser = Meteor.users.findOne({"profile.waiting":true, "profile.instrument": "Synth"})
				if (newUser) {
					songs.update(songID, {
	    				$set: {state: 2, locked: false}, 
	    				$push: {players: newUser._id}
	    			})
					Meteor.users.update(newUser._id, {$set: {"profile.waiting": false, "profile.currentSong": songID}});
				} else {
					songs.update(songID, {
	    				$set: {state: 2, locked: false},
	    			})
				}
    		}
    		else if(songs.findOne({_id: songID}).state == "2") {
    			let newUser = Meteor.users.findOne({"profile.waiting":true, "profile.instrument": "Bass"})
    			if (newUser) {
	    			songs.update(songID, {
	    				$set: {state: 3, locked: false},
	    				$push: {players: newUser._id} 
	    			})
					Meteor.users.update(newUser._id, {$set: {"profile.waiting": false, "profile.currentSong": songID}});
				} else {
					songs.update(songID, {
	    				$set: {state: 3, locked: false},
	    			})
				}
    		} else {
	    		// songs.update(songID, {
    			// 	$set: {state: 1, locked: false}
    			// })
    			console.log("Something went wrong..");
    		}
    	},
    	nameSong: function(nameInput) {
    		songs.update(Meteor.user().profile.currentSong, {
    			$set: {name: nameInput}
    		});
    	}
    })
});
