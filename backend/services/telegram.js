require('dotenv').config();
const axios = require('axios');

// Replace with your bot token and chat ID
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const sendTelegramMessage = async (message) => {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
    });

    if (response.data.ok) {
      console.log('Telegram message sent successfully');
    } else {
      console.error('Error sending Telegram message:', response.data.description);
    }
  } catch (error) {
    console.error('Error sending Telegram message:', error.message);
  }
};

module.exports = { sendTelegramMessage };