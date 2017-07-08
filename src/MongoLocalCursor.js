// http://mongodb.github.io/node-mongodb-native/2.2/api/Cursor.html

function MongoLocalCursor(peekResult, nextResult, rewindResults) {
	this._peekResult = peekResult;
	this._nextResult = nextResult;
	this._rewindResults = rewindResults;
}

MongoLocalCursor.prototype.next = function(callback) {
	this._nextDocIndex(function(error, doc, index) {
		callback(error, doc);
	});
};

MongoLocalCursor.prototype.hasNext = function(callback) {
	callback(null, this._peekResult() == null);
};

MongoLocalCursor.prototype.rewind = function(callback) {
	// cursor.rewind() resets the internal pointer in the cursor to the beginning
	this._rewindResults();
};

MongoLocalCursor.prototype.forEach = function(callback) {
	this._forEachDocIndex(function(doc) {
		callback(doc);
	});
};

MongoLocalCursor.prototype.toArray = function(callback) {
	var cursor = this;
	var results = [];
	getNext();

	function getNext() {
		cursor.next(function(error, doc) {
			if(error)
				callback(error, null);
			else if(doc == null)
				callback(error, results);
			else {
				results.push(doc);
				getNext();
			}
		});
	}
};

MongoLocalCursor.prototype._forEachDocIndex = function(callback) {
	var cursor = this;
	sendNext();

	function sendNext() {
		cursor._nextDocIndex(function(error, doc, index) {
			if(!error && index !== null) {
				callback(doc, index);
				sendNext();
			}
		});
	}
};

MongoLocalCursor.prototype._nextDocIndex = function(callback) {
	// https://mongodb.github.io/node-mongodb-native/markdown-docs/queries.html#nextobject
	// cursor.nextObject(function(err, doc){}) retrieves the next record from database. If doc is null, then there weren’t any more records.
	var result = this._nextResult();
	if(result == null)
		callback(null, null, null);
	else
		callback(null, result.doc, result.index);
};


module.exports = function(peekResult, nextResult, rewindResults) {
	return new MongoLocalCursor(peekResult, nextResult, rewindResults);
};