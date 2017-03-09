var assert = require('assert');

describe('Doc Remove with Emitters', function(){
	describe('MongoLocal performs removal', function(){
		it('should pass through tag when doc is removed', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			var emitTagTest = "myteststring";

			oms.on('remove', function(doc, options) {
				if(options.emitTag == emitTagTest)
					done();
				else
					throw new Error("Wrong emit tag");
			});

			var doc = {object: "someval1" };
			oms.insert(doc, function(error, object) {
				if(error)
					throw error;
				else {
					var id = doc._id;
					oms.remove({_id: id}, {emitTag: emitTagTest}, function(error, success) {
						if(error)
							throw error;
					});
				}
			});
		});

		it('should trigger emitter when doc is removed', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.on('remove', function(doc) {
				done();
			});

			var doc = {object: "someval1" };
			oms.insert(doc, function(error, object) {
				if(error)
					throw error;
				else {
					var id = doc._id;
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

			var doc = {object: "someval1"};
			oms.insert(doc, function(error, object) {
				if(error)
					throw error;
				else {
					var id = doc._id;
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

			var doc = {object: "someval1"};
			oms.insert(doc, function(error, object) {
				if(error)
					throw error;
				else {
					var id = doc._id;
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

			var doc = {object: "someval1"}
			oms.insert(doc, function(error, object) {
				if(error)
					throw error;
				else {
					var id = doc._id;
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