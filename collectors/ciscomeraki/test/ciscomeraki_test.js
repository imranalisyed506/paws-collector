// const sinon = require('sinon');
// const assert = require('assert');

// const ciscomerakiMock = require('./ciscomeraki_mock');
// var CiscomerakiCollector = require('../collector').CiscomerakiCollector;
// const m_response = require('cfn-response');
// const moment = require('moment');
// const utils = require("../utils");

// const { KMS } = require("@aws-sdk/client-kms"),
//     { SSM } = require("@aws-sdk/client-ssm");


// var responseStub = {};
// let getAPIDetails;
// let getAPILogs;
// let getAllNetworks;

// describe('Unit Tests', function () {
//     beforeEach(function () {
//         sinon.stub(SSM.prototype, 'getParameter').callsFake(function (params, callback) {
//             const data = Buffer.from('test-secret');
//             return callback(null, { Parameter: { Value: data.toString('base64') } });
//         });
//         sinon.stub(KMS.prototype, 'decrypt').callsFake(function (params, callback) {
//             const data = {
//                 Plaintext: Buffer.from('{}')
//             };
//             return callback(null, data);
//         });

//         responseStub = sinon.stub(m_response, 'send').callsFake(
//             function fakeFn(event, mockContext, responseStatus, responseData, physicalResourceId) {
//                 mockContext.succeed();
//             });
//     });

//     afterEach(function () {
//         responseStub.restore();
//         KMS.prototype.decrypt.restore();
//         SSM.prototype.getParameter.restore();
//     });


//     describe('Paws Init Collection State', function () {
//         let ctx = {
//             invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
//             fail: function (error) {
//                 assert.fail(error);
//             },
//             succeed: function () { }
//         };
//         it('Paws Init Collection State Success', function (done) {
//             getAllNetworks = sinon.stub(utils, 'getAllNetworks').callsFake(
//                 function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
//                     return new Promise(function (resolve, reject) {
//                         return resolve(ciscomerakiMock.NETWORKS);
//                     });
//                 });
//             CiscomerakiCollector.load().then(function (creds) {
//                 var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//                 const startDate = moment().subtract(1, 'days').toISOString();
//                 process.env.paws_collection_start_ts = startDate;

//                 collector.pawsInitCollectionState(null, (err, initialStates, nextPoll) => {
//                     console.log(err, initialStates);
//                     initialStates.forEach((state) => {
//                         console.log(state);
//                         if (state.networkId === "L_686235993220604684") {
//                             assert.equal(state.networkId, "L_686235993220604684");
//                         } else if (state.networkId === "L_686235993220604720") {
//                             // assert.equal(moment(parseInt(state.until)).diff(parseInt(state.since), 'seconds'), 60);
//                             assert.equal(state.networkId, "L_686235993220604720");
//                         }
//                         else {
//                             assert.equal(state.poll_interval_sec, 240);
//                             assert.ok(state.since);
//                         }
//                     });
//                 });
//             });
//             getAllNetworks.restore();
//             done();
//         });
//     });

//     describe('Paws Get Register Parameters', function () {
//         it('Paws Get Register Parameters Success', function (done) {
//             let ctx = {
//                 invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
//                 fail: function (error) {
//                     assert.fail(error);
//                     done();
//                 },
//                 succeed: function () {
//                     done();
//                 }
//             };

//             CiscomerakiCollector.load().then(function (creds) {
//                 var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//                 const sampleEvent = { ResourceProperties: { StackName: 'a-stack-name' } };
//                 collector.pawsGetRegisterParameters(sampleEvent, (err, regValues) => {
//                     const expectedRegValues = {
//                         ciscoMerakiObjectNames: '[\"networkSecurityEvents\"]',
//                     };
//                     assert.deepEqual(regValues, expectedRegValues);
//                     done();
//                 });
//             });
//         });
//     });

