var assert = require('assert');

describe('Doc Insert with Emitters', function(){
	describe('Insert emitter', function(){
		it('should pass through tag when doc is inserted', function(done) {
			var oms = require('../')(); // use defaults

			var emitTagTest = "myteststring";

			oms.on('insert', function(insertedDoc, options) {
				if(options.emitTag == emitTagTest)
					done();
				else
					throw new Error("Wrong emit tag");
			});

			oms.insert({object: "someval1" }, {emitTag: emitTagTest}, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");
			});
		});
	});

	describe('Insert emitter', function(){
		it('should trigger emitter when doc is inserted', function(done) {
			var oms = require('../')(); // use defaults

			oms.on('insert', function(insertedDoc) {
				done();
			});

			oms.insert({object: "someval1" }, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");
			});
		});
	});

	describe('Insert no emitter', function(){
		it('should not trigger emitter when doc is inserted', function(done) {
			var oms = require('../')(); // use defaults

			oms.on('insert', function(insertedDoc) {
				throw new Error("Emitter was triggered");
			});

			var doc = {object: "someval1"};
			oms.insert(doc, {emit: false}, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				process.nextTick(function() {
					done();
				});
			});
		});
	});
});