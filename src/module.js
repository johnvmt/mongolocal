var MongoLocal = require('./MongoLocal');

module.exports = function(config) {
	return new MongoLocal(config);
};