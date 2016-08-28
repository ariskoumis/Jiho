import { Meteor } from 'meteor/meteor';

let songs = new Mongo.Collection("songs");
let songData = new Mongo.Collection("songData");

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
            let currentInstrument;
    		if(songs.findOne({_id: songID}).state == "1") {
                currentInstrument = "Drums";
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
                currentInstrument = "Synth";
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
                currentInstrument = "Bass";
	    		// songs.update(songID, {
    			// 	$set: {state: 1, locked: false}
    			// })
    		}
            let data = {
                songID: songID,
                content: [
                    {
                        instrument: currentInstrument,
                        notes: [
                            {
                                timeStart: 1,
                                timeEnd: 10,
                                note:1
                            }, 
                            {
                                timeStart: 4,
                                timeEnd: 12,
                                note:5
                            }, 
                            {
                                timeStart: 5,
                                timeEnd: 14,
                                note:3
                            }, 
                        ]

                    }
                ]

            }
            songData.insert(data)
            //Signify end of recording, have alert ask for song name
            if (currentInstrument == "Bass") {
                return true;
            }
    	},
    	nameSong: function(nameInput) {
    		songs.update(Meteor.user().profile.currentSong, {
    			$set: {name: nameInput}
    		});
    	}
    })
});
