var assert = require('assert');
var oms = require('../')();

function uniqueId() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
		s4() + '-' + s4() + s4() + s4();
}

describe('Doc Find', function(){
	describe('Database doc', function(){
		it('should insert a doc, then return it', function(done) {
			var key = uniqueId();

			var doc = {key: key};
			oms.insert(doc, function(error, object) {
				if(error)
					throw error;
				else {
					var id = doc._id;
					var cursor = oms.find({key: key});

					cursor.toArray(function(error, results) {
						if(error)
							throw error;
						if(!results || results.length != 1)
							throw new Error("inserted object '" + key + "' not found in DB");
						done();
					});
				}
			});
		});
	});
});