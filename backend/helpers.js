const { createTable, insertData } = require('./services/dbservices');
const { fetchAPIData } = require('./services/cmc')



async function fetchAndSaveData() {   // Fetch from the API and save to the DB
    try {
 
        data = await fetchAPIData();
        
        results = await insertData(data); 
        
        return results.length
        } catch (error){
            console.error('Error Message: retrieveAndSaveData', error);
            // return { error: 'Unable to fetch data' };
        }
}

module.exports =  { fetchAndSaveData }