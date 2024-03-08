// const assert = require('assert');
// // const sinon = require('sinon');
// // var AWS = require('aws-sdk-mock');
// // const m_response = require('cfn-response');

// const ciscomerakiMock = require('./ciscomeraki_mock');
// // var m_alCollector = require('@alertlogic/al-collector-js');
// var CiscomerakiCollector = require('../collector').CiscomerakiCollector;
// // const m_al_aws = require('@alertlogic/al-aws-collector-js').Util;

// describe('Unit Tests', function() {
//     describe('Next state tests', function() {
//         it('log format success', function(done) {
//             let ctx = {
//                 invokedFunctionArn : ciscomerakiMock.FUNCTION_ARN,
//                 fail : function(error) {
//                     assert.fail(error);
//                     done();
//                 },
//                 succeed : function() {
//                     done();
//                 }
//             };
            
//             CiscomerakiCollector.load().then(function(creds) {
//                 var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//                 let nextState = collector._getNextCollectionState(ciscomerakiMock.LOG_EVENT);
//                 // console.log('!!!', fmt);
//                 console.log('!!!', nextState);
//                 // put some assertions on you next state here
//                 done();
//             });
//         });
//     });

//     describe('Format Tests', function() {
//         it('log format success', function(done) {
//             let ctx = {
//                 invokedFunctionArn : ciscomerakiMock.FUNCTION_ARN,
//                 fail : function(error) {
//                     assert.fail(error);
//                     done();
//                 },
//                 succeed : function() {
//                     done();
//                 }
//             };
            
//             CiscomerakiCollector.load().then(function(creds) {
//                 var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//                 let fmt = collector.pawsFormatLog(ciscomerakiMock.LOG_EVENT);
//                 console.log('!!!', fmt);
//                 // put some assertions on your formatted message here
//                 done();
//             });
//         });
//     });
// });
