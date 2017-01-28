var FauxMongo = require('fauxmongo');
var ObjectId = require('objectid');
var EventEmitter = require('wolfy87-eventemitter');
var Utils = require('./Utils');
var IndexedLinkedList = require('./IndexedLinkedList');

function MongoLocal(config) {
	if(typeof config == 'undefined' || config === null)
		config = {};

	this.config = config;
	this.collection = (typeof this.config.collection == 'object' || Array.isArray(this.config.collection)) ? this.config.collection : {};
	this._cappedDocs = IndexedLinkedList();
}

MongoLocal.prototype.__proto__ = EventEmitter.prototype;

MongoLocal.prototype.find = function() {
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.find/
	// collection, [query,] [projection,] [callback]
	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'projection', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'callback', level: 0, validate: function(arg, allArgs) { return typeof(arg) === 'function'; }}
		]
	);

	var result = [];
	try {
		this._findForEach(parsedArgs.query, function (doc) {
			result.push(doc);
		});

		// TODO projection
		parsedArgs.callback(null, result);
	}
	catch(error) {
		parsedArgs.callback(error, null);
	}
};

/*
MongoLocal.prototype.findOne = function() {
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.findOne/
	// collection, [query,] [projection,] [callback]
	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'projection', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'callback', level: 0, validate: function(arg, allArgs) { return typeof(arg) === 'function'; }}
		]
	);
};
*/

/**
 *
 * @param docs
 * @param options
 * @param callback
 */
MongoLocal.prototype.insert = function() {
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.insert/
	// docs, [options], [callback]
	var mongolocal = this;

	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'docs', level: 0, validate: function(arg, allArgs) { return typeof(arg) == 'object' }},
			{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }, default: {}},
			{name: 'callback', level: 1, validate: function(arg, allArgs) { return typeof(arg) === 'function'; }}
		]
	);

	var options = Utils.objectMerge({emit: true}, parsedArgs.options);
	options = Utils.objectMerge({emitCascade: options.emit}, options); // add emitCascade option

	try {
		if (Array.isArray(parsedArgs.docs)) // insert multiple docs
			parsedArgs.docs.forEach(insertDoc);
		else // insert single doc
			insertDoc(parsedArgs.docs);
		callbackSafe(null, parsedArgs.docs);
	}
	catch(error) {
		callbackSafe(error, null);
	}

	function callbackSafe(error, result) {
		if(typeof parsedArgs.callback == 'function')
			parsedArgs.callback(error, result);
	}

	function insertDoc(doc) {
		// TODO duplicate docs before adding _id? Check mongo spec
		if(typeof doc._id == 'undefined')
			doc._id = ObjectId();

		if(typeof mongolocal.config.insert == 'function') // override is set (for Polymer)
			mongolocal.config.insert(doc);
		else if(Array.isArray(mongolocal.collection))
			mongolocal.collection.push(doc);
		else
			mongolocal.collection[doc._id] = doc;

		mongolocal._cappedInsert(doc._id, options.emitCascade);

		if(options.emit)
			mongolocal.emit('insert', doc);
	}
};

MongoLocal.prototype._cloneObject = function(object) {
	return JSON.parse(JSON.stringify(object));
};

MongoLocal.prototype.update = function() {
	// [query,] updateOperations, [options,] [callback,]
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.update/
	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'updateOperations', level: 0, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }, default: {}},
			{name: 'callback', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
		]
	);

	var options = Utils.objectMerge({emit: true}, parsedArgs.options);
	options = Utils.objectMerge({emitCascade: options.emit}, options); // add emitCascade option

	var updateOperations = validateUpdate(parsedArgs.updateOperations);

	// TODO add multi option
	var mongolocal = this;
	this._findForEach(parsedArgs.query, function(doc, index) {

		if(options.emit)
			var unmodifiedDoc = mongolocal._cloneObject(doc);

		if(typeof mongolocal.config.update == 'function') {// override is set (for Polymer)
			var modifiedDoc = mongolocal._updateDoc(doc, updateOperations, true);
			mongolocal.config.update(index, unmodifiedDoc, modifiedDoc);
		}
		else
			var modifiedDoc = mongolocal._updateDoc(doc, updateOperations, false);

		if(options.emit)
			mongolocal.emit('update', unmodifiedDoc, modifiedDoc, updateOperations);
	});

	// TODO return WriteResult: https://docs.mongodb.com/v3.0/reference/method/db.collection.update/#writeresults-update
	if(typeof parsedArgs.callback == 'function')
		parsedArgs.callback(null, true);

	function validateUpdate(update) {
		var validated = {};

		Utils.objectForEach(update, function(attributeVal, attributeKey) {
			if(attributeKey == '$set') // merge set with attributes already set
				validated['$set'] = Utils.objectMerge(validated['$set'], attributeKey);
			else if(attributeKey.charAt(0) == '$') // any other operation (pass through)
				validated[attributeKey] = attributeVal;
			else { // regular attribute (non-operation)
				if(typeof validated['$set'] != 'object' || validated['$set'] == null)
					validated['$set'] = {};
				validated['$set'][attributeKey] = attributeVal;
			}
		});

		return validated;
	}
};

