const axios = require('axios');
const sha512 = require('js-sha512');
const { default: encode } = require('urlencode');
require('dotenv').config({ path: 'secret.env' });

const makePair = (first, second) => {
    return {
        first,
        second
    };
}

const requestAPI = async (method, options = {}) => {
    const key = process.env.POLYGON_KEY;
    const secret = process.env.POLYGON_SECRET;
    const date = Math.floor(new Date().getTime() / 1000);
    const rand = 100000 + Math.floor(Math.random() * 900000);

    const parameters = [];

    // console.log(options);

    parameters.push(makePair('apiKey', key));
    parameters.push(makePair('time', date));

    for (const [key, value] of Object.entries(options)) {
        parameters.push(makePair(key, value));
    }

    parameters.sort((a, b) => {
        return (a.first === b.first) ? a.second.localeCompare(b.second) : a.first.localeCompare(b.first);
    });

    let parameter = `${method}?`;
    let utf8parameter = `${method}?`;

    for (let e of parameters) {
        parameter += e.first + '=' + e.second + '&';
        utf8parameter += e.first + '=' + encodeURIComponent(e.second) + '&';
    }

    parameter = parameter.slice(0, parameter.length - 1);

    // console.log(`${rand}/${parameter}#${secret}`);
    const apiSig = sha512(`${rand}/${parameter}#${secret}`);
    // console.log(apiSig);
    // console.log(`https://polygon.codeforces.com/api/${utf8parameter}apiSig=${rand}${apiSig}`)

    const req = await axios.post(`https://polygon.codeforces.com/api/${utf8parameter}apiSig=${rand}${apiSig}`);

    return req.data;
}

module.exports.makePair = makePair;
module.exports.requestAPI = requestAPI;