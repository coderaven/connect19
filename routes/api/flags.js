var express = require('express');
var router = express.Router();
var multer = require('multer');

var Post = require('../../models/post');
var User = require('../../models/user');
var Flag = require('../../models/postflags');

// Get Wall Post Flags
router.get('/wallflags', function(req, res){
    if (!req.query.member_id) {
        res.status(404).json({error: "Member Id Does not Exists"});
        return;
    }

	User.find({member_id: req.query.member_id}, function(err, user){
        console.log(user);
	Flag.aggregate([{$lookup:{from:"posts",localField:"post_id", foreignField:"post_id", as:"flag_details"}},{$sort:{date:-1}},{$lookup:{from:"users",localField:"author_id", foreignField:"member_id", as:"author_details"}},{$project:{"author_details.password":0, "author_details.group_invitation":0, "author_details.friend_requests":0}}]).exec(function(err, flags){				
        //console.log(posts);
        var flagData = {
            posts:flags            
        };
		res.send(JSON.stringify(flagData));					
	});
});
});


module.exports = router;