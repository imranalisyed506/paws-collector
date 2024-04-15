const sinon = require('sinon');
const assert = require('assert');

const ciscomerakiMock = require('./ciscomeraki_mock');
var CiscomerakiCollector = require('../collector').CiscomerakiCollector;
const m_response = require('cfn-response');
const moment = require('moment');
const utils = require("../utils");

const { CloudWatch } = require("@aws-sdk/client-cloudwatch"),
    { KMS } = require("@aws-sdk/client-kms"),
    { SSM } = require("@aws-sdk/client-ssm");

var responseStub = {};
let getAPIDetails;
let getAPILogs;
let getAllNetworks;

describe('Unit Tests', function () {
    beforeEach(function () {
        sinon.stub(SSM.prototype, 'getParameter').callsFake(function (params, callback) {
            const data = Buffer.from('test-secret');
            return callback(null, { Parameter: { Value: data.toString('base64') } });
        });
        sinon.stub(KMS.prototype, 'decrypt').callsFake(function (params, callback) {
            const data = {
                Plaintext: Buffer.from('{}')
            };
            return callback(null, data);
        });

        responseStub = sinon.stub(m_response, 'send').callsFake(
            function fakeFn(event, mockContext, responseStatus, responseData, physicalResourceId) {
                mockContext.succeed();
            });
    });

    afterEach(function () {
        responseStub.restore();
        KMS.prototype.decrypt.restore();
        SSM.prototype.getParameter.restore();
    });


    describe('Paws Init Collection State', function () {
        let ctx = {
            invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
            fail: function (error) {
                assert.fail(error);
            },
            succeed: function () { }
        };
        it('Paws Init Collection State Success', function (done) {
            getAllNetworks = sinon.stub(utils, 'getAllNetworks').callsFake(
                function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
                    return new Promise(function (resolve, reject) {
                        return resolve(ciscomerakiMock.NETWORKS);
                    });
                });
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                const startDate = moment().subtract(1, 'days').toISOString();
                process.env.paws_collection_start_ts = startDate;

                collector.pawsInitCollectionState(null, (err, initialStates, nextPoll) => {
                    initialStates.forEach((state) => {
                        if (state.networkId === "L_686235993220604684") {
                            assert.equal(state.networkId, "L_686235993220604684");
                        } else if (state.networkId === "L_686235993220604720") {
                            assert.equal(state.networkId, "L_686235993220604720");
                        }
                        else {
                            assert.equal(state.poll_interval_sec, 1);
                            assert.ok(state.since);
                        }
                    });
                });
            });
            getAllNetworks.restore();
            done();
        });
    });

    describe('Paws Get Register Parameters', function () {
        it('Paws Get Register Parameters Success', function (done) {
            let ctx = {
                invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
                fail: function (error) {
                    assert.fail(error);
                    done();
                },
                succeed: function () {
                    done();
                }
            };

            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                const sampleEvent = { ResourceProperties: { StackName: 'a-stack-name' } };
                collector.pawsGetRegisterParameters(sampleEvent, (err, regValues) => {
                    const expectedRegValues = {
                        ciscoMerakiObjectNames: '[\"L_686235993220604684\"]',
                    };
                    assert.deepEqual(regValues, expectedRegValues);
                    done();
                });
            });
        });
    });

    describe('pawsGetLogs', function () {
        let ctx = {
            invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
            fail: function (error) {
                assert.fail(error);
            },
            succeed: function () { }
        };
        it('Paws Get Logs Success', function (done) {
            getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
                function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
                    return new Promise(function (resolve, reject) {
                        return resolve({ accumulator: [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT] });
                    });
                });
            getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
                function fakeFn(state) {
                    return {
                        url: "api_url",
                        method: "GET",
                        requestBody:"",
                        orgKey:"1234",
                        productTypes:["appliance"]

                    };
                });
            getAllNetworks = sinon.stub(utils, 'getAllNetworks').callsFake(
                function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
                    return new Promise(function (resolve, reject) {
                        return resolve(ciscomerakiMock.NETWORKS);
                    });
                });
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                const curState = {
                    stream: "L_686235993220604684",
                    since: "2024-03-19T05:10:47.055027Z",
                    until: null,
                    nextPage: null,
                    poll_interval_sec: 1
                };
                collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
                    assert.equal(logs.length, 2);
                    assert.equal(newState.poll_interval_sec, 300);
                    assert.ok(logs[0].type);
                    getAPILogs.restore();
                    getAllNetworks.restore();
                    getAPIDetails.restore();
                });
                done();

            });
        });

        it('Paws Get Logs With NextPage Success', function (done) {
            getAllNetworks = sinon.stub(utils, 'getAllNetworks').callsFake(
                function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
                    return new Promise(function (resolve, reject) {
                        return resolve(ciscomerakiMock.NETWORKS);
                    });
                });
            getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
                function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
                    return new Promise(function (resolve, reject) {
                        return resolve({ accumulator: [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT], nextPage: "nextPage" });
                    });
                });
            getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
                function fakeFn(state) {
                    return {
                        url: "api_url",
                        method: "GET",
                        requestBody: "",
                        orgKey: "1234",
                        productTypes: ["appliance"]

                    };
                });
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                const startDate = "2024-03-21T08:00:21.754Z";
                const curState = {
                    stream: "L_686235993220604684",
                    since: startDate.valueOf(),
                    nextPage: null,
                    poll_interval_sec: 1
                };
                collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
                    assert.equal(logs.length, 2);
                    assert.equal(newState.poll_interval_sec, 1);
                    assert.equal(newState.nextPage, null);
                    assert.equal(newState.since, 'nextPage');
                    assert.ok(logs[0].type);
                    getAPILogs.restore();
                    getAPIDetails.restore();
                    getAllNetworks.restore();

                    done();
                });

            });
        });

        it('Paws Get client error', function (done) {
           
            getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
                function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
                    return new Promise(function (resolve, reject) {
                        return reject({
                            code: 401,
                            message: 'Invalid API key',
                            response:{
                                data:{errors:['Invalid API key']},
                                status: 401
                            }
                        });
                    });
                });
            getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
                function fakeFn(state) {
                    return {
                        url: "api_url",
                        method: "GET",
                        requestBody: "",
                        orgKey: "1234",
                        productTypes: ["appliance"]

                    };
                });
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                const startDate = moment();
                const curState = {
                    stream: "L_686235993220604684",
                    since: startDate.valueOf(),
                    nextPage: null,
                    poll_interval_sec: 1
                };
                collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
                    assert.equal(err.errorCode, 401);
                    getAPILogs.restore();
                    getAPIDetails.restore();
                    done();
                });

            });
        });

        it('Paws Get Logs check throttling error', function (done) {

            getAPILogs = sinon.stub(utils, 'getAPILogs').callsFake(
                function fakeFn(client, objectDetails, state, accumulator, maxPagesPerInvocation) {
                    return new Promise(function (resolve, reject) {
                        return reject({ code: 429,
                            message: 'Too Many Requests',
                            response:{
                                data:{errors:['Too Many Requests']},
                                headers:{'retry-after':360},
                                status: 429
                            },
                            stat: 'FAIL' ,"errorCode":429});
                    });
                });
            getAPIDetails = sinon.stub(utils, 'getAPIDetails').callsFake(
                function fakeFn(state) {
                    return {
                        url: "api_url",
                        method: "GET",
                        requestBody: "",
                        orgKey: "1234",
                        productTypes: ["appliance"]

                    };
                });
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                const startDate = moment();
                const curState = {
                    stream: "L_686235993220604684",
                    since: startDate.valueOf(),
                    nextPage: null,
                    poll_interval_sec: 1
                };

                var reportSpy = sinon.spy(collector, 'reportApiThrottling');
                let putMetricDataStub = sinon.stub(CloudWatch.prototype, 'putMetricData').callsFake((params, callback) => callback());
                collector.pawsGetLogs(curState, (err, logs, newState, newPollInterval) => {
                    assert.equal(true, reportSpy.calledOnce);
                    assert.equal(logs.length, 0);
                    assert.notEqual(newState.poll_interval_sec, 1);
                    getAPILogs.restore();
                    getAPIDetails.restore();
                    putMetricDataStub.restore();
                    done();
                });

            });
        });
    });

    describe('Next state tests', function () {
        let ctx = {
            invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
            fail: function (error) {
                assert.fail(error);
            },
            succeed: function () { }
        };

        it('Next state tests success with L_686235993220604684', function (done) {
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                const startDate = moment();
                const curState = {
                    stream: "L_686235993220604684",
                    since: startDate.valueOf(),
                    until: startDate.add(collector.pollInterval, 'seconds').valueOf(),
                    nextPage: null,
                    poll_interval_sec: 1
                };
                let nextState = collector._getNextCollectionState(curState);
                assert.equal(nextState.poll_interval_sec, process.env.paws_poll_interval_delay);
                done();
            });
        });

    });

    describe('Format Tests', function () {
        it('log format success', function (done) {
            let ctx = {
                invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
                fail: function (error) {
                    assert.fail(error);
                    done();
                },
                succeed: function () {
                    done();
                }
            };

            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                let fmt = collector.pawsFormatLog(ciscomerakiMock.LOG_EVENT);
                assert.equal(fmt.progName, 'CiscomerakiCollector');
                assert.ok(fmt.message);
                done();
            });
        });
    });

    describe('NextCollectionStateWithNextPage', function () {
        let ctx = {
            invokedFunctionArn: ciscomerakiMock.FUNCTION_ARN,
            fail: function (error) {
                assert.fail(error);
            },
            succeed: function () { }
        };
        it('Get Next Collection State (L_686235993220604684) With NextPage Success', function (done) {
            const startDate = moment();
            const curState = {
                stream: "L_686235993220604684",
                since: startDate.valueOf(),
                poll_interval_sec: 1
            };
            const nextPage = "nextPage";
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                let nextState = collector._getNextCollectionStateWithNextPage(curState, nextPage);
                assert.ok(nextState.since);
                assert.equal(nextState.since, nextPage);
                done();
            });
        });
        it('Get Next Collection State (L_686235993220604684) With NextPage Success', function (done) {
            const startDate = moment();
            const curState = {
                stream: "L_686235993220604684",
                since: startDate.unix(),
                poll_interval_sec: 1
            };
            const nextPageTimestamp = "1574157600";
            CiscomerakiCollector.load().then(function (creds) {
                var collector = new CiscomerakiCollector(ctx, creds, 'ciscomeraki');
                let nextState = collector._getNextCollectionStateWithNextPage(curState, nextPageTimestamp);
                assert.ok(nextState.since);
                assert.equal(nextState.since, nextPageTimestamp);
                done();
            });
        });
    });
});

