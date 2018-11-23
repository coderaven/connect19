var mongoose = require('mongoose');
var shortid = require('shortid');
var bcrypt = require('bcryptjs');
var Handlebars = require("handlebars");
var hbsHelpers = require('handlebars-helpers');
var passportLocalMongoose = require("passport-local-mongoose");

// Userprofile Schema
var userProfileSchema = mongoose.Schema({
	description: {
		type: String,		
	},
	interests: {
		type: String,
		default: "None"
	},
	profilepic: {
		type: String,
		default: 'default.png'
	}
})

// User Schema
var UserSchema = mongoose.Schema({
	username: {
		type: String,
		index:true
	},
	email: {
		type: String
	},
	password: {
		type: String
	},
	member_id:{
		type: String,
		default: shortid.generate
	},
	resetPasswordToken: {
		type: String
	},
    resetPasswordExpires: {
		type: Date
	},
	admin: {
		type: Boolean,
		default: "false"
	},
	isApproved: {
		type: Boolean,
		default: "false"
	},
	friends:[
		{
			type: String,		
		}
	],
	friend_requests: [
		{
			type: String,			
		}
	],
	group_invitation:[
		{
			type: String			
		}
	],
	group_joined:[
		{
			type: String
		}
	],
	user_profile: [userProfileSchema]
});

UserSchema.plugin(passportLocalMongoose)

var User = module.exports = mongoose.model('User', UserSchema);


//module.exports.createPassword = function(newpassword, callback){
//	bcrypt.genSalt(10, function(err, salt) {
//	    bcrypt.hash(newpassword.password, salt, function(err, hash) {
//	        newpassword.password = hash;
//	        newpassword.save(callback);
///	    });
//	});
//}



module.exports.createUser = function(newUser, callback){
	bcrypt.genSalt(10, function(err, salt) {
	    bcrypt.hash(newUser.password, salt, function(err, hash) {
	        newUser.password = hash;
	        newUser.save(callback);
	    });
	});
}

module.exports.getUserByUsername = function(username, callback){
	var query = {username: username};
	User.findOne(query, callback);
}

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch) {
    	if(err) throw err;
    	callback(null, isMatch);
	});
}



