var FauxMongo = require('fauxmongo');
var ObjectId = require('objectid');
var EventEmitter = require('wolfy87-eventemitter');
var Utils = require('./Utils');
var MongoLocalCursor = require('./MongoLocalCursor');
var IndexedLinkedList = require('./IndexedLinkedList');

function MongoLocal(config) {
	if(typeof config == 'undefined' || config === null)
		config = {};

	this.config = config;
	this.collection = (typeof this.config.collection == 'object' || Array.isArray(this.config.collection)) ? this.config.collection : {};
	this.docsLinkedList = IndexedLinkedList();
}

MongoLocal.prototype.__proto__ = EventEmitter.prototype;

MongoLocal.prototype.find = function() {
	// https://docs.mongodb.com/v3.0/reference/method/db.collection.find/
	// [query,] [projection]
	var mongolocal = this;

	var parsedArgs = Utils.parseArgs(
		arguments,
		[
			{name: 'query', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object' || typeof(arg) == 'string'; }, default: {}},
			{name: 'projection', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'object'; }},
			{name: 'callback', level: 1, validate: function(arg, allArgs) { return typeof(arg) == 'function'; }}
		]
	);

	var query = mongolocal._validateQuery(parsedArgs.query);

	// Set the starting positions
	var index, currentNode, returnedOne, lastResultDoc;
	rewindResults();

	var cursor = MongoLocalCursor(peekResult, nextResult, rewindResults);
	if(typeof parsedArgs.callback == 'function')
		parsedArgs.callback(null, cursor);
	return cursor;

	// Return the next result without advancing the cursor
	function peekResult() {
		if(Array.isArray(mongolocal.collection)) {
			if(index > 0 && lastResultDoc != mongolocal.collection[index]) // Collection was changed (probably doc was deleted); try reversing
				index--;
			while(!returnedOne && index < mongolocal.collection.length) {
				var result = {index: index, doc: mongolocal.collection[index]};
				if(mongolocal._docFilter(result.doc, query)) { // doc matches
					lastResultDoc = result.doc;
					return result;
				}
				else
					index++; // Cursor will not advance if result is returned
			}
			return null;
		}
		else {
			if(Object.keys(query).length == 1 && (typeof query._id == 'string' || typeof query._id == 'number')) // Looking for single doc, by index
				return (typeof mongolocal.collection[query._id] != 'undefined' && !returnedOne) ? {index: query._id, doc: mongolocal.collection[query._id]} : null;
			else {
				while(currentNode != null) {
					var result = {index: currentNode.data, doc: mongolocal.collection[currentNode.data]};
					if(mongolocal._docFilter(result.doc, query)) // doc matched
						return result;
					else
						currentNode = currentNode.next; // Will not be triggered if result is returned
				}
				return null; // Reached end of collection
			}
		}
	}

	// Return the next result and advance the cursor
	function nextResult() {
		var result = peekResult();

		if(Object.keys(query).length == 1 && typeof query._id != 'undefined') // Looking for single doc, by index
			returnedOne = true;
		if(Array.isArray(mongolocal.collection)) {// TODO check if
			index++;
			lastResultDoc = mongolocal.collection[index];
		}
		else if(currentNode != null)
			currentNode = currentNode.next;

		return result;
	}

	function rewindResults() {
		returnedOne = false;
		if(Array.isArray(mongolocal.collection))
			index = 0;
		else
			currentNode = mongolocal.docsLinkedList.head;
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

	this.find(parsedArgs.query, parsedArgs.projection).next(function(error, doc) {
		parsedArgs.callback(error, doc);
	});
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

	if (Array.isArray(parsedArgs.docs)) {// insert multiple docs
		var continueInsert = true; // TODO add option to continue on error
		parsedArgs.docs.forEach(function (doc) {
			insertDocSafe(doc, function (error) {
				if (error) {
					continueInsert = false;
					callbackSafe(error);
				}
			});
		});
		if (continueInsert)
			callbackSafe(null, null);
	}
	else {// insert single doc
		insertDocSafe(parsedArgs.docs, function (error) {
			if (error)
				callbackSafe(error, null);
			else
				callbackSafe(null, null);
		});
	}

	function callbackSafe(error, result) {
		if(typeof parsedArgs.callback == 'function')
			parsedArgs.callback(error, result);
	}

	function insertDocSafe(doc, callback) {
		if(typeof doc._id == 'undefined') {
			doc._id = mongolocal._objectId();
			insertDoc(doc, callback);
		}
		else {
			mongolocal.findOne({_id: doc._id}, function(error, result) {
				if(error)
					callback('find_error');
				else if(result != null)
					callback('id_exists');
				else
					insertDoc(doc, callback);
			});
		}
	}

	function insertDoc(doc, callback) {
		// TODO duplicate docs before adding _id? Check mongo spec
		if(typeof mongolocal.config.insert == 'function') // override is set (for Polymer)
			mongolocal.config.insert(doc);
		else if(Array.isArray(mongolocal.collection))
			mongolocal.collection.push(doc);
		else
			mongolocal.collection[doc._id] = doc;

		mongolocal._cappedInsert(doc._id, options.emitCascade);

		if(options.emit)
			mongolocal.emit('insert', doc, options);

		callback(null);
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

		var findCursor = this.find(parsedArgs.query);
		findCursor._forEachDocIndex(function(doc, index) {
			numUpdated++;

			if(options.emit)
				var unmodifiedDoc = mongolocal._cloneObject(doc);

			if(typeof mongolocal.config.update == 'function') {// override is set (for Polymer)
				var modifiedDoc = mongolocal._updateDoc(doc, updateOperations, true);
				mongolocal.config.update(index, unmodifiedDoc, modifiedDoc);
			}
			else
				var modifiedDoc = mongolocal._updateDoc(doc, updateOperations, false);

			if(options.emit)
				mongolocal.emit('update', unmodifiedDoc, modifiedDoc, updateOperations, options);

			if(!options.multi)
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
	if(typeof parsedArgs.callback == 'function' && !(!numUpdated && options.upsert))
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
	mongolocal.find(query)._forEachDocIndex(function(doc, index) {
		if(options.emit)
			var docClone = mongolocal._cloneObject(doc);

		var docId = doc._id;
		if(typeof mongolocal.config.remove == 'function')
			mongolocal.config.remove(index);
		else if(Array.isArray(mongolocal.collection))
			mongolocal.collection.splice(index, 1);
		else
			delete mongolocal.collection[index];

		mongolocal._cappedRemove(docId);

		if(options.emit)
			mongolocal.emit('remove', docClone, options);
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

MongoLocal.prototype._docFilter = function(doc, query) {
	return FauxMongo.matchQuery(doc, query);
};

MongoLocal.prototype._cappedInsert = function(docId, emit) {
	if(typeof emit != 'boolean')
		emit = true;

	// Maintain list when collection is capped or cannot asynchronously iterate over docs
	if(this.isCapped() || !Array.isArray(this.collection))
		this.docsLinkedList.enqueue(docId, docId); // add to cap index

	if(this.isCapped()) {
		while(this.docsLinkedList.length > this.config.max) {
			var _id = this.docsLinkedList.head.data;
			this.remove(_id, {emit: emit});
		}
	}
};

MongoLocal.prototype._cappedRemove = function(docId) {
	try {
		this.docsLinkedList.remove(docId);
	}
	catch(error) {
		if(error.message != 'undefined_item')
			throw error;
	}
};

MongoLocal.prototype._objectId = function() {
	return (typeof this.config.objectId == 'function') ? this.config.objectId() : ObjectId();
}

module.exports = function(config) {
	return new MongoLocal(config);
};