//     describe('pawsGetLogs', function () {
//         let ctx = {
//             invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
//             fail: function (error) {
//                 assert.fail(error);
//             },
//             succeed: function () { }
//         };
//         it('Paws Get Logs Success', function (done) {
//             getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
//                 function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
//                     return new Promise(function (resolve, reject) {
//                         return resolve({ accumulator: [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT] });
//                     });
//                 });
//             getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
//                 function fakeFn(state) {
//                     return {
//                         url: "api_url",
//                         typeIdPaths: [{ path: ["type"] }],
//                         tsPaths: [{ path: ["occurredAt"] }],
//                         method: "GET"
//                     };
//                 });
//             getAllNetworks = sinon.stub(utils, 'getAllNetworks').callsFake(
//                 function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
//                     return new Promise(function (resolve, reject) {
//                         return resolve(ciscomerakiMock.NETWORKS);
//                     });
//                 });
//             CiscomerakiCollector.load().then(function (creds) {
//                 var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//                 const curState = {
//                     stream: "networkSecurityEvents",
//                     since: "2024-03-19T05:10:47.055027Z",
//                     networkId: "L_686235993220604684",
//                     until: null,
//                     nextPage: null,
//                     poll_interval_sec: 1
//                 };
//                 process.env.network_ids  = ["L_686235993220604684","L_686235993220604720"];
//                 collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
//                     assert.equal(logs.length, 2);
//                     assert.equal(newState.poll_interval_sec, 300);
//                     assert.ok(logs[0].type);
//                     getAPILogs.restore();
//                     getAPIDetails.restore();
//                     getAllNetworks.restore();
//                     done();
//                 });

//             });
//         });

//         // it('Paws Get Logs With NextPage Success', function (done) {
//         //     getAllNetworks = sinon.stub(utils, 'getAllNetworks').callsFake(
//         //         function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
//         //             return new Promise(function (resolve, reject) {
//         //                 return resolve(ciscomerakiMock.NETWORKS);
//         //             });
//         //         });
//         //     getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
//         //         function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
//         //             return new Promise(function (resolve, reject) {
//         //                 return resolve({ accumulator: [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT], nextPage: "nextPage" });
//         //             });
//         //         });
//         //     getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
//         //         function fakeFn(state) {
//         //             return {
//         //                 url: "api_url",
//         //                 typeIdPaths: [{ path: ["type"] }],
//         //                 tsPaths: [{ path: ["occurredAt"] }],
//         //                 method: "GET"
//         //             };
//         //         });
//         //     CiscomerakiCollector.load().then(function (creds) {
//         //         var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//         //         const startDate = "2024-03-21T08:00:21.754Z";
//         //         const curState = {
//         //             stream: "networkSecurityEvents",
//         //             since: startDate.valueOf(),
//         //             until: startDate.add(2, 'days').valueOf(),
//         //             nextPage: null,
//         //             poll_interval_sec: 1
//         //         };
//         //         collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
//         //             assert.equal(logs.length, 2);
//         //             assert.equal(newState.poll_interval_sec, 60);
//         //             assert.equal(newState.nextPage, "nextPage");
//         //             assert.ok(logs[0].type);
//         //             getAPILogs.restore();
//         //             getAPIDetails.restore();
//         //             getAllNetworks.restore();

//         //             done();
//         //         });

//         //     });
//         // });

//         // it('Paws Get client error', function (done) {
           
//         //     getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
//         //         function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
//         //             return new Promise(function (resolve, reject) {
//         //                 return reject({
//         //                     code: 40103,
//         //                     message: 'Invalid signature in request credentials',
//         //                     stat: 'FAIL'
//         //                 });
//         //             });
//         //         });
//         //     getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
//         //         function fakeFn(state) {
//         //             return {
//         //                 url: "api_url",
//         //                 typeIdPaths: [{ path: ["type"] }],
//         //                 tsPaths: [{ path: ["occurredAt"] }],
//         //                 method: "GET"
//         //             };
//         //         });
//         //     CiscomerakiCollector.load().then(function (creds) {
//         //         var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//         //         const startDate = moment().subtract(3, 'days');
//         //         const curState = {
//         //             stream: "networkSecurityEvents",
//         //             since: startDate.valueOf(),
//         //             until: startDate.add(2, 'days').valueOf(),
//         //             nextPage: null,
//         //             poll_interval_sec: 1
//         //         };
//         //         collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
//         //             assert.equal(err.errorCode, 40103);
//         //             getAPILogs.restore();
//         //             getAPIDetails.restore();
//         //             done();
//         //         });

//         //     });
//         // });

//         // it('Paws Get Logs check throttling error', function (done) {

