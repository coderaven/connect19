var express = require('express');
var router = express.Router();
var multer = require('multer');
var upload = multer({ dest: './dist/images' });
var async = require('async');
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var bcrypt = require('bcryptjs');
var authenticateFirst = require('../../utilities/auth').authenticateFirst;

var Post = require('../../models/post');
var User = require('../../models/user');

var POSTS_RETURN_LIMIT = 5;

router.get('/', authenticateFirst, function (req, res) {
	var page = parseInt(req.query.page, 10) || 1;

	User.findOne({ member_id: req.user.member_id }, function (err, user) {
		if (page <= 1) {
			Post.aggregate([{ $lookup: { from: "users", localField: "author", foreignField: "member_id", as: "user_details" } }, { $match: { trashed: "N" } }, { $sort: { ispinned: -1, date: -1, } }, { $limit: POSTS_RETURN_LIMIT }, {$project: { "user_details.password": 0, "user_details.friends": 0, "user_details.friend_requests": 0, "user_details.group_invitation": 0, "user_details.group_joined": 0, "user_details.friend_requests_sent": 0 }}]).exec(function (err, posts) {
				res.send(JSON.stringify({ posts: posts }));
			});
		} else {
			Post.aggregate([{ $lookup: { from: "users", localField: "author", foreignField: "member_id", as: "user_details" } }, { $match: { trashed: "N" } }, { $sort: { ispinned: -1, date: -1 } }, { $skip: ((page - 1) * POSTS_RETURN_LIMIT) + (page > 1 ? 1 : 0) }, { $limit: POSTS_RETURN_LIMIT }, {$project: { "user_details.password": 0, "user_details.friends": 0, "user_details.friend_requests": 0, "user_details.group_invitation": 0, "user_details.group_joined": 0, "user_details.friend_requests_sent": 0 }}]).exec(function (err, posts) {
				res.send(JSON.stringify({ posts: posts }));
			});
		}
	});
});

//Get posts for specific time
//var lastHour = ("2018-12-17T08:20:44.992Z");
router.post('/latestpost', function (req, res) {
	var lastHour = req.body.timestamp;
	if (!lastHour) {
        res.status(500).json({ error: "Timestamp not there!" });
        return;
    }
	Post.aggregate([{ $lookup: { from: "users", localField: "author", foreignField: "member_id", as: "user_details" } }, {$match:{"date": {"$gt": new Date(lastHour)}}}, { $sort: { date: -1, ispinned: -1 } }, { $project: { description: 1, postimage: 1, author: 1, date: 1, post_id: 1, ispinned: 1, isFlagged: 1, trashed: 1, 'user_details.lastname': 1, 'user_details.firstname': 1, 'user_details.username': 1, 'user_details.user_profile': 1, 'user_details.member_id': 1  } }]).exec(function (err, posts) {
		console.log(posts);
		res.send(JSON.stringify({ posts: posts }));
	})
});

// Add Posts
router.post('/add', authenticateFirst, function (req, res) {
	if ((!req.body.description || req.body.description.trim() == "") && !req.body.imageUrl) {
		res.status(400).json({ success: false, msg: "Missing Post Content Message" });
		return;
	}

	var post = {
		description: req.body.description || "",
		date: new Date(),
		author: req.user.member_id
	}

	if (req.body.imageUrl) {
		post.postimage = req.body.imageUrl;
	}

	var newPost = new Post(post);
	Post.createPost(newPost, function (err, post) {
		res.send(JSON.stringify({ post: post }));
	})
});


//  Get Edit Wall Post
router.get('/editpost', authenticateFirst, function (req, res) {
	var member_id = req.user.member_id;
    if (!member_id) {
        res.status(404).json({ error: "User Does not Exists" });
        return;
    }
	Post.findOne({ 'post_id': req.body.post_id }, function (err, editPost) {
		if (editPost && !err) {
			res.json({ success: true, msg: 'Edit Post', post: editPost });
		} else {
			res.status(500).send({ success: false, msg: 'Something went wrong!!' });
		}
	});
})

// Post Edit Wall Post
router.post('/editpost', authenticateFirst, function (req, res) {
	var member_id = req.user.member_id;
    if (!member_id) {
        res.status(404).json({ error: "User Does not Exists" });
        return;
	}

	var description = req.body.description;
	console.log(`Description: ${description}`);

	// if (!description || description.trim() == "") {
	// 	res.status(400).json({ success: false, msg: "Missing Post Content Message" });
	// 	return;
	// }

	var post_id = req.body.post_id;

	if (!post_id) {
		res.status(404).json({ success: false, msg: 'Post ID undefined or cannot be empty.'});
		return;
	}

	Post.findOneAndUpdate({ 'post_id': post_id}, {$set : { 'description' : description}}, {new: true}, function (err, post) {
		if(post && !err) {
			res.json({ success: true, msd: 'Post updated successfully', post: post});
		} else {
			res.status(500).send({ success: flase, msg: 'Not able to update post'});
		}
	})
})

//
router.post('/change-pin-status', authenticateFirst, function (req, res) {
	var member_id = req.user.member_id;
    if (!member_id) {
        res.status(404).json({ error: "User Does not Exists" });
        return;
	}

	var ispinned = req.body.ispinned || false;
	var post_id = req.body.post_id;

	if (!post_id) {
        res.status(404).json({ success: false, msg: "Post Does not Exists" });
        return;
	}

	Post.findOneAndUpdate({ 'post_id': post_id}, {$set : { 'ispinned' : ispinned}}, {new: true}, function (err, post) {
		if(post) {
			res.json({ success: true, msg: 'Post updated successfully'});
		} else {
			res.status(500).send({ success: false, msg: 'Not able to update post / Post does not exists'});
		}
	})
})

// Delete Post
router.post('/delete', authenticateFirst, function (req, res) {
	Post.remove({ 'post_id': req.body.post_id }, function (err, deletePost) {
		if(deletePost && !err) {
			res.json({ success: true, msg: 'Post Deleted', deletePost: deletePost});
		} else {
			res.status(500).send({ success: false, msg: 'Not able to Delete post'});
		}
	});
});

function ensureAuthenticated(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	} else {
		//req.flash('error_msg','You are not logged in');
		res.status(403).json({ error: "Access Denied" });
	}
}

module.exports = router;