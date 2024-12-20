
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

  const insertData = (dataList) => {
    return new Promise(async (resolve, reject) => {
      try {
        if (!dataList || !dataList.status || !dataList.data) {
          return reject("Invalid dataList structure");
        }
  
        const timestamp = dataList.status.timestamp;
        const promises = [];
  
        for (const key of Object.keys(dataList.data)) {
          const item = dataList.data[key];
          const UCID = item.id;
          const name = item.name;
          const price = item.quote.USD.price;
          const percent_change_1h = item.quote.USD.percent_change_1h;
          const percent_change_24h = item.quote.USD.percent_change_24h;
  
          // console.log("Processing:", UCID);
  
          const insertPromise = (async () => {
            try {
              const percent_change_15m = await calculatePriceChange(UCID, price, 0);
              const percent_change_30m = await calculatePriceChange(UCID, price, 1);
  
              const query = `
                INSERT INTO data (status_timestamp, UCID, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `;
  
              return new Promise((innerResolve, innerReject) => {
                db.run(query, [timestamp, UCID, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h], function (err) {
                  if (err) {
                    return innerReject(`DB Error: ${err.message}`);
                  }
                  innerResolve(this.lastID);
                });
              });
            } catch (calcError) {
              console.error(`Calculation Error for ${UCID}:`, calcError);
              throw calcError;
            }
          })();
  
          promises.push(insertPromise);
        }
  
        const results = await Promise.all(promises);
        // console.log("All data inserted successfully:", results);
        resolve(results);
      } catch (error) {
        console.error("Error in insertData:", error);
        reject(error);
      }
    });
  };
  


const calculatePriceChange = async (UCID, current_price, backticks = 0) => {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT id, name, price, status_timestamp 
      FROM data
      WHERE UCID = ?
      ORDER BY status_timestamp DESC
      LIMIT 1 OFFSET ?;
    `;

    db.get(query, [UCID, backticks], (err, row) => {
      let percAlert = 3;
      let interval = "15m"
      if (backticks == 1) {
        interval = "30m"
        percAlert = 4;
      }
      // console.log("perc alert is " , percAlert)
      if (err) {
        reject('Error fetching data from the database');
      } else if (row) {
        // Calculate the percentage change
        const priceChange = ((current_price - row.price) / row.price) * 100;
        
        if (Math.abs(priceChange) > percAlert) {
          const message = `Coin: ${row.name}\n` +
                          `Current Price: ${current_price}\n` +
                          `Change: ${priceChange.toFixed(2)}%` +
                          `Interval: ${interval}%`;
          sendTelegramMessage(message);
          resolve(priceChange);
        } else {
          // Handle cases where the price change is <= 1%
          // console.log(`Price change for ${UCID} is within acceptable limits.`);
          resolve(priceChange); // Still resolve with the calculated value
        }
      } else {
        console.log("No earlier data found for UCID:", UCID);
        resolve(0); // No row found, resolve with 0
      }
    });
  });
};


const getUcids = () => {
  console.log("retrieve ucids")
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
      WHERE rowid NOT IN (
        SELECT rowid
        FROM (
          SELECT rowid, id,
                 ROW_NUMBER() OVER (PARTITION BY id ORDER BY status_timestamp DESC) AS row_num
          FROM data
        )
        WHERE row_num <= 3
      )
    `;

    db.run(query, (err) => {
      if (err) {
        console.log(err);
        reject('Error clearing the database');
      } else {
        resolve('Database cleared successfully');
      }
    });
  });
};

// const clearDatabase = () => {
//   return new Promise((resolve, reject) => {
//     const query = `
//     DELETE FROM data
//     WHERE id NOT IN (
//       SELECT id FROM data
//       WHERE name in ("Bitcoin", "Ethereum")
//       ORDER BY status_timestamp DESC
//       LIMIT 10
//     )
//   `;

//     db.run(query, (err) => {
//       if (err) {
//         console.log(err)
//         reject('Error clearing the database');
//       } else {
//         resolve('Database cleared successfully');
//       }
//     });
//   });
// };

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