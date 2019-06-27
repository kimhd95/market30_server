const models = require('../../models');
const config = require('../../../configs');
const Op = models.sequelize.Op;
const request = require('request');
const qs = require('qs');

// function registerBuyer(req, res) {
//
// }
//
// function registerSeller(req, res) {
//
// }
//
// function registerStore(req, res) {
//
// }
//
// function registerProduct(req, res) {
//
// }

function verifyBarcode(req, res) {
  const barcode = req.body.barcode;

  request.get(({uri:`https://www.beepscan.com/barcode/${barcode}`}, function (error, response, body) {
    //callback
    return res.status(200).json({success: true, message: body});
  });
}

module.exports = {
  // registerBuyer: registerBuyer,
  // registerSeller: registerSeller,
  // registerStore: registerStore,
  // registerProduct: registerProduct,
  verifyBarcode: verifyBarcode
}
