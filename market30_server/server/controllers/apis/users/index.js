'use strict';

const
    express = require('express'),
    userService = require('../../../services/users'),
    models = require('../../../models'),
    APIService = require('../../../services/users/api_service');

let router = express.Router();

console.log('apis/users/index.js called');
/**
 * api/v1/users/
 */
router.post('/test', APIService.testfunction);
router.post('/dbtest', APIService.dbtest);
// ^Middleware. Make sure to put all the routes which needs authentication below this middleware.

module.exports = router;
