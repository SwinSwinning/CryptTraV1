
const sqlite3 = require('sqlite3');
const { sendTelegramMessage } = require('./telegram');

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
  
          // console.log("Processing:", UCID);
  
          // Fetch percent_change_15m and percent_change_30m
          const percent_change_15m = await getPercentChange(price, UCID, 2);
          const percent_change_30m = await getPercentChange(price, UCID, 5);
          
          // Create and push the insertion promise
          promises.push(
            new Promise((innerResolve, innerReject) => {
              const query = `
                INSERT INTO data (status_timestamp, UCID, symbol, name, price, percent_change_1h, percent_change_24h, percent_change_15m, percent_change_30m)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;
  
              db.run(
                query,
                [timestamp, UCID, symbol, name, price, percent_change_1h, percent_change_24h, percent_change_15m, percent_change_30m],
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
       console.log("All data inserted successfully:");
        resolve(results);
      } catch (error) {
        console.error("Error in insertData:", error);
        reject(error);
      }
    });
  };
  


  const insertData1 = (dataList) => {
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
          const symbol = item.symbol;
          const name = item.name;
          const price = item.quote.USD.price;
          const percent_change_1h = item.quote.USD.percent_change_1h;
          const percent_change_24h = item.quote.USD.percent_change_24h;
  
          console.log("Processing:", UCID);
  
          const insertPromise = (async () => {  
            try {
              const percent_change_15m =  await calculatePriceChange(UCID, price, 2);     
              const percent_change_30m =  await calculatePriceChange(UCID, price, 5);
              console.log("passed calculate ", UCID);
              const query = `
                INSERT INTO data (status_timestamp, UCID, symbol, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
              `;
  
              return new Promise((innerResolve, innerReject) => {
                db.run(query, [timestamp, UCID, symbol, name, price, percent_change_15m, percent_change_30m, percent_change_1h, percent_change_24h], function (err) {
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
  
  const getPreviousPercChanges = async (UCID, interval) => {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT 
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
          
          resolve(row.selected_percent_change); // Default to 0 if no data found

      });
    });

  }
  const getPercentChange = async (current_price, UCID, backticks) => {
 
    const percAlert = backticks === 5 ? 3: 2           
    const interval = backticks === 5 ? "30m" : "15m"   
    const previous_percent_change = await getPreviousPercChanges(UCID, interval)

    
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
          const priceChange = ((current_price - prev_row.price) / prev_row.price) * 100;
  
          // const previous_percent_change = interval === "30m" ? prev_row.percent_change_30m : prev_row.percent_change_15m 
          if(Math.abs(priceChange) > percAlert && Math.abs(previous_percent_change) > percAlert) {
              const message = `Coin: ${prev_row.name} - ${prev_row.symbol}\n` +
              `Current Price: ${current_price}\n` + 
              `Change: ${priceChange.toFixed(2)}%\n` + 
              `previous: ${previous_percent_change.toFixed(2)}%\n` +
              `Interval: ${interval}`;
              console.log(message)
              sendTelegramMessage(message);
          }
          resolve(priceChange); // Default to 0 if no data found
        } else {
          resolve(0)
        }
      });
    });
  };

//   const calculatePriceChange = async (UCID, current_price, backticks = 2) => {
//     return new Promise((resolve, reject) => {
//       const query = `
//         SELECT name, price, percent_change_15m, percent_change_30m 
//         FROM data        
//         ORDER BY status_timestamp DESC
//         OFFSET ?;
//       `;
  
//       db.get(query, [backticks], (err, row) => {
//         if (err) {
//           reject('Error fetching data from the database');
//         } else if (row) {
//           console.log("row is herer ")
//           const percAlert = backticks == 5 ? 3: 2           
//           const interval = backticks == 5 ? "30m" : "15m"    
//           let previous_percent_change = row.percent_change_15m   
//           if (backticks == 5) {
//             interval = "30m"
//             percAlert = 3;
//             previous_percent_change = row.percent_change_30m 
//           }
//           // Calculate the percentage change
//           console.log("calculating change")
//           const priceChange = ((current_price - row.price) / row.price) * 100;
          
//           if(Math.abs(previous_percent_change) > percAlert) {
//             console.log("previous per change : ", previous_percent_change)
//             if (Math.abs(priceChange) > percAlert) {
//               const message = `Coin: ${row.name} - ${row.symbol}\n` +
//                               `Current Price: ${current_price}\n` + 
//                               `Change: ${priceChange.toFixed(2)}%` + 
//                               `Interval: ${interval}%`;
//               //console.log(message)
//               // sendTelegramMessage(message);
//               resolve(priceChange); 
//             } 
//           } else {
//             resolve(priceChange); // Still resolve with the calculated value 
//           }
//         } else {
//           console.log("No earlier data found for UCID:", UCID);
//           resolve(0); // No row found, resolve with 0
//         }
//       });
//     });
//   };

// const calculatePriceChange1 = async (UCID, current_price, backticks = 2) => {
//   return new Promise((resolve, reject) => {
//     const query = `
//       SELECT id, name, price, percent_change_15m, percent_change_30m, status_timestamp 
//       FROM data
//       WHERE UCID = ?
//       ORDER BY status_timestamp DESC
//       LIMIT 1 OFFSET ?;
//     `;

//     db.get(query, [UCID, backticks], (err, row) => {
//       if (err) {
//         reject('Error fetching data from the database');
//       } else if (row) {
//         console.log("row is herer ", UCID)
//         let percAlert = 2;
//         let interval = "15m"   
//         let previous_percent_change = row.percent_change_15m   
//         if (backticks == 5) {
//           interval = "30m"
//           percAlert = 3;
//           previous_percent_change = row.percent_change_30m 
//         }
//         // Calculate the percentage change
//         console.log("calculating change")
//         const priceChange = ((current_price - row.price) / row.price) * 100;
        
//         if(Math.abs(previous_percent_change) > percAlert) {
//           console.log("previous per change : ", previous_percent_change)
//           if (Math.abs(priceChange) > percAlert) {
//             const message = `Coin: ${row.name} - ${row.symbol}\n` +
//                             `Current Price: ${current_price}\n` + 
//                             `Change: ${priceChange.toFixed(2)}%` + 
//                             `Interval: ${interval}%`;
//             //console.log(message)
//             // sendTelegramMessage(message);
//             resolve(priceChange); 
//           } 
//         } else {
//           resolve(priceChange); // Still resolve with the calculated value 
//         }
//       } else {
//         console.log("No earlier data found for UCID:", UCID);
//         resolve(0); // No row found, resolve with 0
//       }
//     });
//   });
// };


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
module.exports = { createTable, insertData, getAllData, clearDatabase, dropTable, getUcids };