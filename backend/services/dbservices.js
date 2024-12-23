
const sqlite3 = require('sqlite3');
const { sendTelegramMessage } = require('./telegram');
const { CalculatePercChange } = require('../helpers');

// Open SQLite database (it will create the file if it doesn't exist)
const db = new sqlite3.Database('./backend/database/mydb.sqlite3', (err) => {
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
      symbol TEXT,
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


  const insertData = async (dataList) => {
    return new Promise(async (resolve, reject) => {
      try {
        const timestamp = dataList.status.timestamp;
        const promises = [];
  
        for (const key of Object.keys(dataList.data)) {
          const item = dataList.data[key];
          const UCID = item.id;
          const symbol = item.symbol;
          const name = item.name;
          const price = item.quote.USD.price;
          const percent_change_1h = item.quote.USD.percent_change_1h;
          const percent_change_24h = item.quote.USD.percent_change_24h;  
       
  
          // Fetch percent_change_15m and percent_change_30m
          const percent_change_15m = await getPercentChange(price, UCID, 2);
          const percent_change_30m = await getPercentChange(price, UCID, 5);
          
          // Create and push the insertion promise
          promises.push(
            new Promise((innerResolve, innerReject) => {
              const query = `
                INSERT INTO data (status_timestamp, UCID, symbol, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;
  
              db.run(
                query,
                [timestamp, UCID, symbol, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h ],
                function (err) {
                  if (err) {
                    return innerReject(`DB Error: ${err.message}`);
                  }
                  innerResolve(this.lastID);
                }
              );
            })
          );
        }
  
        const results = await Promise.all(promises);
       console.log("results inserted in DB successfully")
        resolve(results);
      } catch (error) {
        console.error("Error in insertData:", error);
        reject(error);
      }
    });
  };
  

  
  const getLastRow = async (UCID, interval) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT price, 
        CASE 
          WHEN ? = '15m' THEN percent_change_15m
          WHEN ? = '30m' THEN percent_change_30m
          ELSE NULL -- If interval is neither '15m' nor '30m', return NULL or a default value
        END AS selected_percent_change
        FROM data  
        WHERE UCID = ?      
        ORDER BY status_timestamp DESC
        LIMIT 1;
      `;
  
      db.get(query, [interval,interval, UCID], (err, row) => {
        if (err) {
          return reject(`Error fetching previous interval change: ${err.message}`);
        }
          
          resolve(row); 

      });
    });

  }
  const getPercentChange = async (current_price, UCID, backticks) => {
 
    const percAlert = backticks === 5 ? 3: 2           
    const interval = backticks === 5 ? "30m" : "15m"   
    const last_row = await getLastRow(UCID, interval)
    
    const last_price = last_row ? last_row.price : 0 
    const last_perc = last_row ? last_row.selected_percent_change : 0
    const last_candle_change = last_row ? CalculatePercChange(current_price, last_price) : 0
    const bigChange = Math.abs(last_candle_change) > 1.4 ? true : false
   

    
    return new Promise((resolve, reject) => {
      const query = `
        SELECT name, symbol, price, percent_change_15m, percent_change_30m 
        FROM data  
        WHERE UCID = ?      
        ORDER BY status_timestamp DESC
        LIMIT 1 OFFSET ?;
      `;
  
      db.get(query, [UCID, backticks], (err, prev_row) => {
        if (err) {
          return reject(`Error fetching percent change: ${err.message}`);
        }
        if(prev_row){
          const prevPercChange = CalculatePercChange(current_price, prev_row.price);
  
          // const previous_percent_change = interval === "30m" ? prev_row.percent_change_30m : prev_row.percent_change_15m 
          if (interval == "15m") {
            if((Math.abs(prevPercChange) > percAlert && Math.abs(last_perc) > percAlert) || bigChange) {
              const message = `Coin: ${prev_row.name} - ${prev_row.symbol}\n` +
              `Current Price: ${current_price}\n` + 
              `Last Candle price: ${last_price}  - ${bigChange}\n` +
              `pricechange with last candle: ${last_candle_change}\n` +
              `Change: ${prevPercChange.toFixed(2)}%\n` + 
              `previous: ${last_perc.toFixed(2)}%`
              
              console.log(message)
              console.log("----------------------")
              sendTelegramMessage(message);
            }
          }

          resolve(prevPercChange); // Default to 0 if no data found

        } else {
          resolve(0)
        }
      });
    });
  };



// const getUcids = () => {
//   console.log("retrieve ucids")
//   return new Promise((resolve, reject) => {
//     const query = `SELECT DISTINCT name, ucid
//                     FROM data;`; // Adjust based on your actual table structure
  
//     db.all(query, (err, rows) => {
//       if (err) {
//         reject('Error fetching Ucids');
//       }
//             // Send the UCIDs to the front-end
//       resolve(rows);
//     });
//   });

// };

const clearDatabase = (num_of_coins) => {
  const records_to_keep = num_of_coins * 7;
  
  return new Promise((resolve, reject) => {
    const query = `
    DELETE FROM data
    WHERE id NOT IN (
      SELECT id FROM data     
      ORDER BY status_timestamp DESC
      LIMIT ?
    )
  `;

    db.run(query, [records_to_keep], (err) => {
      if (err) {
        console.log(err);
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
module.exports = { createTable, insertData, getAllData, clearDatabase, dropTable };
