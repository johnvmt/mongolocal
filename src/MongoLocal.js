var Utils = require('./Utils');
var fauxmongo = require('fauxmongo');
var objectid = require('objectid');

function MongoLocal(config) {
	if(typeof config == 'undefined' || config === null)
		config = {};

	this.config = config;
	this.collection = (typeof this.config.collection == 'object' || Array.isArray(this.config.collection)) ? this.config.collection : {};
	this._cappedDocs = [];
}

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
	// docs, [callback]

	var docs = arguments[0];
	if(arguments.length == 2) {
		var options = {};
		var callback = arguments[1];
	}
	else if(arguments.length == 3) {
		var options = arguments[1];
		var callback = arguments[2];
	}

	var self = this;
	try {
		if (Array.isArray(docs)) // insert multiple docs
			docs.forEach(insertDoc);
		else // insert single doc
			insertDoc(docs);
		callbackSafe(null, docs);
	}
	catch(error) {
		callbackSafe(error, null);
	}

	function callbackSafe(error, result) {
		if(typeof callback == 'function')
			callback(error, result);
	}

	function insertDoc(doc) {
		// TODO duplicate docs before adding _id? Check mongo spec
		if(typeof doc._id == 'undefined')
			doc._id = objectid();

		if(typeof self.config.insert == 'function') // override is set (for Polymer)
			self.config.insert(doc);
		else if(Array.isArray(self.collection))
			self.collection.push(doc);
		else
			self.collection[doc._id] = doc;

		self._cappedInsert(doc._id);
	}
};

MongoLocal.prototype.update = function() {
	// [query,] updateOperations, [options,] [callback,]
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.update/
	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'updateOperations', level: 0, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'options', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'callback', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
		]
	);

	var updateOperations = validateUpdate(parsedArgs.updateOperations);

	var self = this;
	this._findForEach(parsedArgs.query, function(doc, index) {
		if(typeof self.config.update == 'function') // override is set (for Polymer)
			self.config.update(index, self.updateDoc(doc, updateOperations, true));
		else
			self.updateDoc(doc, updateOperations, false);
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
	// [query,] [justOne]
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.remove/

	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'justOne', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'boolean'; }},
			{name: 'callback', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
		]
	);

	var self = this;
	self._findForEach(parsedArgs.query, function(doc, index) {
		var docId = doc._id;
		if(typeof self.config.remove == 'function')
			self.config.remove(index);
		else if(Array.isArray(self.collection))
			self.collection.splice(index, 1);
		else
			delete self.collection[index];

		self._cappedRemove(docId);
	});

	if(typeof parsedArgs.callback == 'function')
		parsedArgs.callback(null, true);
};

MongoLocal.prototype.isCapped = function() {
	return typeof this.config.max == 'number';
};

MongoLocal.prototype.updateDoc = function(doc, updateOperations, copy) {
	if(typeof copy == 'boolean' && copy) // make a copy instead of updating in place
		doc = JSON.parse(JSON.stringify(doc));
	var updateMongoOperators = {};
	Utils.objectForEach(updateOperations, function(operationValue, operationKey) {
		if(operationKey.charAt(0) == '$') // operation
			updateMongoOperators[operationKey] = operationValue;
		else
			doc[operationKey] = operationValue;
	});

	// TODO add options here
	fauxmongo.update(doc, updateMongoOperators);

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

	var self = this;

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
		if(self._docFilter(doc, parsedArgs.query))
			parsedArgs.callback(doc, index)
	}
};

MongoLocal.prototype._docFilter = function(doc, query) {
	return fauxmongo.matchQuery(doc, query);
};

MongoLocal.prototype._cappedInsert = function(docId) {
	if(this.isCapped()) {
		this._cappedDocs.push(docId); // add to cap index
		while(this._cappedDocs.length > this.config.max) {
			// TODO change this._cappedDocs.shift() to this._cappedDocs[0]? (if remove is synchronous)
			this.remove(this._cappedDocs.shift(), true);
		}
	}
};

MongoLocal.prototype._cappedRemove = function(docId) {
	var capIndex = this._cappedDocs.indexOf(docId);
	if(capIndex >= 0)
		this._cappedDocs.splice(capIndex, 0);
};

module.exports = MongoLocal;