//         //     getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
//         //         function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
//         //             return new Promise(function (resolve, reject) {
//         //                 return reject({ code: 42901,
//         //                     message: 'Too Many Requests',
//         //                     stat: 'FAIL' ,"errorCode":42901});
//         //             });
//         //         });
//         // getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
//         //     function fakeFn(state) {
//         //         const startDate = moment().subtract(1, 'days');
//         //         return {
//         //             url: "api_url",
//         //             typeIdPaths: [{ path: ["type"] }],
//         //             tsPaths: [{ path: ["occurredAt"] }],
//         //             method: "GET"
//         //         };
//         //     });
//         //     CiscomerakiCollector.load().then(function (creds) {
//         //         var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//         //         const startDate = moment();
//         //         const curState = {
//         //             stream: "telephony",
//         //             since: startDate.unix(),
//         //             poll_interval_sec: 60
//         //         };

//         //         var reportSpy = sinon.spy(collector, 'reportApiThrottling');
//         //         let putMetricDataStub = sinon.stub(CloudWatch.prototype, 'putMetricData').callsFake((params, callback) => callback());
//         //         collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
//         //             assert.equal(true, reportSpy.calledOnce);
//         //             assert.equal(logs.length, 0);
//         //             assert.equal(newState.poll_interval_sec, 120);
//         //             getAPILogs.restore();
//         //             getAPIDetails.restore();
//         //             putMetricDataStub.restore();
//         //             done();
//         //         });

//         //     });
//         // });
//     });

//     // describe('Next state tests', function () {
//     //     let ctx = {
//     //         invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
//     //         fail: function (error) {
//     //             assert.fail(error);
//     //         },
//     //         succeed: function () { }
//     //     };

//     //     it('Next state tests success with networkSecurityEvents', function (done) {
//     //         CiscomerakiCollector.load().then(function (creds) {
//     //             var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//     //             const startDate = moment();
//     //             const curState = {
//     //                 stream: "networkSecurityEvents",
//     //                 since: startDate.valueOf(),
//     //                 until: startDate.add(collector.pollInterval, 'seconds').valueOf(),
//     //                 nextPage: null,
//     //                 poll_interval_sec: 1
//     //             };
//     //             let nextState = collector._getNextCollectionState(curState);
//     //             assert.equal(nextState.poll_interval_sec, process.env.paws_poll_interval_delay);
//     //             done();
//     //         });
//     //     });

//     // });

//     describe('Format Tests', function () {
//         it('log format success', function (done) {
//             let ctx = {
//                 invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
//                 fail: function (error) {
//                     assert.fail(error);
//                     done();
//                 },
//                 succeed: function () {
//                     done();
//                 }
//             };

//             CiscomerakiCollector.load().then(function (creds) {
//                 var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//                 let fmt = collector.pawsFormatLog(ciscomerakiMock.LOG_EVENT);
//                 assert.equal(fmt.progName, 'CiscomerakiCollector');
//                 assert.ok(fmt.message);
//                 done();
//             });
//         });
//     });

//     // describe('NextCollectionStateWithNextPage', function () {
//     //     let ctx = {
//     //         invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
//     //         fail: function (error) {
//     //             assert.fail(error);
//     //         },
//     //         succeed: function () { }
//     //     };
//     //     it('Get Next Collection State (networkSecurityEvents) With NextPage Success', function (done) {
//     //         const startDate = moment().subtract(5, 'minutes');
//     //         const curState = {
//     //             stream: "networkSecurityEvents",
//     //             since: startDate.valueOf(),
//     //             until: startDate.add(5, 'minutes').valueOf(),
//     //             poll_interval_sec: 1
//     //         };
//     //         const nextPage = "nextPage";
//     //         CiscomerakiCollector.load().then(function (creds) {
//     //             var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//     //             let nextState = collector._getNextCollectionStateWithNextPage(curState, nextPage);
//     //             assert.ok(nextState.nextPage);
//     //             assert.equal(nextState.nextPage, nextPage);
//     //             done();
//     //         });
//     //     });
//     //     it('Get Next Collection State (OfflineEnrollment) With NextPage Success', function (done) {
//     //         const startDate = moment().subtract(5, 'minutes');
//     //         const curState = {
//     //             stream: "OfflineEnrollment",
//     //             since: startDate.unix(),
//     //             poll_interval_sec: 1
//     //         };
//     //         const nextPageTimestamp = "1574157600";
//     //         CiscomerakiCollector.load().then(function (creds) {
//     //             var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
//     //             let nextState = collector._getNextCollectionStateWithNextPage(curState, nextPageTimestamp);
//     //             assert.ok(nextState.since);
//     //             assert.equal(nextState.since, nextPageTimestamp);
//     //             done();
//     //         });
//     //     });
//     // });
// });

