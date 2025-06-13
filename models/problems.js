const mongo = require('mongoose');
const Schema = mongo.Schema;

const Problem = new Schema({
    problemId: {
        type: String,
        required: true,
        unique: true
    },
    statements: {
        type: Object
    }
});

module.exports = mongo.model('problems', Problem);