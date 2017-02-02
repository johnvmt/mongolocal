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
	// [query,] [projection,] [callback]
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

MongoLocal.prototype.findOne = function() {
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.findOne/
	// [query,] [projection,] [callback]
	// collection, [query,] [projection,] [callback]
	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'projection', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'callback', level: 0, validate: function(arg, allArgs) { return typeof(arg) === 'function'; }}
		]
	);

	var BreakException = {};
	var result = undefined;
	try {
		this._findForEach(parsedArgs.query, function (doc) {
			result = doc;
			throw BreakException; // break out of loop
		});
		parsedArgs.callback(null, null);
	}
	catch(error) {
		if(error == BreakException)
			parsedArgs.callback(null, result);
		else
			parsedArgs.callback(error, null);
	}
};

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
			mongolocal.emit('insert', doc, options);
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

	var mongolocal = this;

	var options = Utils.objectMerge({emit: true, multi: false, upsert: false}, parsedArgs.options);
	options = Utils.objectMerge({emitCascade: options.emit}, options); // add emitCascade option

	var query = mongolocal._validateQuery(parsedArgs.query);
	var updateOperations = this._validateUpdate(parsedArgs.updateOperations);

	if(!options.multi)
		var BreakException = {};

	try {
		var numUpdated = 0;
		this._findForEach(parsedArgs.query, function (doc, index) {
			numUpdated++;
			if (options.emit)
				var unmodifiedDoc = mongolocal._cloneObject(doc);

			if (typeof mongolocal.config.update == 'function') {// override is set (for Polymer)
				var modifiedDoc = mongolocal._updateDoc(doc, updateOperations, true);
				mongolocal.config.update(index, unmodifiedDoc, modifiedDoc);
			}
			else
				var modifiedDoc = mongolocal._updateDoc(doc, updateOperations, false);

			if (options.emit)
				mongolocal.emit('update', unmodifiedDoc, modifiedDoc, updateOperations, options);

			if (!options.multi)
				throw BreakException;
		});

		if(!numUpdated && options.upsert) { // Upsert
			// https://docs.mongodb.com/manual/reference/method/db.collection.update/#upsert-option
			var insertDoc = {};

			if(typeof query._id != 'undefined')
				insertDoc._id = query._id;
			FauxMongo.update(insertDoc, updateOperations);

			var insertOptions = mongolocal._cloneObject(options);
			insertOptions.emit = insertOptions.emitCascade;
			mongolocal.insert(insertDoc, insertOptions, parsedArgs.callback);
		}
	}
	catch(exception) {
		if (exception !== BreakException)
			throw exception;
	}

	// TODO return WriteResult: https://docs.mongodb.com/v3.0/reference/method/db.collection.update/#writeresults-update
	if(typeof parsedArgs.callback == 'function' && numUpdated && !options.upsert)
		parsedArgs.callback(null, true);
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

	var query = mongolocal._validateQuery(parsedArgs.query);

		mongolocal._findForEach(query, function(doc, index) {
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
			mongolocal.emit('remove', docClone, options);

		mongolocal._cappedRemove(docId);
	});

	if(typeof parsedArgs.callback == 'function')
		parsedArgs.callback(null, true);
};

MongoLocal.prototype.isCapped = function() {
	return typeof this.config.max == 'number';
};

/**
 * Validate and fix update operations
 * @param update
 * @returns {{}}
 * @private
 */
MongoLocal.prototype._validateUpdate = function(update) {
	var validated = {};

	Utils.objectForEach(update, function(attributeVal, attributeKey) {
		if(attributeKey == '$set') // merge set with attributes already set
			validated['$set'] = Utils.objectMerge(validated['$set'], attributeVal);
		else if(attributeKey.charAt(0) == '$') // any other operation (pass through)
			validated[attributeKey] = attributeVal;
		else { // regular attribute (non-operation)
			if(typeof validated['$set'] != 'object' || validated['$set'] == null)
				validated['$set'] = {};
			validated['$set'][attributeKey] = attributeVal;
		}
	});

	return validated;
};

MongoLocal.prototype._validateQuery = function(query) {
	if(typeof query != 'object')
		return {_id: query};
	else
		return query;
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

	var query = mongolocal._validateQuery(parsedArgs.query);

	if(Array.isArray(this.collection)) {// collection is an array
		this.collection.forEach(docFilter);
	}
	else { // collection is an object

		if(Object.keys(query).length == 1 && typeof query._id != 'undefined') { // collection is an object, looking for doc by index
			if (typeof this.collection[query._id]) // doc exists
				parsedArgs.callback(this.collection[query._id], query._id);
		}
		else // collection is an object, complex query
			Utils.objectForEach(this.collection, docFilter);
	}

	function docFilter(doc, index) {
		if(mongolocal._docFilter(doc, query))
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

		while(this._cappedDocs.length > this.config.max) {
			this.remove(this._cappedDocs.dequeue(), {emit: emit});
		}
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