const models = require('../../models');
const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const timeGapToCheckMedicineCheckConnection = 1000 * 60* 30 // 30 minutes.

function now(date) {
    const m = date.getMonth()+1;
    const d = date.getDate();
    const h = date.getHours();
    const i = date.getMinutes();
    const s = date.getSeconds();
    return date.getFullYear()+'-'+m+'-'+d+' '+h+':'+i+':'+s;
}

module.exports = {

}
