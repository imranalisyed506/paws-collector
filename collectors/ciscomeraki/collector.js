/* -----------------------------------------------------------------------------
 * @copyright (C) 2023, Alert Logic, Inc
 * @doc
 *
 * ciscomeraki class.
 *
 * @end
 * -----------------------------------------------------------------------------
 */
'use strict';

const moment = require('moment');
const PawsCollector = require('@alertlogic/paws-collector').PawsCollector;
const parse = require('@alertlogic/al-collector-js').Parse;
const packageJson = require('./package.json');
const calcNextCollectionInterval = require('@alertlogic/paws-collector').calcNextCollectionInterval;
const utils = require("./utils");
const AlLogger = require('@alertlogic/al-aws-collector-js').Logger;

let typeIdPaths = [];

let tsPaths = [];


class CiscomerakiCollector extends PawsCollector {
    constructor(context, creds) {
        super(context, creds, packageJson.version);
    }
    
   async pawsInitCollectionState(event, callback) {
        const startTs = process.env.paws_collection_start_ts ?
            process.env.paws_collection_start_ts :
            moment().toISOString();
        const endTs = moment(startTs).add(this.pollInterval, 'seconds').toISOString();
        const { clientSecret, apiEndpoint, orgKey } = await this.validateAndPrepare(callback);
        const resourceNames = JSON.parse(process.env.collector_streams);
       try {
           const url = `/api/v1/organizations/${orgKey}/networks`;
           const networks = await utils.getAllNetworks(url, clientSecret, apiEndpoint);
           const initialStates = networks.map(networkId => ({

               stream: resourceNames[0],
               networkId: networkId.id,
               since: startTs,
               until: endTs,
               nextPage: null,
               poll_interval_sec: 1
           }));
           console.log(JSON.stringify(initialStates, null, 2));
           return callback(null, initialStates, 1);
       } catch (error) {
           console.log(error.message);
           return callback(error);
       }
    }
    
    async pawsGetLogs(state, callback) {
        const collector = this;
        const { clientSecret, apiEndpoint, orgKey } = await this.validateAndPrepare(callback);

        const apiDetails = utils.getAPIDetails(state, orgKey);

        if (!apiDetails.url) {
            return callback("The API name was not found!");
        }

        typeIdPaths = apiDetails.typeIdPaths;
        tsPaths = apiDetails.tsPaths;
        // const networks = await utils.getAllNetworks(apiDetails.url, clientSecret, apiEndpoint);
        // networks.forEach(function (network) {
        //     state.networkId = network.id;
            AlLogger.info(`CMRI000001 Collecting data for ${state.stream}-${state.networkId} from ${state.since}`);
            utils.getAPILogs(apiDetails, [], apiEndpoint, state, clientSecret, process.env.paws_max_pages_per_invocation)
                .then(({ accumulator, nextPage }) => {
                    let newState;
                    if (nextPage === undefined) {
                        newState = this._getNextCollectionState(state);
                    } else {
                        newState = this._getNextCollectionStateWithNextPage(state, nextPage);
                    }
                    AlLogger.info(`CMRI000002 Next collection in ${newState.poll_interval_sec} seconds`);
                    return callback(null, accumulator, newState, newState.poll_interval_sec);  
                })
                .catch((error) => {
                    console.log('eeeee',error);
                    console.error(`Error fetching data:`, error);
                    console.error(`Error fetching data:`, error.response.status);
                    console.error(`Error fetching data:`, JSON.stringify(error.response.headers));
                    console.error(`Error fetching data:`, JSON.stringify(error.response.data));
                    console.error(`Error fetching data: retry`, error.response.headers['retry-after'] );
                    if (error.response && error.response.status == 429) {
                        state.poll_interval_sec = 10 + parseInt(error.response.headers['retry-after']);
                        AlLogger.warn(`Throttling error, retrying after ${state.poll_interval_sec}`);
                        collector.reportApiThrottling(function () {
                            return callback(null, [], state, state.poll_interval_sec);
                        });
                    }
                    // set errorCode if not available in error object to showcase client error on DDMetric
                    else if (error.response && error.response.data) {
                        error.response.data.errorCode = error.response.status;
                        return callback(error.response.data);
                    }
                    else {
                        return callback(error);
                    }
                });
        // })
      
    }

    async validateAndPrepare(callback) {
        let collector = this;
        const clientSecret = collector.secret;
        if (!clientSecret) {
            return callback("The Client Secret was not found!");
        }
    
        const apiEndpoint = process.env.paws_endpoint.replace(/^https:\/\/|\/$/g, '');
        const orgKey = process.env.paws_collector_param_string_2;
        if (!orgKey) {
            return callback("orgKey was not found!");
        }
    
        return { clientSecret, apiEndpoint, orgKey };
    }
    

    _getNextCollectionState(curState) {
        const untilMoment = moment(curState.until);
        const { nextUntilMoment, nextSinceMoment, nextPollInterval } = calcNextCollectionInterval('no-cap', untilMoment, this.pollInterval);
        return {
            stream: curState.stream,
            networkId:curState.networkId,
            since: nextSinceMoment.toISOString(),
            until: nextUntilMoment.toISOString(),
            nextPage: null,
            poll_interval_sec: nextPollInterval
        };
    }

    _getNextCollectionStateWithNextPage({ stream, since, until,networkId }, nextPage) {
        const obj = {
            stream,
            networkId,
            since:nextPage,
            until,
            nextPage:null,
            poll_interval_sec: 1
        };
        return obj;
    }
    
    pawsFormatLog(msg) {
        // TODO: double check that this message parsing fits your use case
        let collector = this;

        let ts = parse.getMsgTs(msg, tsPaths);
        let typeId = parse.getMsgTypeId(msg, typeIdPaths);
        
        let formattedMsg = {
            hostname: collector.collector_id,
            messageTs: ts.sec,
            priority: 11,
            progName: 'CiscomerakiCollector',
            message: JSON.stringify(msg),
            messageType: 'json/ciscomeraki',
            application_id: collector.application_id
        };
        
        if (typeId !== null && typeId !== undefined) {
            formattedMsg.messageTypeId = `${typeId}`;
        }
        if (ts.usec) {
            formattedMsg.messageTsUs = ts.usec;
        }
        return formattedMsg;
    }
}

module.exports = {
    CiscomerakiCollector: CiscomerakiCollector
}
