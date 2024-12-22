const express = require('express');
const path = require('path');
const { fetchAndSaveData } = require("./backend/helpers")
const { createTable, getAllData, clearDatabase, dropTable, getUcids } = require("./backend/services/dbservices")
const cron = require('node-cron');
// const { create } = require('domain');

const app = express();
createTable()
const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'frontend/views'));

app.use(express.static(path.join(__dirname, 'frontend/public')));

// Schedule a cron job to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    console.log('Fetching and saving data...');
    numresults = await fetchAndSaveData(); 
    await clearDatabase(numresults);

  } catch (error) {
    console.error('Error fetching or saving data:', error);
  }
});


app.get('/', async (req, res) => {
  try {
      res.render('index'); // render the page  
  } catch (error) {
    console.log(error)
    res.status(500).send('Error fetching data from the database');
  }
});

app.get('/filtered', async (req, res) => {
  const ucid = req.query.ucid; // Get UCID from the query parameter 
  // console.log(ucid)  // THIS WORKS
  try {
    const rows = await getAllData(ucid)     
    res.json(rows)    
    

  } catch (error) {
    console.log(error)
    res.status(500).send('Error fetching data from the database');
  }
});

// app.get('/', async (req, res) => {
//   const ucid = req.query.ucid; // Get UCID from the query parameter (if any)
//   // console.log(ucid)  // THIS WORKS
//   try {
//     const rows = await getAllData(ucid)
//     if (ucid) {
//       res.json(rows)    } 
//     else {
//       res.render('index', { data: rows }); // Send the data to the frontend
//     }
//   } catch (error) {
//     console.log(error)
//     res.status(500).send('Error fetching data from the database');
//   }
// });

// app.post('/clearDatabase', async (req, res) => {
//     try {
//       const message = await clearDatabase();
     
//       res.status(200).send({ message }); // Send a proper status code (200 OK)
//       } catch (error) {
//         console.error('Error deleting data:', error);
//         res.status(500).send({ error: error.message || 'An unknown error occurred' });
//       }
// });

app.post('/dropTable', async (req, res) => {
  try {
      await dropTable(); // Call clearDatabase to delete all records
      res.send('table dropped!');
      createTable()
    } catch (error) {
      console.error('Error dropping table:', error);
      res.status(500).send('Error dropping', error);
    }
});

app.get('/get-from-db', async (req, res) => {
  try {
    records = await getAllData()
    // console.log(records.length)
    res.json(records)
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Server error');
  }
});

  app.post('/fetch-save-get', async (req, res) => {
    try {
     // Fetch data from a cmc api and save into db
      num_results = await fetchAndSaveData() // return number of coins to track
      // num_results = 99
      // console.log(num_results)
      // Clear old records from the database
      await clearDatabase(num_results);

      // fetch all records from the database 
      records = await getAllData();    

     res.json(records) // send all db records back to the client as json.

    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Server error');
    }
  });
  

// app.get('/get-ucids', async (req, res) => {
//     try {
//       const rows = await getUcids();
      
//       res.json(rows)
//     }  catch (error) {
//       res.status(500).send('Error fetching ucids from the database');
//     }
//   });

app.listen(port, '0.0.0.0' , () => {
    console.log(`Server running at http://localhost:${port}`);
});