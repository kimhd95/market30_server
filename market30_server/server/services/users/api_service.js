const models = require('../../models');
const config = require('../../../configs');
const Op = models.sequelize.Op;
const request = require('request');
const qs = require('qs');

function testfunction(req, res) {
  return res.status(200).json({success:true, message:"test"});
}
function dbtest(req, res) {
  models.sequelize.findOne({
    where: {
      id: 1
    }
  }).then(user => {
    return res.status(200).json({success:true, message:user});
  }).catch(err => {
    return res.status(403).json({success:false, message: err});
  })
}

module.exports = {
  testfunction: testfunction,
  dbtest: dbtest
}
