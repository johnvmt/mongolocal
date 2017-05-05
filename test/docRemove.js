var assert = require('assert');

describe('Doc Removal', function(){
	describe('MongoLocal performs removal', function(){
		it('should insert a doc, then delete it', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			var doc = {object: "someval1" };
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw error;
				else {
					var id = doc._id;
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

			var doc = {object: "someval1" };
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw error;
				else {
					var id = doc._id;
					oms.remove({_id: id}, function(error, success) {
						if(error)
							throw error;

						done();
					});
				}
			});
		});
	});

	describe('Remove dependent document', function(){
		it('should insert a doc and another doc that references the first; then delete both', function(done) {
			var oms = require('../')({

			});

			var docId = null;

			oms.once('remove', function() {
				oms.remove({docId: docId}, function(error, success) {
					if(error)
						throw new Error(error);
					else
						done();
				});
			});

			var doc = {object: "someval1" };
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw new Error(error);
			});

			var dependentDoc = {docId: doc._id, tag: 'mytag'};
			docId = doc._id;
			oms.insert(dependentDoc, function(error, writeResult) {
				if(error)
					throw new Error(error);
			});

			oms.remove({_id: docId}, function(error, success) {
				if(error)
					throw new Error(error);
			});
		});
	});


});