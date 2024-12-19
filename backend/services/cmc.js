const axios = require('axios');
require('dotenv').config(); 

const environment = process.env.NODE_ENV || 'test';

// Define configurations for test and production
const config = {
    test: {
        url: 'https://sandbox-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest',
        apiKey: process.env.TEST_API_KEY
    },
    prod: {
        url: 'https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest',
        apiKey: process.env.PROD_API_KEY
    }
};

// Use the appropriate configuration
const { url, apiKey } = config[environment];

const parameters = {
    id : '1,1027' // Symbols for Bitcoin and Ethereum
};


async function fetchAPIData() {
    try {
        const response = await axios.get(url, {
            headers: {
                'X-CMC_PRO_API_KEY': apiKey
            },
            params: parameters
        });        
         return response.data;         
        } catch (error){
            console.error('Error Message:', error.headers);
            return { error: 'Unable to fetch data' };
        }
}

module.exports = { fetchAPIData};
