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

	describe('MongoLocal inserts doc', function() {
		it('should trigger an error when a doc with existing _id is inserted', function (done) {
			var oms = require('../')({}); // use defaults (localhost/test) as defined in defaults.js

			var doc = {key: "someval1"};
			oms.insert(doc, function (error, writeResult) {
				if (error)
					throw error;
				else {
					var docClone = JSON.parse(JSON.stringify(doc));
					oms.insert(docClone, function(error, writeResult) {
						if (error.message == 'id_exists')
							done();
						else
							throw new Error("Doesn't throw error on duplicate");
					});
				}
			});
		});
	});
});