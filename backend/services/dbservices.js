
const sqlite3 = require('sqlite3');
const { sendTelegramMessage } = require('./telegram');

// Open SQLite database (it will create the file if it doesn't exist)
const db = new sqlite3.Database('./mydb.sqlite3', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Create a table in SQLite if it doesn't exist
const createTable = () => {
  db.run(`
    CREATE TABLE IF NOT EXISTS data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status_timestamp TEXT,
      UCID INTEGER, 
      name TEXT,
      price REAL,
      percent_change_15m REAL,
      percent_change_30m REAL,
      percent_change_1h REAL,
      percent_change_24h REAL
    )
  `);
};

// Retrieve all data from the database
const getAllData = (ucid = null) => {
    return new Promise((resolve, reject) => {
      createTable()
      let query = 'SELECT * FROM data ORDER BY id DESC'
      if (ucid) {      
        query = 'SELECT * FROM data WHERE UCID = ? ORDER BY id DESC'; // Filter by UCID if provided
      }

      db.all(query, ucid ? [ucid] : [], (err, rows) => {
        if (err) {
            console.log(err)
          reject('getAllData, Error fetching data from database!', err);
        } else {
          resolve(rows);
        }
      });
    });
  };


// Insert data into the SQLite database
const insertData = (dataList) => { 

 

  return new Promise(async (resolve, reject) => {
    try {
      // Prepare an array to store all insert promises
      const promises = [];
      
      // Loop over each item in the dataList
      // Object.keys(dataList.data).forEach(key => { old method doesnt work with async
      for (const key of Object.keys(dataList.data)) {

        const timestamp = dataList.status.timestamp;
        const UCID = dataList.data[key].id;
        const name = dataList.data[key].name;
        const price = dataList.data[key].quote.USD.price;                 
        
        const percent_change_15m = await calculatePriceChange(UCID, price, backticks=0) 
        const percent_change_30m = await calculatePriceChange(UCID, price, backticks=1)         
        const percent_change_1h = dataList.data[key].quote.USD.percent_change_1h;
        const percent_change_24h = dataList.data[key].quote.USD.percent_change_24h;
        
        
        const query = `
          INSERT INTO data (status_timestamp, UCID, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        // Push the database insert promise to the array
        const insertPromise = new Promise((innerResolve, innerReject) => {
          db.run(query, [timestamp, UCID, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h], function (err) {
            if (err) {
              innerReject(`Error saving data to the database: ${err.message}`);
            } else {
              innerResolve(this.lastID); // Save the ID of the inserted record
            }
          });
        });

        promises.push(insertPromise);
      };

      // Wait for all insert operations to complete
      const results = await Promise.all(promises);

      resolve(results); // Resolve with all inserted record IDs
    } catch (error) {
      reject(`Error processing data: ${error}`);
    }
  });
};

const calculatePriceChange = async (UCID, current_price, backticks=0) => {    // Add Crypto or ID to the query 
    return new Promise(async (resolve, reject) => {
        const query = `
        SELECT id, name, price, status_timestamp 
        FROM data
        WHERE UCID = ?
        ORDER BY status_timestamp DESC
        LIMIT 1 OFFSET ?;
      `;
  
      db.get(query, [UCID, backticks], async (err, row) => {
      
        if (err) {
          reject('Error fetching data from the database');
        } else {
          if (row) {  
            // Calculate the percentage change
            const priceChange = ((current_price - row.price) / row.price) * 100;            
            if (Math.abs(priceChange) > 100) {
              const message = `Alert: Price change exceeded 4%!\n` +
                              `Timestamp: ${row.status_timestamp}\n` +
                              `Coin: ${row.name}\n` +                            
                              `current Price: ${current_price}\n` +
                              `Change: ${priceChange.toFixed(2)}%`;
              await sendTelegramMessage(message);
            
            }
            resolve(priceChange);
          } else {
            console.log("No EARLIER data found ")
            resolve(0); // If no data for 30 minutes ago, return 0 (or handle as needed)
          }
        }
      });
    });
  };


const getUcids = () => {
  return new Promise((resolve, reject) => {
    const query = `SELECT DISTINCT name, ucid
                    FROM data;`; // Adjust based on your actual table structure
  
    db.all(query, (err, rows) => {
      if (err) {
        reject('Error fetching Ucids');
      }
            // Send the UCIDs to the front-end
      resolve(rows);
    });
  });

};


const clearDatabase = () => {
  return new Promise((resolve, reject) => {
    const query = `
    DELETE FROM data
    WHERE id NOT IN (
      SELECT id FROM data
      WHERE name in ("Bitcoin", "Ethereum")
      ORDER BY status_timestamp DESC
      LIMIT 10
    )
  `;

    db.run(query, (err) => {
      if (err) {
        console.log(err)
        reject('Error clearing the database');
      } else {
        resolve('Database cleared successfully');
      }
    });
  });
};

const dropTable = () => {
  return new Promise((resolve, reject) => {
    const query = `DROP TABLE IF EXISTS data`;
    db.run(query, (err) => {
      if (err) {
        reject(`Error dropping table data: ${err.message}`);
      } else {
        resolve(`Table data dropped successfully.`);
      }
    });
  });
};
module.exports = { createTable, insertData, getAllData, clearDatabase, dropTable, getUcids };