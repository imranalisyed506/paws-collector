const axios = require('axios').create({
    httpsAgent: new require('https').Agent({
        rejectUnauthorized: false
    })
});
const AlLogger = require('@alertlogic/al-aws-collector-js').Logger;

async function getAPILogs(apiDetails, accumulator, apiEndpoint, state, clientSecret, maxPagesPerInvocation) {
    let nextPage;
    let pageCount = 0;
    let since;
    return new Promise(async (resolve, reject) => {
        try {
            for (const productType of apiDetails.productTypes) {
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
            let url = `https://${apiEndpoint}${apiDetails.url}/${state.stream}/events?productType=${productType}`;
            try {
                let response = await makeApiCall(url, clientSecret, 500, since);
                let data = response && response.data ? response.data.events : [];
                console.log(`networkId->', ${url}, ' productType->', ${productType}, ' events:', ${data.length}, 'pageCount', ${pageCount}`);
                if (data.length) {
                    accumulator = accumulator.concat(data);
                }else{
                    return accumulator;
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
                AlLogger.debug(`CMRI000009 ${error.message}`);
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

function getAPIDetails(orgKey, productTypes) {
    let url = "/api/v1/networks";
    let method = "GET";
    let requestBody="";
    return {
        url,
        method,
        requestBody,
        orgKey,
        productTypes
    };
}

module.exports = {
    getAPIDetails: getAPIDetails,
    getAPILogs: getAPILogs,
    getAllNetworks: getAllNetworks
};