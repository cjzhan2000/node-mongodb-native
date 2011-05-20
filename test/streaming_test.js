var testCase = require('nodeunit').testCase,
  debug = require('sys').debug
  inspect = require('sys').inspect,
  nodeunit = require('nodeunit'),
  Db = require('../lib/mongodb').Db,
  Collection = require('../lib/mongodb').Collection,
  Server = require('../lib/mongodb').Server;

var client = new Db('integration_tests', new Server("127.0.0.1", 27017, {auto_reconnect: false}));

// Define the tests, we want them to run as a nested test so we only clean up the 
// db connection once
var tests = testCase({
  setUp: function(callback) {
    client.open(function(err, db_p) {
      // Save reference to db
      client = db_p;
      // Start tests
      callback();
    });
  },
  
  tearDown: function(callback) {
    numberOfTestsRun = numberOfTestsRun - 1;
    // Drop the database and close it
    if(numberOfTestsRun <= 0) {
      client.dropDatabase(function(err, done) {
        client.close();
        callback();
      });        
    } else {
      client.close();
      callback();        
    }      
  },

  shouldStreamRecordsCallsDataTheRightNumberOfTimes : function(test) {
    client.createCollection('test_stream_records', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert([{'a':1}, {'b' : 2}, {'c' : 3}, {'d' : 4}, {'e' : 5}], function(err, ids) {
        collection.find({}, {'limit' : 3}, function(err, cursor) {
          var stream = cursor.streamRecords(); 
          var callsToEnd = 0;
          stream.on('end', function() { 
            test.done();
          });
          
          var callsToData = 0;
          stream.on('data',function(data){ 
            callsToData += 1;
            test.ok(callsToData <= 3);
          }); 
        });
      });
    });    
  },
  
  shouldStreamRecordsCallsEndTheRightNumberOfTimes : function(test) {
    client.createCollection('test_stream_records', function(err, collection) {
      test.ok(collection instanceof Collection);
      collection.insert([{'a':1}, {'b' : 2}, {'c' : 3}, {'d' : 4}, {'e' : 5}], function(err, ids) {
        collection.find({}, {'limit' : 3}, function(err, cursor) {
          var stream = cursor.streamRecords(function(er,item) {}); 
          var callsToEnd = 0;
          stream.on('end', function() { 
            callsToEnd += 1;
            test.equal(1, callsToEnd);
            setTimeout(function() {
              // Let's close the db
              if (callsToEnd == 1) {
                test.done();
              }
            }.bind(this), 1000);
          });
          
          stream.on('data',function(data){ /* nothing here */ }); 
        });
      });
    });    
  },
  
  shouldStreamDocumentsWithLimitForFetching : function(test) {
    var docs = []
    
    for(var i = 0; i < 3000; i++) {
      docs.push({'a':i})
    }

    client.createCollection('test_streaming_function_with_limit_for_fetching', function(err, collection) {
      test.ok(collection instanceof Collection);

      collection.insertAll(docs, function(err, ids) {        
        collection.find({}, function(err, cursor) {
          // Execute find on all the documents
          var stream = cursor.streamRecords({fetchSize:1000}); 
          var callsToEnd = 0;
          stream.on('end', function() { 
            test.done();
          });

          var callsToData = 0;
          stream.on('data',function(data){ 
            callsToData += 1;
            test.ok(callsToData <= 3000);
          }); 
        });        
      });
    });    
  },   
})

// Stupid freaking workaround due to there being no way to run setup once for each suite
var numberOfTestsRun = Object.keys(tests).length;
// Assign out tests
module.exports = tests;