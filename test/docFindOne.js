var assert = require('assert');
var oms = require('../')();

describe('Doc FindOne', function(){
	describe('Database doc', function(){
		it('should insert 10 docs, then find the first one', function(done) {
			for(var ctr = 0; ctr < 10; ctr++) {
				oms.insert({key: ctr}, function(error, object) {
					if(error)
						throw error;
				});
			}

			oms.findOne({}, function(error, result) {
				if(error)
					throw error;
				if(typeof result == 'object' && result.key == 0)
					done();
				else
					throw new Error('Wrong result');
			});
		});
	});
});