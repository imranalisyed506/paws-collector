const axios = require('axios').create({
    httpsAgent: new require('https').Agent({
        rejectUnauthorized: false
    })
});
const AlLogger = require('@alertlogic/al-aws-collector-js').Logger;

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
    let since;
    return new Promise(async (resolve, reject) => {
        try {
            for (const productType of PRODUCT_TYPES) {
                pageCount = 0;
                since = state.since;
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
            let url = `https://${apiEndpoint}${apiDetails.url}/${state.networkId}/events?productType=${productType}`;
            try {
                let response = await makeApiCall(url, clientSecret, 500, since);
                let data = response && response.data ? response.data.events : [];
                AlLogger.debug(`networkId->', ${url}, ' productType->', ${productType}, ' events:', ${data.length}, 'pageCount', ${pageCount}`);
                if (data.length) {
                    accumulator = accumulator.concat(data);
                }
                headers = response.headers;
                const linkHeader = response.headers.link;
                if (linkHeader && linkHeader.includes('rel=next')) {
                    const nextLink = linkHeader.match(/<([^>]+)>; rel=next/)[1];
                    startingAfter = new URL(nextLink).searchParams.get('startingAfter');
                    since = startingAfter;
                    await getData(productType);
                } else {
                    AlLogger.debug(`CMRI000006 No More Next Page Data Available`);
                    state.until = response.data.pageEndAt;
                }
            } catch (error) {
                throw error; // Rethrow the error to be caught by the outer try-catch
            }
        } else {
            nextPage = since;
        }
    }
}

async function makeApiCall(url, apiKey, perPage, startingAfter = null) {
    let fullUrl = `${url}&perPage=${perPage}`;
    if (startingAfter) {
        fullUrl += `&startingAfter=${startingAfter}`;
    }
    try {
        console.log(fullUrl);
        const response = await axios.get(fullUrl, {
            headers: {
                'X-Cisco-Meraki-API-Key': apiKey,
                'Accept': 'application/json',
            },
        });
        return response;
    } catch (error) {
        throw error;
    }

}

async function getAllNetworks(url, apiKey, apiEndpoint) {
    try {
        let response = await makeApiCall(`https://${apiEndpoint}/${url}?`, apiKey, 1000);
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