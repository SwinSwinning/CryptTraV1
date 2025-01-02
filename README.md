Cryptotracker
=============

Overview
--------

Cryptotracker is a web application designed to assist crypto enthusiasts and futures traders by providing early indications of market movements. The application tracks price movements of predefined cryptocurrency/USDT pairs and sends Telegram notifications when specific conditions are met.

* * * * *

Features
--------

-   **Market Tracking**: Displays the last 7 five-minute candles for all cryptocurrency pairs, showing price data and percentage movements.

-   **Filtering**: Users can filter results to display records for specific cryptocurrency pairs.

-   **Real-time Notifications**: Sends Telegram notifications when predefined price conditions are met for any tracked pair.

-   **Data Source**: All cryptocurrency data is retrieved using the CoinMarketCap API.

* * * * *

Target Audience
---------------

Cryptotracker is designed for:

-   Crypto enthusiasts looking for real-time price updates.

-   Futures traders seeking early market indicators.

* * * * *

Technologies Used
-----------------

-   **Languages**: Node.js, JavaScript, HTML, CSS

-   **Dependencies**:

    -   axios@1.7.9

    -   dotenv@16.4.7

    -   ejs@3.1.10

    -   express@4.21.2

    -   node-cron@3.0.3

    -   nodemon@3.1.9

    -   sqlite3@5.1.7
      
-   **API Services**:
      
      -   Cryptocurrency data provided by the [CoinMarketCap API](https://coinmarketcap.com/api/).  
      
      -   Telegram bot integration powered by the Telegram Bot API.
* * * * *

Installation and Setup
----------------------

To set up and run Cryptotracker on your local environment, follow these steps:

1.  **Clone the Repository**:

    ```
    git clone <repository-url>
    cd cryptotracker
    ```

2.  **Install Dependencies**:

    ```
    npm install
    ```

3.  **Configure Environment Variables**:

    -   Create a `.env` file in the project root directory.

    -   Add the following variables:

        ```
        TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
        TELEGRAM_CHAT_ID=<your-telegram-chat-id>
        PROD_API_KEY=<your-coinmarketcap-api-key>
        NODE_ENV=prod
        ```

    -   Telegram bot tokens can be generated via [@botFather](https://core.telegram.org/bots/features#creating-a-new-bot).

    -   Get your CoinMarketCap API key from [CoinMarketCap API](https://coinmarketcap.com/api/).

4.  **Run the Application**:

    ```
    npm start
    ```

* * * * *

Usage
-----

-   **User Interface**: The UI displays real-time data for cryptocurrency pairs, including:

    -   Last 7 five-minute candles.

    -   Price changes and percentage movements.

-   **Notifications**: Telegram notifications are sent when a cryptocurrency pair meets predefined conditions.

-   **Filters**: Use the filter option to view specific cryptocurrency pair data.

* * * * *

Roadmap
-------

Future updates to Cryptotracker include:

1.  Allow users to customize conditions for notifications.

2.  Add functionality to freely add or remove cryptocurrency pairs.

3.  Integrate control buttons into Telegram notifications.

4.  Enhance and update the UI for better usability.

* * * * *

Project Status
--------------

Cryptotracker is currently under development. Contributions and feedback are welcome to improve functionality and user experience.

* * * * *

License
-------

This project does not currently specify a license. Please contact the project owner for usage terms.

* * * * *


