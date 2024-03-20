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
    let pageCount = 0;
    return new Promise(async (resolve, reject) => {
        try {
            for (const productType of PRODUCT_TYPES) {
                pageCount = 0;
                await getData(productType);
            }
            return resolve({ accumulator, nextPage });
        } catch (error) {
            reject(error);
        }
    });

    async function getData(productType) {
        if (pageCount < maxPagesPerInvocation) {
            pageCount++;
            console.log('pageCount', pageCount, state.networkId);
            let url = `https://${apiEndpoint}${apiDetails.url}/${state.networkId}/events?productType=${productType}&`;
            try {
                let response = await makeApiCall(url, clientSecret, 500, state.since);
                let data = response && response.data ? response.data.events : [];
                console.log('networkId->', url, ' productType->', productType, ' events:', data.length, 'pageCount', pageCount);
                if (data.length) {
                    accumulator = accumulator.concat(data);
                }
                headers = response.headers;
                const linkHeader = response.headers.link;
                if (linkHeader && linkHeader.includes('rel=next')) {
                    const nextLink = linkHeader.match(/<([^>]+)>; rel=next/)[1];
                    startingAfter = new URL(nextLink).searchParams.get('startingAfter');
                    state.since = startingAfter;
                    await getData(productType);
                } else {
                    console.log('No More Pages');
                    state.until = response.data.pageEndAt;
                }
            } catch (error) {
                throw error; // Rethrow the error to be caught by the outer try-catch
            }
        } else {
            nextPage = state.since;
        }
    }
}

async function makeApiCall(url, apiKey, perPage, startingAfter = null) {

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
        return response;
    } catch (error) {
        throw error;
        //  if (error.response && error.response.status === 429) {
        //          const retryAfterSeconds = parseInt(error.response.headers['retry-after'] || '1');
        //          console.log(`Rate limit exceeded. Retrying after ${retryAfterSeconds} seconds.`);
        //          await new Promise(resolve => setTimeout(resolve, retryAfterSeconds * 1000));
        //          return makeApiCall(url, apiKey, processData, perPage, startingAfter);
        //  }

    }

}

async function getAllNetworkIdsAndState(apiDetails, apiKey, state, apiEndpoint) {
    let response =  makeApiCall(`https://${apiEndpoint}/api/v1/organizations/${apiDetails.orgKey}/networks?`, apiKey);
    return response.data.map((network) => { return { "id": network.id } })
}

async function getAllNetworks(url, apiKey, apiEndpoint) {
    // const processNetworks = (response) => response.data.map((network) => { return { "id": network.id } });
    try {
        let response = await makeApiCall(`https://${apiEndpoint}/${url}?`, apiKey, 1000);
        console.log('networks', response.data);
        return response.data;
    } catch (error) {
        throw error;
    }
   
}


function getAPIDetails(state, orgKey) {
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
    getAllNetworks: getAllNetworks
};