MongoLocal.prototype.remove = function() {
	// [query,] [options]
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.remove/

	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }, default: {}},
			{name: 'callback', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
		]
	);

	var options = Utils.objectMerge({emit: true, justOne: false}, parsedArgs.options);
	options = Utils.objectMerge({emitCascade: options.emit}, options); // add emitCascade option

	var mongolocal = this;
	mongolocal._findForEach(parsedArgs.query, function(doc, index) {
		if(options.emit)
			var docClone = mongolocal._cloneObject(doc);

		var docId = doc._id;
		if(typeof mongolocal.config.remove == 'function')
			mongolocal.config.remove(index);
		else if(Array.isArray(mongolocal.collection))
			mongolocal.collection.splice(index, 1);
		else
			delete mongolocal.collection[index];

		if(options.emit)
			mongolocal.emit('remove', docClone);

		mongolocal._cappedRemove(docId);
	});

	if(typeof parsedArgs.callback == 'function')
		parsedArgs.callback(null, true);
};

MongoLocal.prototype.isCapped = function() {
	return typeof this.config.max == 'number';
};

MongoLocal.prototype._updateDoc = function(doc, updateOperations, clone) {
	if(typeof clone == 'boolean' && clone) // make a copy instead of updating in place
		doc = this._cloneObject(doc);
	var updateMongoOperators = {};
	Utils.objectForEach(updateOperations, function(operationValue, operationKey) {
		if(operationKey.charAt(0) == '$') // operation
			updateMongoOperators[operationKey] = operationValue;
		else
			doc[operationKey] = operationValue;
	});

	// TODO add options here
	FauxMongo.update(doc, updateMongoOperators);

	return doc;
};

MongoLocal.prototype._findForEach = function() {
	// [query,] [options], callback
	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'callback', level: 0, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
		]
	);

	var mongolocal = this;

	if(Array.isArray(this.collection)) {// collection is an array
		parsedArgs.query = typeof parsedArgs.query == 'string' ? {_id: parsedArgs.query} : parsedArgs.query; // convert to complex query
		this.collection.forEach(docFilter);
	}
	else { // collection is an object
		// convert object({_id: x}) to string(x)
		try {
			if (parsedArgs.query == {_id: parsedArgs.query._id})
				parsedArgs.query = parsedArgs.query._id;
		}
		catch(error) {}

		if(typeof parsedArgs.query == 'string') { // collection is an object, looking for doc by index
			if (typeof this.collection[parsedArgs.query]) // doc exists
				parsedArgs.callback(this.collection[parsedArgs.query], parsedArgs.query);
		}
		else // collection is an object, complex query
			Utils.objectForEach(this.collection, docFilter);
	}

	function docFilter(doc, index) {
		if(mongolocal._docFilter(doc, parsedArgs.query))
			parsedArgs.callback(doc, index)
	}
};

MongoLocal.prototype._docFilter = function(doc, query) {
	return FauxMongo.matchQuery(doc, query);
};

MongoLocal.prototype._cappedInsert = function(docId, emit) {
	if(typeof emit != 'boolean')
		emit = true;

	if(this.isCapped()) {
		this._cappedDocs.push(docId, docId); // add to cap index

		while(this._cappedDocs.length > this.config.max)
			this.remove(this._cappedDocs.dequeue(), {emit: emit});
	}
};

MongoLocal.prototype._cappedRemove = function(docId) {
	try {
		this._cappedDocs.remove(docId);
	}
	catch(error) {
		if(error.message != 'undefined_item')
			throw error;
	}
};

module.exports = function(config) {
	return new MongoLocal(config);
};