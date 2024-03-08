const RestServiceClient = require('@alertlogic/al-collector-js').RestServiceClient;

const networkSecurityEvents = 'networkSecurityEvents';
const orgApplianceSecurityEvents = 'orgApplianceSecurityEvents';
const PRODUCT_TYPES = [
    'appliance',
    'camera',
    'cellularGateway',
    'switch',
    'wireless'
]; // product types
function getAPILogs(apiDetails, accumulator, apiEndpoint, state, clientSecret, maxPagesPerInvocation) {
    let nextPage;
    let restServiceClient = new RestServiceClient(apiEndpoint);

    return new Promise(function (resolve, reject) {
        // Fetch all networks in the organization
        console.log('apiDetails',apiDetails);

        getAllNetworksInOrganization(state, apiDetails.orgKey, clientSecret, apiEndpoint)
            .then(networks => {
                const promises = [];
                networks.forEach(network => {
                    PRODUCT_TYPES.forEach(productType => {
                        let URL = `${apiDetails.url}/${network.id}/events?productType=${productType}`;
                        promises.push(makeAPICall(URL, apiDetails, clientSecret, restServiceClient, state, maxPagesPerInvocation));
                    });
                });

                Promise.all(promises)
                    .then(networkLogsArray => {
                        networkLogsArray.forEach(networkLogs => {
                            accumulator.push(...networkLogs);
                        });
                        resolve({ accumulator, nextPage });
                    })
                    .catch(error => reject(error));
            })
            .catch(error => reject(error));
    });
}

function makeAPICall(URL, apiDetails, clientSecret, restServiceClient, state, maxPagesPerInvocation) {
    return new Promise(function (resolve, reject) {
        // Make API call based on GET or POST method
        if (apiDetails.method === "GET") {
            restServiceClient.get(URL, {
                headers: {
                    'X-Cisco-Meraki-API-Key': `${clientSecret}`,
                    'Content-Type': 'application/json'
                }
            }).then(response => {
                if (state.stream === networkSecurityEvents) {
                    if (response.events && response.events.length === 0) {
                        resolve([]);
                    } else {
                        resolve(response.events);
                    }
                } else {
                    if (response && response.length === 0) {
                        resolve([]);
                    } else {
                        resolve(response);
                    }
                }
            }).catch(error => reject(error));
        } 
    });
}

function getAllNetworksInOrganization(state,orgKey, clientSecret, apiEndpoint) {
    let restServiceClient = new RestServiceClient(apiEndpoint);
    let apiUrl = `/api/v1/organizations/${orgKey}/networks`;
    return new Promise(function(resolve, reject) {
        restServiceClient.get(apiUrl, {
            headers: {
                'X-Cisco-Meraki-API-Key': `${clientSecret}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        }).then(response => {
            resolve(response);
        }).catch(err => {
            reject(err);
        });
    });
}


function getAPIDetails(state, orgKey,clientSecret,query='') {
    let url = "";
    let method = "GET";
    let requestBody = "";
    let typeIdPaths = [];
    let tsPaths = [];
    switch (state.stream) {
        case networkSecurityEvents:
            url = `/api/v1/networks`;
            typeIdPaths = [{ path: ["type"] }];
            tsPaths = [{ path: ["occurredAt"] }];            
            break;
        case orgApplianceSecurityEvents:
            url = `/api/v1/organizations/${orgKey}/appliance/security/events`;
            typeIdPaths = [{ path: ["eventType"] }];
            tsPaths = [{ path: ["ts"] }];
            break;
        default:
            url = null;
    }
    return {
        url,
        method,
        requestBody,
        orgKey,
        typeIdPaths,
        tsPaths
    };
}

module.exports = {
    getAPIDetails: getAPIDetails,
    getAPILogs: getAPILogs,
    getAllNetworksInOrganization:getAllNetworksInOrganization
};
