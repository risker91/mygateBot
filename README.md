# MyGate Network Bot
![banner](image.png)


## Features

- **Auto Register Node**
- **Maintain Node Operation**

- **Supports a Single Node Only**
- **Supports Proxy Usage**
- **Multiple Accounts Supported**

## Prerequisites

- Node.js installed on your machine
- `tokens.txt` file containing your MyGate platform token. Follow the instructions below to obtain it:
  - Open [MyGate platform](https://app.mygate.network/login?code=TyaDsk)
  - Log in with your Gmail account
  - Open Developer Tools (F12) and navigate to the Network tab
  - Copy the token and save it in `tokens.txt`

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/risker91/mygateBot.git
    cd mygateBot
    ```

2. Install the required dependencies:
    ```sh
    npm install
    ```
3. Input your token in `tokens.txt` file, one user per line;
    ```sh
    nano tokens.txt
    ```
4. optionally you can use proxy: 
- paste proxy in `proxy.txt` format `http://username:password@ip:port` 
    ```sh
    nano proxy.txt
    ```
5. Run the script:
    ```sh
    npm run start
    ```

## ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

This project is licensed under the [MIT License](LICENSE).
