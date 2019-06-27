const models = require('../../models');
const config = require('../../../configs');
const Op = models.sequelize.Op;
const request = require('request');
const qs = require('qs');
const cheerio = require('cheerio');


function getBuyerInfo(req, res) {
  const {user_id, password} = req.body;

  models.sequelize.query(`SELECT * FROM buyers;`).then(result => {
    console.log(result[0]);
    if (result[0].length > 0) {
      return res.status(200).json({success: true, data: result[0][0]});
    } else {
      return res.status(200).json({success: false, message: "no account"});
    }
  }).catch(err => {
    return res.status(403).json({success: false, message: "Internal Server or DB error."})
  });
}

function registerBuyer(req, res) {
  const {user_id, password, name} = req.body;
}

function registerSeller(req, res) {
  const {user_id, password, name} = req.body;
}

function registerStore(req, res) {
  const {owner_id, name, open_time, close_time} = req.body;
}

function registerProduct(req, res) {
  const {name, store_name, price, count, describe, image} = req.body;
  const query = `INSERT INTO products (name, store_name, price, count, describe, image) VALUES('${name}', '${store_name}', ${price}, ${count}, '${describe}', '${image}')`;
  console.log(query);
  models.sequelize.query(query).then(result => {
    return res.status(200).json({success: true});
  }).catch(err => {
    return res.status(403).json({success: false, message: "Internal Server or DB error."});
  });

    // ({
    //   name: name,
    //   store_name: store_name,
    //   price: price,
    //   count: count,
    //   describe: describe,
    //   image: image
    // })
}

function getProductList(req, res) {
  const seller_id = req.body.seller_id;

  models.sequelize.query(`SELECT * FROM products WHERE seller_id=${seller_id};`)
  .then(result => {
    if (result[0].length > 0) {
      return res.status(200).json({success: true, data: result[0]});
    } else {
      return res.status(200).json({success: false, message: "no data."});
    }
  }).catch(err => {
    return res.status(403).json({success: false, message: "Internal Server or DB error."});
  });
}

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
  registerProduct: registerProduct,
  getProductList: getProductList,
  verifyBarcode: verifyBarcode
}
