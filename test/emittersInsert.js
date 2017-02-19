var assert = require('assert');

describe('Doc Insert with Emitters', function(){
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