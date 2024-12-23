function CalculatePercChange(current_price, previous_price) {
    return ((current_price - previous_price) / previous_price) * 100;
}

// async function fetchAndSaveData() {   // Fetch from the API and save to the DB
//     try {
 
//         data = await fetchAPIData();        
//         results = await insertData(data); 
        
//         return results.length
//         } catch (error){
//             console.error('Error Message: retrieveAndSaveData', error);
//             // return { error: 'Unable to fetch data' };
//         }
// }

module.exports =  { CalculatePercChange }