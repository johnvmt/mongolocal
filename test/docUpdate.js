var assert = require('assert');

describe('Doc Update', function(){
	describe('MongoLocal upsert doc', function(){
		it('should insert a doc if the query does not match', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			oms.update({key: "val2", object: "obj"}, {key: "val"}, {upsert: true}, function(error, docDiffs) {
				if(error)
					throw error;
				else {
					var cursor = oms.find({key: "val"});
					cursor.toArray(function(error, results) {
						if(error)
							throw error;
						if(!results || results.length != 1)
							throw new Error("inserted object '" + id + "' not found in DB");
						else if(results[0].key != "val")
							throw new Error("Object not updated");

						done();
					});
				}

			});
		});
	});

	describe('MongoLocal updates doc', function(){
		it('should return true when doc is updated', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			var doc = {object: "someval1" };
			oms.insert(doc, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = doc._id;

				oms.update({_id: id}, {object: "someval22"}, function(error, docDiffs) {

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
							done();
						});
					}

				});
			});
		});
	});

	describe('MongoLocal updates doc, multi: false option', function(){
		it('should update a single doc', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			for(var ctr = 0; ctr < 10; ctr++) {
				oms.insert({key: "val" });
			}

			oms.update({}, {key: "val2"});

			var cursor = oms.find({});
			cursor.toArray(function(error, docs) {
				if(error) {
					throw new Error(error);
				}
				else {
					var updated = 0;
					docs.forEach(function(doc) {
						if (doc.key == 'val2')
							updated++;
					});
					if(updated > 1)
						throw new Error("Too many docs updated");
					else
						done();
				}
			});

		});
	});

	describe('MongoLocal updates doc, multi: false option', function(){
		it('should update multiple docs', function(done) {
			var oms = require('../')(); // use defaults (localhost/test) as defined in defaults.js

			for(var ctr = 0; ctr < 10; ctr++) {
				oms.insert({key: "val" });
			}

			oms.update({}, {key: "val2"}, {multi: true});

			var cursor = oms.find({});
			cursor.toArray(function(error, docs) {
				if(error) {
					throw new Error(error);
				}
				else {
					var updated = 0;
					docs.forEach(function(doc) {
						if (doc.key == 'val2')
							updated++;
					});
					if(updated != 10)
						throw new Error("Not enough docs updated");
					else
						done();
				}
			});

		});
	});

	describe('MongoLocal triggers update callback', function(){
		it('should return true when doc is updated', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				update: function(index, originalDoc, updatedDoc) {
					collection[index] = updatedDoc;
				}
			}); // use defaults (localhost/test) as defined in defaults.js

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
						var cursor = oms.find(id);
						cursor.toArray(function(error, results) {
							if(error)
								throw error;
							if(!results || results.length != 1)
								throw new Error("inserted object '" + id + "' not found in DB");
							else if(results[0].object != "someval22")
								throw new Error("Object not updated");
							done();
						});
					}
				});
			});
		});
	});

	describe('MongoLocal triggers update callback', function(){
		it('should return true when doc is updated', function(done) {
			var collection = [];
			var oms = require('../')({
				collection: collection,
				update: function(index, originalDoc, updatedDoc) {
					collection[index] = updatedDoc;
				}
			}); // use defaults (localhost/test) as defined in defaults.js

			var doc = {object: "someval1" };
			oms.insert(doc, function(error, objectExtended) {
				if(error)
					throw error;
				if(typeof doc != "object" || typeof doc._id == "undefined")
					throw new Error("Invalid object returned by insert");

				var id = doc._id;

				oms.update(id, {object: "someval22"}, function(error, updated) {
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
							done();
						});
					}

				});
			});
		});
	});
});