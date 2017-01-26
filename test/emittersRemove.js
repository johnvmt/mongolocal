var assert = require('assert');

describe('Doc Remove with Emitters', function(){
	describe('MongoLocal performs removal', function(){
		it('should trigger emitter when doc is removed', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.on('remove', function(doc) {
				done();
			});

			oms.insert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.remove({_id: id}, function(error, success) {
						if(error)
							throw error;
					});
				}
			});
		});
		it('should not trigger emitter when doc is inserted', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.on('remove', function(doc) {
				throw new Error("Callback was triggered");
			});

			oms.insert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.remove({_id: id}, {emit: false}, function(error, success) {
						if(error)
							throw error;

						process.nextTick(function() {
							done();
						});
					});
				}
			});
		});
	});

	describe('MongoLocal triggers callback to perform removal', function(){
		it('should trigger emitter when doc is removed', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				remove: function(index) {
					collection.splice(index, 0);
				}
			});

			oms.on('remove', function(doc) {
				done();
			});

			oms.insert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.remove({_id: id}, function(error, success) {
						if(error)
							throw error;

					});
				}
			});
		});
		it('should not trigger emitter when doc is inserted', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				remove: function(index) {
					collection.splice(index, 0);
				}
			});

			oms.on('remove', function(doc) {
				throw new Error("Callback was triggered");
			});

			oms.insert({object: "someval1" }, function(error, object) {
				if(error)
					throw error;
				else {
					var id = object._id;
					oms.remove({_id: id}, {emit: false}, function(error, success) {
						if(error)
							throw error;

						process.nextTick(function() {
							done();
						});
					});
				}
			});
		});
	});
});