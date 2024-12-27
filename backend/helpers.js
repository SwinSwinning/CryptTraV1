function CalculatePercChange(current_price, previous_price) {
    return ((current_price - previous_price) / previous_price) * 100;
}

function sendNotification(current_price, symbol, name, last_candle_change, second_last_candle_change, percent_change_15m, percent_change_30m) {
    // console.log("send Notification ", percent_change_30m)   
      
    const message = `Coin: ${name} - ${symbol}\n` +
    `Current Price: ${current_price.toFixed(5)}\n` +    
    `Last Change ---------: ${last_candle_change.toFixed(2)}%\n` +
    `Previous Change -----: ${second_last_candle_change.toFixed(2)}%\n` +
    `15m Change ----------: ${percent_change_15m.toFixed(2)}%\n` + 
    `30m Change-----------: ${percent_change_30m.toFixed(2)}%\n` 

    // console.log(message)

    sendTelegramMessage(message);
              

}

module.exports =  { CalculatePercChange, sendNotification }