var assert = require('assert');

describe('Doc Insert', function(){
	describe('MongoLocal inserts doc', function() {
		it('should return an _id when doc is inserted', function (done) {
			var oms = require('../')({}); // use defaults (localhost/test) as defined in defaults.js

			var doc = {key: "someval1"};
			oms.insert(doc, function (error, object) {
				if (error)
					throw error;
				else {
					var id = doc._id;
					oms.findOne({_id: id}, function (error, result) {
						if (error)
							throw error;
						if (!result || result._id != id)
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
			});

			var doc = {key: "someval1" };
			oms.insert(doc, function(error, object) {
				if(error)
					throw error;
				else {
					var cursor = oms.find({_id: doc._id});
					cursor.toArray(function(error, results) {
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
						if (error == 'id_exists')
							done();
						else
							throw new Error("Doesn't throw error on duplicate");
					});
				}
			});
		});
	});
});