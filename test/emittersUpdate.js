var assert = require('assert');

describe('Doc Update with Emitters', function(){
	describe('MongoLocal updates doc', function(){
		it('should pass through tag when doc is updated', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			var emitTagTest = "myteststring";

			oms.on('update', function(unmodifiedDoc, modifiedDoc, updateOp, options) {
				if(options.emitTag == emitTagTest)
					done();
				else
					throw new Error("Wrong emit tag");
			});

			var doc = {object: "someval1"};
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = doc._id;

				oms.update(id, {object: "someval22"}, {emitTag: emitTagTest}, function(error, docDiffs) {
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


		it('should trigger emitter when doc is updated', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.on('update', function(unmodifiedDoc, modifiedDoc) {
				done();
			});

			var doc = {object: "someval1"};
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = doc._id;

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


			var doc = {object: "someval1"};
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = doc._id;

				oms.update(id, {object: "someval22"}, {emit: false}, function(error, docDiffs) {

					if(error)
						throw error;
					else {
						var cursor = oms.find(id);
						cursor.toArray(function(error, results) {
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

			var doc = {object: "someval1"};
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = doc._id;

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

			var doc = {object: "someval1"};
			oms.insert(doc, function(error, writeResult) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = doc._id;

				oms.update(id, {object: "someval22"}, {emit: false}, function(error, updated) {
					if(error)
						throw error;
					else {
						var cursor = oms.find(id);
						cursor.toArray(function(error, results) {
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