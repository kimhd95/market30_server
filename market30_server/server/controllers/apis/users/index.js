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
router.get('/images/:imageName', function(req, res) {
  let imageName = req.params.imageName;
  res.sendFile(`../../../public/${imageName}.jpg`, {root: __dirname});
})
router.post('/test', APIService.testfunction);
// ^Middleware. Make sure to put all the routes which needs authentication below this middleware.

module.exports = router;
