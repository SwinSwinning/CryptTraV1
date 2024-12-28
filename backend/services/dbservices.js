
const sqlite3 = require('sqlite3');
const { CalculatePercChange, sendNotification } = require('../helpers');

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

  const getLastSixCandles = (ucid ) => {
    return new Promise((resolve, reject) => {
      createTable()    
        query = 'SELECT * FROM data WHERE UCID = ? ORDER BY id DESC LIMIT 6'; // Filter by UCID if provided


      db.all(query, ucid ? [ucid] : [], (err, rows) => {
        if (err) {
            console.log(err)
          reject('getLast6candles, Error fetching data from database!', err);
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
          
          const price = item.quote['825'].price;
          const percent_change_1h = item.quote['825'].percent_change_1h;
          const percent_change_24h = item.quote['825'].percent_change_24h;  
      
          // Fetch percent_change_15m and percent_change_30m 
          const last_perc_changes = await getPercentChange(price, UCID);

          const percent_change_15m = last_perc_changes.last_15m_change
          const percent_change_30m = last_perc_changes.last_30m_change
          
          const bigChange = Math.abs(last_perc_changes.last_candle_change) + Math.abs(last_perc_changes.second_last_candle_change) > 2.5  ? true : false
          if(UCID===1){
            console.log(name, last_perc_changes.last_candle_change, "+",  last_perc_changes.second_last_candle_change, "=", last_perc_changes.last_candle_change+ last_perc_changes.second_last_candle_change)
          }
          if (bigChange){            
            sendNotification(price, symbol, name, last_perc_changes.last_candle_change, last_perc_changes.second_last_candle_change, percent_change_15m, percent_change_30m)
          }

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
  

  const getPercentChange = async (current_price, UCID) => {
    const last_rows = await getLastSixCandles(UCID)    
   
   
    const last_price = last_rows[0] ? last_rows[0].price : 0   // check and save last candle price
    const scndLast_price = last_rows[1] ? last_rows[1].price : 0   // check and save 2nd to last candle price
    const last_15m_price = last_rows[2] ? last_rows[2].price : 0
    const last_30m_price = last_rows[5] ? last_rows[5].price : 0

    const last_candle_change = last_rows[0] ? CalculatePercChange(current_price, last_price) : 0
    const second_last_candle_change =  last_rows[1] ? CalculatePercChange(last_price, scndLast_price) : 0
    const last_15m_change = last_rows[2] ? CalculatePercChange(current_price, last_15m_price) : 0
    const last_30m_change = last_rows[5] ? CalculatePercChange(current_price, last_30m_price) : 0

    const result = {
      "last_candle_change" : last_candle_change,
      "last_15m_change": last_15m_change,
      "second_last_candle_change": second_last_candle_change,
      "last_30m_change": last_30m_change
    }   

    return result
    

  };

  // const getLastRow = async (UCID, interval) => {
  //   return new Promise((resolve, reject) => {
  //     const query = `
  //       SELECT price, 
  //       CASE 
  //         WHEN ? = '15m' THEN percent_change_15m
  //         WHEN ? = '30m' THEN percent_change_30m
  //         ELSE NULL -- If interval is neither '15m' nor '30m', return NULL or a default value
  //       END AS selected_percent_change
  //       FROM data  
  //       WHERE UCID = ?      
  //       ORDER BY status_timestamp DESC
  //       LIMIT 1;
  //     `;
  
  //     db.get(query, [interval,interval, UCID], (err, row) => {
  //       if (err) {
  //         return reject(`Error fetching previous interval change: ${err.message}`);
  //       }
         
  //         resolve(row); 

  //     });
  //   });

  // }


  // const getPercentChange = async (current_price, UCID, backticks) => {
 
  //   const percAlert = backticks === 5 ? 3: 2           
  //   const interval = backticks === 5 ? "30m" : "15m"   
  //   const last_row = await getLastRow(UCID, interval)
    
  //   console.log("last rows : ", last_row)
  //   const last_price = last_row ? last_rows.price : 0 
  //   const last_perc = last_row ? last_row.selected_percent_change : 0
  //   const last_candle_change = last_row ? CalculatePercChange(current_price, last_price) : 0
  //   const bigChange = Math.abs(last_candle_change) > 1.4 ? true : false
   

    
  //   return new Promise((resolve, reject) => {
  //     const query = `
  //       SELECT name, symbol, price, percent_change_15m, percent_change_30m 
  //       FROM data  
  //       WHERE UCID = ?      
  //       ORDER BY status_timestamp DESC
  //       LIMIT 1 OFFSET ?;
  //     `;
  
  //     db.get(query, [UCID, backticks], (err, prev_row) => {
  //       if (err) {
  //         return reject(`Error fetching percent change: ${err.message}`);
  //       }
  //       if(prev_row){
  //         console.log(prev_row)
  //         const prevPercChange = sendNotification(current_price, previous_price)
  //         resolve(0); 

  //       } else {
  //         resolve(0)
  //       }
  //     });
  //   });
  // };



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
  // const records_to_keep = num_of_coins * 7;
  
  return new Promise((resolve, reject) => {
    const query = `
    DELETE FROM data
    WHERE id NOT IN (
      WITH RankedOccurrences AS (
          SELECT
              id,
              ROW_NUMBER() OVER (PARTITION BY UCID ORDER BY status_timestamp DESC) AS rank
          FROM data
      )
      SELECT id
      FROM RankedOccurrences
      WHERE rank <= 7
    )
  `;

    db.run(query, [], (err) => {
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
