const express = require('express');
const path = require('path');
const { fetchAndSaveData } = require("./backend/helpers")
const { createTable, getAllData, clearDatabase, dropTable, getUcids } = require("./backend/services/dbservices")

const app = express();

const port = 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'frontend/views'));

app.use(express.static(path.join(__dirname, 'frontend/public')));


app.get('/', async (req, res) => {
    const ucid = req.query.ucid; // Get UCID from the query parameter (if any) 
    try {
      const rows = await getAllData(ucid)
      if (ucid) {
        res.json(rows)
      } else {
      res.render('index', { data: rows }); // Send the data to the frontend
      }
    } catch (error) {
      console.log(error)
      res.status(500).send('Error fetching data from the database');
    }
  });


app.get('/get-data', async (req, res) => {
   
    createTable()
    const ucid = req.query.ucid; // Get UCID from the query parameter (if any)
    
    try {
      const rows = await getAllData(ucid)
    //   console.log(rows)
    
      res.json(rows)
   
    } catch (error) {
      console.log(error)
      res.status(500).send('Error fetching data from the database');
    }
  });

  app.post('/clearDatabase', async (req, res) => {
    try {
      const message = await clearDatabase();
      res.status(200).send({ message }); // Send a proper status code (200 OK)
      } catch (error) {
        console.error('Error deleting data:', error);
        res.status(500).send({ error: error.message || 'An unknown error occurred' });
      }
});


app.post('/fetchDataAndSave', async (req, res) => {
try {
    
    const rows = await fetchAndSaveData();
    // const rows = await getAllData()
    res.json(rows)
    // res.status(200).send('Data fetched and saved successfully');
    
} catch (error) {
    console.error('Error fetching and saving data:', error);
    res.status(500).send('Error fetching and saving data');
}
});

app.post('/dropTable', async (req, res) => {
    try {
        await dropTable(); // Call clearDatabase to delete all records
        res.send('table dropped!');
      } catch (error) {
        console.error('Error dropping table:', error);
        res.status(500).send('Error dropping', error);
      }
});

app.get('/get-ucids', async (req, res) => {
    try {
      const rows = await getUcids();
      
      res.json(rows)
    }  catch (error) {
      res.status(500).send('Error fetching ucids from the database');
    }
  });

app.listen(port, '0.0.0.0' , () => {
    console.log('Server running at http://0.0.0.0:3000');
});