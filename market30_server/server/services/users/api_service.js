const models = require('../../models');
const config = require('../../../configs');
const Op = models.sequelize.Op;
const request = require('request');
const qs = require('qs');
const cheerio = require('cheerio');



function getBuyerInfo(req, res) {
  const {user_id, password} = req.body;
  models.Buyer.findOne({
    where: {
      user_id: user_id,
      password: password
    }
  }).then(result => {
    if (result) {
      return res.status(200).json({success: true, data: result});
    } else {
      return res.status(200).json({success: false, message: "no account"});
    }
  }).catch(err => {
    return res.status(403).json({success: false, message: "Internal Server or DB error."})
  });
}

// function registerBuyer(req, res) {
//   const {user_id, password} = req.body;
// }
// //
// function registerSeller(req, res) {
//   const {user_id, password} = req.body;
// }
// //
// function registerStore(req, res) {
//   const {owner_id, owner_name, store_name, open_time, close_time} = req.body;
// }
// //
// function registerProduct(req, res) {
//
// }

function verifyBarcode(req, res) {
  const barcode = req.body.barcode;

  request.get({uri:`https://www.beepscan.com/barcode/${barcode}`}, function (error, response, body) {
    const $ = cheerio.load(body);
    const product_name = $("div.container b").text();
    const img_url = $("img").last().attr('src');
    return res.status(200).json({success: true, data: {product_name: product_name, img_url: img_url}});
  });
}

module.exports = {
  getBuyerInfo: getBuyerInfo,
  // registerBuyer: registerBuyer,
  // registerSeller: registerSeller,
  // registerStore: registerStore,
  // registerProduct: registerProduct,
  verifyBarcode: verifyBarcode
}
