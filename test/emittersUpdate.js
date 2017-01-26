var assert = require('assert');

describe('Doc Update with Emitters', function(){
	describe('MongoLocal updates doc', function(){
		it('should trigger emitter when doc is updated', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.on('update', function(unmodifiedDoc, modifiedDoc) {
				done();
			});

			oms.insert({object: "someval1" }, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = objectExtended._id;

				oms.update(id, {object: "someval22"}, function(error, docDiffs) {
					if(error)
						throw error;
					else {
						oms.find(id, function(error, results) {
							if(error)
								throw error;
							if(!results || results.length != 1)
								throw new Error("inserted object '" + id + "' not found in DB");
							else if(results[0].object != "someval22")
								throw new Error("Object not updated");
						});
					}
				});
			});
		});
		it('should not trigger emitter when doc is updated', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.on('update', function(unmodifiedDoc, modifiedDoc) {
				throw new Error("Emitter was triggered")
			});

			oms.insert({object: "someval1" }, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = objectExtended._id;

				oms.update(id, {object: "someval22"}, {emit: false}, function(error, docDiffs) {

					if(error)
						throw error;
					else {
						oms.find(id, function(error, results) {
							if(error)
								throw error;
							if(!results || results.length != 1)
								throw new Error("inserted object '" + id + "' not found in DB");
							else if(results[0].object != "someval22")
								throw new Error("Object not updated");

							process.nextTick(function() {
								done();
							});
						});
					}
				});
			});
		});
	});

	describe('MongoLocal triggers update callback', function(){
		it('should trigger emitter when doc is updated', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				update: function(index, originalDoc, updatedDoc) {
					collection[index] = updatedDoc;
				}
			}); // use defaults (localhost/test) as defined in defaults.js

			oms.on('update', function(unmodifiedDoc, modifiedDoc) {
				done();
			});

			oms.insert({object: "someval1" }, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = objectExtended._id;

				oms.update(id, {object: "someval22"}, function(error, updated) {
					if(error)
						throw error;
					else {
						oms.find(id, function(error, results) {
							if(error)
								throw error;
							if(!results || results.length != 1)
								throw new Error("inserted object '" + id + "' not found in DB");
							else if(results[0].object != "someval22")
								throw new Error("Object not updated");
						});
					}

				});
			});
		});
		it('should not trigger emitter when doc is updated', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				update: function(index, originalDoc, updatedDoc) {
					collection[index] = updatedDoc;
				}
			}); // use defaults (localhost/test) as defined in defaults.js

			oms.on('update', function(unmodifiedDoc, modifiedDoc) {
				throw new Error("emitter was triggered");
			});

			oms.insert({object: "someval1" }, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof objectExtended != "object" || typeof objectExtended._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = objectExtended._id;

				oms.update(id, {object: "someval22"}, {emit: false}, function(error, updated) {
					if(error)
						throw error;
					else {
						oms.find(id, function(error, results) {
							if(error)
								throw error;
							if(!results || results.length != 1)
								throw new Error("inserted object '" + id + "' not found in DB");
							else if(results[0].object != "someval22")
								throw new Error("Object not updated");

							process.nextTick(function() {
								done();
							});
						});
					}

				});
			});
		});
	});
});