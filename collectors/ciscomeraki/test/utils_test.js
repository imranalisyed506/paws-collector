const sinon = require('sinon');
const assert = require('assert');
const axios = require('axios');
const ciscomerakiMock = require('./ciscomeraki_mock');
const { getAPILogs, makeApiCall, getAllNetworks, getAPIDetails } = require('../utils'); 

describe('API Tests', function() {
    let axiosGetStub;

    beforeEach(function() {
        axiosGetStub = sinon.stub(axios, 'get');
    });

    afterEach(function() {
        axiosGetStub.restore();
    });

    describe('getAPILogs', function() {
        it('should accumulate data from multiple pages', async function() {
            axiosGetStub.onFirstCall().returns(Promise.resolve({
                data: { events: [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT], pageEndAt: '2024-04-15T10:00:00Z' },
                headers: { link: '<https://api.meraki.com/next>; rel=next' }
            }));
            axiosGetStub.onSecondCall().returns(Promise.resolve({
                data: { events: [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT], pageEndAt: '2024-04-15T11:00:00Z' },
                headers: {}
            }));

            const apiDetails = { productTypes: ['appliance', 'switch'] };
            const accumulator = [];
            const apiEndpoint = 'api.meraki.com';
            const state = { since: '2024-04-14T00:00:00Z',stream:'L_686235993220604684' };
            const clientSecret = 'your-secret';
            const maxPagesPerInvocation = 2;

            const result = await getAPILogs(apiDetails, accumulator, apiEndpoint, state, clientSecret, maxPagesPerInvocation);
                
            assert.deepStrictEqual(result.accumulator, [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT]);
            assert.strictEqual(result.nextPage, undefined);
        });
    });

    describe('makeApiCall', function() {
        it('should return response data', async function() {
            let url = 'https://api.meraki.com/network/L_686235993220604684/events';
            const apiKey = 'your-api-key';
            const perPage = 10;
            const startingAfter = null;

            axiosGetStub.returns(Promise.resolve({
                data: { events: [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT] },
                headers: {}
            }));

            const response = await makeApiCall(url, apiKey, perPage, startingAfter);

            assert.deepStrictEqual(response.data.events, [ciscomerakiMock.LOG_EVENT, ciscomerakiMock.LOG_EVENT]);
        });
    });

    describe('getAllNetworks', function() {
        it('should return network data', async function() {
            const url = '/api/v1/networks';
            const apiKey = 'your-api-key';
            const apiEndpoint = 'api.meraki.com';

            axiosGetStub.returns(Promise.resolve({
                data: { networks: ['L_686235993220604684', 'L_686235993220604685'] },
                headers: {}
            }));

            const networks = await getAllNetworks(url, apiKey, apiEndpoint);

            assert.deepStrictEqual(networks.networks, ['L_686235993220604684', 'L_686235993220604685']);
        });
    });

    describe('getAPIDetails', function() {
        it('should return correct API details', function() {
            const orgKey = 'your-org-key';
            const productTypes = ['appliance', 'switch'];

            const apiDetails = getAPIDetails(orgKey, productTypes);

            assert.strictEqual(apiDetails.url, '/api/v1/networks');
            assert.strictEqual(apiDetails.method, 'GET');
            assert.strictEqual(apiDetails.requestBody, '');
            assert.strictEqual(apiDetails.orgKey, orgKey);
            assert.deepStrictEqual(apiDetails.productTypes, productTypes);
        });
    });
});
