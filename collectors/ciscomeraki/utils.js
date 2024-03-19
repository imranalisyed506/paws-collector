const axios = require('axios').create({
    httpsAgent: new require('https').Agent()
});
const networkSecurityEvents = 'networkSecurityEvents';
const PRODUCT_TYPES = [
    'appliance',
    'camera',
    'cellularGateway',
    'switch',
    'wireless'
]; // product types

async function getAPILogs(apiDetails, accumulator, apiEndpoint, state, clientSecret, maxPagesPerInvocation) {
    let nextPage;
    
    return new Promise((resolve, reject) => {
        fetchAllEventsForNetworks(apiDetails, clientSecret, state, apiEndpoint).then(events => {
            console.log('All events:', events.length);
            accumulator = [...events];
            resolve({ accumulator, nextPage })
        }).catch(error => {
            console.error('Error:', error);
            reject(error)
        });
    })

}

async function paginatedFetch(url, apiKey, processData, perPage = 100, startingAfter = null) {
    let allData = [];

    do {
        let fullUrl = `${url}&perPage=${perPage}`;
        if (startingAfter) {
            fullUrl += `&startingAfter=${startingAfter}`;
        }

        try {
            const response = await axios.get(fullUrl, {
                headers: {
                    'X-Cisco-Meraki-API-Key': apiKey,
                    'Accept': 'application/json',
                },
            });
            const data = processData(response);
            allData = allData.concat(data);
            // console.log('headers',response.headers.link);
            const linkHeader = response.headers.link;
            if (linkHeader && linkHeader.includes('rel="next"')) {
                const nextLink = linkHeader.match(/<([^>]+)>; rel="next"/)[1];
                startingAfter = new URL(nextLink).searchParams.get('startingAfter');
            } else {
                break; // No more pages
            }
        } catch (error) {
            console.error(`Error fetching data:`, error.message);
            break;
        }
    } while (true);

    return allData;
}

async function getAllNetworkIds(apiDetails, apiKey, state, apiEndpoint) {
    const processNetworks = (response) => response.data.map(network => network.id);
    return paginatedFetch(`https://${apiEndpoint}/api/v1/organizations/${apiDetails.orgKey}/networks?`, apiKey, processNetworks);
}

async function getEventsByNetwork(apiDetails, apiKey, networkId, state, apiEndpoint) {
    const processEvents = (response) => response.data.events;
    let allEvents = [];
    for (const productType of PRODUCT_TYPES) {
        let url = `https://${apiEndpoint}${apiDetails.url}/${networkId}/events?productType=${productType}&`;
        const events = await paginatedFetch(url, apiKey, processEvents, 100, state.since);
        console.log('networkId->',networkId,' productType->',productType, ' events:',events.length);
        allEvents = allEvents.concat(events);
    }
    return allEvents;
}

async function fetchAllEventsForNetworks(apiDetails, apiKey, state, apiEndpoint) {
    const networkIds = await getAllNetworkIds(apiDetails, apiKey, state, apiEndpoint);
    let allEvents = [];

    for (const networkId of networkIds) {
        const events = await getEventsByNetwork(apiDetails, apiKey, networkId, state, apiEndpoint);
        allEvents = allEvents.concat(events);
    }

    return allEvents;
}

function getAPIDetails(state, orgKey) {
    let url = "";
    let method = "GET";
    let requestBody = "";
    let typeIdPaths = [];
    let tsPaths = [];
    switch (state.stream) {
        case networkSecurityEvents:
            url = `/api/v1/organizations/${orgKey}/networks`;
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
    getAPILogs: getAPILogs
};