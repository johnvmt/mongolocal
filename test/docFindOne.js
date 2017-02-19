var assert = require('assert');


describe('Doc FindOne', function(){
	describe('Database doc', function(){
		it('should insert 10 docs, then find the first one', function(done) {
			var oms = require('../')();
			for(var ctr = 0; ctr < 10; ctr++) {
				oms.insert({key: ctr}, function(error, object) {
					if(error)
						throw error;
				});
			}

			oms.findOne({}, function(error, result) {
				if(typeof result == 'object' && result != null && result.key == 0)
					done();
				else
					throw new Error('Wrong result');
			});
		});
	});

	/* describe('Database doc', function(){
		it('findOne with empty result', function(done) {
			var oms = require('../')();

			oms.findOne({}, function(error, result) {
				if(error != null || result != null)
					throw new Error('Wrong result');
				else
					done();
			});
		});
	}); */
});