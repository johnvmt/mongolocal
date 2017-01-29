# Mongo Local #

Stripped-down version of MongoDB module that operates on a collection stored in memory. Doc matching and updating is done using the fauxmongo module.

Collections can be stored in an array, or an object with keys in the object corresponding to the doc's ID.

NOTE: This project is not affiliated with MongoDB

## Changelog ##

### Version 1.1.1 ###

* Events now emit options as last argument

### Version 1.1.0 ###

* Added findOne function
* Update function now defaults to updating a single doc (use multi option to update many)

### Version 1.0.2 ###

* Corrected bug to speed up searching by index in an Object-based collection
 
### Version 1.0.1 ###
 
* Added cascadeEmit option so that inserting into a capped collection can trigger or not trigger a removal event
* Uses indexed linked list to store capped IDs, to reduce removal time on long lists


### Version 1.0.0 ###

* Update function defined in config now takes arguments: (index, originalDoc, updatedDoc)
* Added event emitter on insert, update, remove

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

	collection.find({key: "val"}, function(error, results) {
		if(error)
			console.error("Something went wrong");
		else {
			results.forEach(function(doc) {
				console.log(doc.key);
			});
		}
	});
	
### Insert document ###

	collection.insert({key: "someval1"}, function (error, doc) {
		if(error)
			console.error("Something went wrong");
		else
			console.log("Document inserted with ID", doc._id);
	});
	
### Update document ###

	collection.insert({key: "val1" }, function(error, doc) {
		if(error)
			console.error("Something went wrong on insertion");
		else {
			var id = objectExtended._id;
			oms.update(id, {key: "val2"}, function(error, success) {
				if(error)
					console.error("Something went wrong on update");
				else
					console.log("Update succeeded");
			}
		}
	});

### Remove document ###

	collection.insert({key: "val1" }, function(error, doc) {
		if(error)
			console.error("Something went wrong on insertion");
		else {
			var id = objectExtended._id;
			oms.remove(id, function(error, success) {
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

	collection.insert({key: "someval1" }, function(error, doc) {
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

	collection.insert({key: "someval1" }, function(error, doc) {
		if(error)
			throw error;

		var id = doc._id;

		collection.update(id, {key: "someval22"}, function(error, updated) {
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

	collection.insert({key: "someval1" }, function(error, object) {
		if(error)
			throw error;
		else {
			var id = object._id;
			collection.remove({_id: id}, function(error, success) {
				if(error)
					throw error;
				else
					console.log(id + " removed");
			});
		}
	});