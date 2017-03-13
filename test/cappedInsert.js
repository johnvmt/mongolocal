var assert = require('assert');

describe('Doc Insert', function(){
	describe('Insert 11 docs, checking for length', function() {
		it('should return an _id when doc is inserted', function (done) {
			var collection = {};
			var maxLength = 10;
			var oms = require('../')({
				collection: collection,
				max: maxLength
			}); // use defaults (localhost/test) as defined in defaults.js

			var removals = 0;
			var insertions = 0;
			oms.on('remove', function() {
				removals++;
			});

			oms.on('insert', function() {
				insertions++;
			});

			for(var ctr = 1; ctr <= maxLength; ctr++) {
				oms.insert({key: "someval" + ctr});
			}

			if(Object.keys(collection).length != maxLength)
				throw new Error("Wrong length");

			var doc = {key: "someval-capped"};
			oms.insert(doc, {emitCascade: true}, function (error, writeResult) {
				if(error)
					throw error;
				else {
					var id = doc._id;
					var cursor = oms.find({});
					cursor.toArray(function(error, results) {
						if (error)
							throw error;
						if (!results || results.length != maxLength)
							throw new Error("inserted object '" + id + "' not found in DB");
						if(insertions != maxLength+1)
							throw new Error("Insertion callback not triggered correct times");
						if(removals != 1)
							throw new Error("Removal callback not triggered correct times");
						done();
					});
				}
			});
		});
	});


	describe('Insert docs, not triggering removal emitter', function() {
		it('should return an _id when doc is inserted', function (done) {

			var collection = {};
			var maxLength = 10;
			var oms = require('../')({
				collection: collection,
				max: maxLength
			}); // use defaults (localhost/test) as defined in defaults.js

			var removals = 0;
			var insertions = 0;
			oms.on('remove', function() {
				throw new Error("Removal emiter triggered");
			});

			oms.on('insert', function() {
				insertions++;
			});

			for(var ctr = 1; ctr <= maxLength; ctr++) {
				oms.insert({key: "someval" + ctr});
			}

			if(Object.keys(collection).length != maxLength)
				throw new Error("Wrong length");

			var doc = {key: "someval-capped"};
			oms.insert(doc, {emitCascade: false}, function (error, writeResult) {
				if(error)
					throw error;
				else {
					var id = doc._id;
					var cursor = oms.find({});
					cursor.toArray(function(error, results) {
						if (error)
							throw error;
						if (!results || results.length != maxLength)
							throw new Error("inserted object '" + id + "' not found in DB");
						if(insertions != maxLength+1)
							throw new Error("Insertion callback not triggered correct times");
						done();
					});
				}
			});
		});
	});
});