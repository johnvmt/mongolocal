# Mongo Local #

Stripped-down version of MongoDB module that operates on a collection stored in memory. Doc matching and updating is done using the fauxmongo module.

Collections can be stored in an array, or an object with keys in the object corresponding to the doc's ID.

NOTE: This project is not affiliated with MongoDB

## Changelog ##

### Version 1.2.4 ###

* Fixed bug in capped insert function

### Version 1.2.3 ###

* Made docsLinkedList attribute public, made docsLinkedList's list attribute public
* Added tests to test sending arbitrary tags through options argument of insert/update/remove

### Version 1.2.2 ###

* Fixed bug in cursor's forEach function

### Version 1.2.1 ###

* Find now returns cursor, in addition to accepting callback

### Previous versions ###

[Docs on Github](https://github.com/johnvmt/mongolocal/tree/1.1.6)

## Installation ##

### Bower ###
	
	bower install

### Node ###

	npm install
	
## Usage ##

### Initialize ###

#### Mongolocal sets up the collection ####

	var mongolocal = require('mongolocal');
	var collection = mongolocal();
	
#### Pass in an array ####

	var mongolocal = require('mongolocal');
	var extCollection = [];
	var collection = mongolocal({
		collection: extCollection
	});

#### Pass in an object ####

	var mongolocal = require('mongolocal');
	var extCollection = {};
	var collection = mongolocal({
		collection: extCollection
	});
	
#### Capped collection ####

	var mongolocal = require('mongolocal');
	var collection = mongolocal({
		max: 1000
	});
	
### Find documents ###

	var cursor = collection.find({key: "val"});
	cursor.toArray(function(error, results) {
		if(error)
			console.error("Something went wrong");
		else {
			results.forEach(function(doc) {
				console.log(doc.key);
			});
		}
	});
	
### Insert document ###

	var doc = {key: "val1"};
	collection.insert(doc, function (error, writeOp) {
		if(error)
			console.error("Something went wrong");
		else
			console.log("Document inserted with ID", doc._id);
	});
	
### Update document ###

	var doc = {key: "someval1"};
    collection.insert(doc, function (error, writeOp) {
		if(error)
			console.error("Something went wrong on insertion");
		else {
			var id = doc._id;
			collection.update({_id: id}, {key: "val2"}, function(error, success) {
				if(error)
					console.error("Something went wrong on update");
				else
					console.log("Update succeeded");
			}
		}
	});

### Remove document ###

	var doc = {key: "someval1"};
	collection.insert(doc, function (error, writeOp) {
		if(error)
			console.error("Something went wrong on insertion");
		else {
			var id = doc._id;
			collection.remove(id, function(error, success) {
				if(error)
					console.error("Something went wrong on removal");
				else
					console.log("Removal succeeded");
			}
		}
	});


### Callbacks ###

Potentially useful when the collection is managed by some other software (eg: an array in Polymer)

#### Insert ####

	var mongolocal = require('mongolocal');
	var extCollection = []; // collection is a simple array
	var collection = mongolocal({
		collection: extCollection,
		insert: function(doc) {
			console.log(doc._id);
			extCollection.push(doc);
		}
	});

	var doc = {key: "val1"}
	collection.insert(doc, function(error, writeResult) {
		if(error)
			throw error;
		else
			console.log(doc._id + "inserted");
	});
	
#### Update ####

	var mongolocal = require('mongolocal');
    var extCollection = []; // collection is a simple array
    var collection = mongolocal({
		collection: extCollection,
		update: function(index, updated) {
			collection[index] = updated;
		}
	});

	var doc = {key: "val1"}
	collection.insert(doc, function(error, writeResult) {
		if(error)
			throw error;

		var id = doc._id;

		collection.update({_id: id}, {key: "someval22"}, function(error, updated) {
			if(error)
				throw error;
			else
				console.log(id + " updated successfully");
		});
	});

#### Remove ####

	var mongolocal = require('mongolocal');
	var extCollection = []; // collection is a simple array
	var collection = mongolocal({
		collection: extCollection,
		remove: function(index) {
			collection.splice(index, 0);
		}
	});

	var doc = {key: "val1"}
	collection.insert(doc, function(error, writeResult) {
		if(error)
			throw error;
		else {
			var id = doc._id;
			collection.remove({_id: id}, function(error, success) {
				if(error)
					throw error;
				else
					console.log(id + " removed");
			});
		}
	});