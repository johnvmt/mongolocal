var assert = require('assert');

describe('Doc Insert', function(){
	describe('MongoLocal inserts doc', function() {
		it('should return an _id when doc is inserted', function (done) {
			var oms = require('../')({}); // use defaults (localhost/test) as defined in defaults.js

			oms.insert({key: "someval1"}, function (error, object) {
				if (error)
					throw error;
				else {
					var id = object._id;
					oms.find({_id: id}, function (error, results) {
						if (error)
							throw error;
						if (!results || results.length != 1)
							throw new Error("inserted object '" + id + "' not found in DB");
						done();
					});
				}
			});
		});
	});

	describe('MongoLocal triggers insertion callback', function(){
		it('should return an _id when doc is inserted', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				insert: function(doc) {
					collection.push(doc);
				}
			}); // use defaults (localhost/test) as defined in defaults.js

			oms.insert({key: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.find({_id: id}, function(error, results) {
						if(error)
							throw error;
						if(!results || results.length != 1)
							throw new Error("inserted object '" + id + "' not found in DB");
						done();
					});
				}
			});
		});
	});
});