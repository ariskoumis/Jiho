import { Meteor } from 'meteor/meteor';

userDB = new Mongo.Collection("userDB");

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
            {fields: {'firstName': 1, 'lastName': 1}});
        } else {
            this.ready();
        }
    });
});
