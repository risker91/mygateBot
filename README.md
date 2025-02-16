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

## Running MyGate as a Systemd Service  

To ensure MyGate runs continuously, set it up as a systemd service. Create a service file using:  

```sh
sudo nano /etc/systemd/system/mygate.service
```

```sh
[Unit]
Description=MyGate
After=network.target

[Service]
ExecStart=/usr/bin/npm run start
WorkingDirectory=/root/mygateBot
Restart=always
User=root
Group=root
Environment=PATH=/usr/bin:/usr/local/bin
Environment=NODE_ENV=production
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=mygate

[Install]
WantedBy=multi-user.target
```

```sh
sudo systemctl daemon-reload
sudo systemctl start mygate
sudo systemctl enable mygate
```

```sh
sudo systemctl status mygate
```

See logs realtime
```sh
sudo journalctl -u mygate -f
```

## ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

This project is licensed under the [MIT License](LICENSE).
