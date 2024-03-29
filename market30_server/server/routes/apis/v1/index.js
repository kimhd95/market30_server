'use strict';

const
	express = require('express'),
	usersController = require('../../../controllers/apis/users');

let router = express.Router();

router.use('/users', usersController)

module.exports = router
