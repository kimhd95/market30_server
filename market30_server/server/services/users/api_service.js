const models = require('../../models');
const config = require('../../../configs');
const Op = models.sequelize.Op;
const request = require('request');
const qs = require('qs');

function testfunction(req, res) {
  return res.status(200).json({success:true, message:"test"});
}

module.exports = {
  testfunction: testfunction
}
