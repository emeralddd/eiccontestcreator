const mongo = require('mongoose');
const Schema = mongo.Schema;

const Contest = new Schema({
    name: {
        type: String
    },
    problems: {
        type: [String]
    },
});

module.exports = mongo.model('contests', Contest);