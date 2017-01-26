var assert = require('assert');

describe('Doc Removal', function(){
	describe('MongoLocal performs removal', function(){
		it('should insert a doc, then delete it', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.insert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.remove({_id: id}, function(error, success) {
						if(error)
							throw error;

						done();
					});
				}
			});
		});
	});

	describe('MongoLocal triggers callback to perform removal', function(){
		it('should insert a doc, then delete it', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				remove: function(index) {
					collection.splice(index, 0);
				}
			});

			oms.insert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.remove({_id: id}, function(error, success) {
						if(error)
							throw error;

						done();
					});
				}
			});
		});
	});
});