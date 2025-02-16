import WebSocket from 'ws';
import axios from 'axios';
import { randomUUID } from 'crypto';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import fs from 'fs';
import log from './utils/logger.js';
import bedduSalama from './utils/banner.js';
import getSignature from './utils/sign.js';

const headers = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Encoding": "gzip, deflate, br, zstd",
    "Accept-Language": "en-US,en;q=0.9,id;q=0.8",
    "Origin": "https://app.mygate.network",
    "Priority": "u=1, i",
    "Referer": "https://app.mygate.network/",
    "Sec-CH-UA": '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
    "Sec-CH-UA-Mobile": "?0",
    "Sec-CH-UA-Platform": '"Windows"',
    "Sec-Fetch-Dest": "empty",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Site": "same-site",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
};

function readFile(pathFile) {
    try {
        const datas = fs.readFileSync(pathFile, 'utf8')
            .split('\n')
            .map(data => data.trim())
            .filter(data => data.length > 0);
        return datas;
    } catch (error) {
        log.error(`Error reading file: ${error.message}`);
        return [];
    }
};

function writeToFileSync(filePath, text) {
    try {
        fs.writeFileSync(filePath, text);
        console.log('Файл успешно записан!');
    } catch (err) {
        console.error('Ошибка при записи файла:', err);
    }
}

const newAgent = (proxy = null) => {
    if (proxy && proxy.startsWith('http://')) {
        const agent = new HttpsProxyAgent(proxy);
        return agent;
    } else if (proxy && proxy.startsWith('socks4://')) {
        const agent = new SocksProxyAgent(proxy);
        return agent;
    } else if (proxy && proxy.startsWith('socks5://')) {
        const agent = new SocksProxyAgent(proxy);
        return agent;
    } else {
        return null;
    }
};

class WebSocketClient {
    constructor(token, proxy = null, uuid, reconnectInterval = 5000) {
        this.token = token;
        this.proxy = proxy;
        this.socket = null;
        this.signature = null;
        this.timestamp = null;
        this.url = null;
        this.reconnectInterval = reconnectInterval;
        this.shouldReconnect = true;
        this.agent = newAgent(proxy)
        this.uuid = uuid;
        this.regNode = `40{"token":"Bearer ${this.token}"}`;
        this.headers = {
            "Accept-encoding": "gzip, deflate, br, zstd",
            "Accept-language": "en-US,en;q=0.9,id;q=0.8",
            "Cache-control": "no-cache",
            "Connection": "Upgrade",
            "Host": "api.mygate.network",
            "Origin": "chrome-extension://hajiimgolngmlbglaoheacnejbnnmoco",
            "Pragma": "no-cache",
            "Sec-Websocket-Extensions": "permessage-deflate; client_max_window_bits",
            "Upgrade": "websocket",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        }
    }

    connect() {
        if (!this.uuid) {
            log.error("Cannot connect: Node is not found.");
            return;
        }

        log.info("Attempting to connect:", this.uuid);
        const sign = getSignature({ nodeId: this.uuid });
        this.signature = sign.signature;
        this.timestamp = sign.timestamp;
        this.url = `wss://api.mygate.network/socket.io/?nodeId=${this.uuid}&signature=${this.signature}&timestamp=${this.timestamp}&version=2&EIO=4&transport=websocket`;        
        console.info(this.url);

        if (!this.signature) {
            log.error(`Failed To get signature...`)
            return;
        }

        this.socket = new WebSocket(this.url, { headers: this.headers, agent: this.agent });

        this.socket.onopen = () => {
            log.info("WebSocket connection established for node:", this.uuid);
            this.reply(this.regNode);
        };

        this.socket.onmessage = (event) => {
            if (event.data === "2" || event.data === "41") this.socket.send("3");
            else log.info(`Node ${this.uuid} received message:`, event.data);
        };

        this.socket.onclose = () => {
            log.warn("WebSocket connection closed for node:", this.uuid);
            if (this.shouldReconnect) {
                log.warn(`Reconnecting in ${this.reconnectInterval / 1000} seconds for node:`, this.uuid);
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        };

        this.socket.onerror = (error) => {
            log.error(`WebSocket error for node ${this.uuid}:`, error.message);
            this.socket.close();
        };
    }

    reply(message) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(String(message));
            log.info("Replied with:", message);
        } else {
            log.error("Cannot send message; WebSocket is not open.");
        }
    }

    disconnect() {
        this.shouldReconnect = true;
        if (this.socket) {
            this.socket.close();
        }
    }
}


async function registerNode(token, proxy = null, node = null) {
    const agent = newAgent(proxy)
    const maxRetries = 5;
    let retries = 0;
    let uuid = node || randomUUID();
    const activationDate = new Date().toISOString();
    const payload = {
        id: uuid,
        status: "Good",
        activationDate: activationDate,
    };

    while (retries < maxRetries) {
        try {
            const response = await axios.post(
                "https://api.mygate.network/api/front/nodes",
                payload,
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                }
            );

            log.info("Node registered successfully:", response.data);
            return uuid;
        } catch (error) {
            log.error("Error registering node:", error.message);
            retries++;
            if (retries < maxRetries) {
                log.info("Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                log.error("Max retries exceeded; giving up on registration.");
                return null;
            }
        }
    }
}

async function confirmUser(token, proxy = null) {
    const agent = newAgent(proxy)
    try {
        const response = await axios.post(
            "https://api.mygate.network/api/front/referrals/referral/LfBWAQ?",
            {},
            {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            }
        );
        log.info("Confirm user response:", response.data);
        return null;
    } catch (error) {
        log.info("confirming user:", error.message);
        return null;
    }
};

const getQuestsList = async (token, proxy = null) => {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy)

    while (retries < maxRetries) {
        try {
            const response = await axios.get("https://api.mygate.network/api/front/achievements/ambassador", {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            });
            const uncompletedIds = response.data.data.items
                .filter(item => item.status === "UNCOMPLETED")
                .map(item => item._id);
            return uncompletedIds;
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                log.info("Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                log.error("Max retries exceeded; giving up on getting quest info.");
                return { error: error.message };
            }
        }
    }
};

async function submitQuest(token, proxy = null, questId) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy)
    while (retries < maxRetries) {
        try {
            const response = await axios.post(
                `https://api.mygate.network/api/front/achievements/ambassador/${questId}/submit?`,
                {},
                {
                    headers: {
                        ...headers,
                        "Authorization": `Bearer ${token}`,
                    },
                    agent: agent,
                }
            );
            log.info("Submit quest response:", response.data);
            return response.data;
        } catch (error) {
            log.error("Error submit quest:", error.message);
            retries++;
            if (retries < maxRetries) {
                log.info("Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                log.error("Max retries exceeded; giving up on getting quest info.");
                return { error: error.message };
            }
        }
    }
};

async function getUserInfo(token, proxy = null) {
    const maxRetries = 5;
    let retries = 0;
    const agent = newAgent(proxy)

    while (retries < maxRetries) {
        try {
            const response = await axios.get("https://api.mygate.network/api/front/users/me", {
                headers: {
                    ...headers,
                    "Authorization": `Bearer ${token}`,
                },
                agent: agent,
            });
            const { name, status, _id, levels, currentPoint } = response.data.data;
            return { name, status, _id, levels, currentPoint };
        } catch (error) {
            retries++;
            if (retries < maxRetries) {
                log.info("Retrying in 10 seconds...");
                await new Promise(resolve => setTimeout(resolve, 10000));
            } else {
                log.error("Max retries exceeded; giving up on getting user info.");
                return { error: error.message };
            }
        }
    }
};

async function getUserNode(token, proxy = null, index) {
    // Возвращаем фиксированный массив
    return ["a1b35768-0b8d-40dc-b17a-378a00f34838"];
}


const checkQuests = async (token, proxy = null) => {
    log.info('Trying to check for new quests...');
    const questsIds = await getQuestsList(token, proxy);

    if (questsIds && questsIds.length > 0) {
        log.info('Found new uncompleted quests:', questsIds.length);

        for (const questId of questsIds) {
            log.info('Trying to complete quest:', questId);
            try {
                await submitQuest(token, proxy, questId);
                log.info(`Quest ${questId} completed successfully.`);
            } catch (error) {
                log.error(`Error completing quest ${questId}:`, error);
            }
        }
    } else {
        log.info('No new uncompleted quests found.');
    }
};

async function main() {
    log.info(bedduSalama);

    let node = randomUUID();
    let nodes = [];
    let pathFileNode = 'nodes.txt';

     if (!fs.existsSync(pathFileNode)) {
        fs.writeFileSync(pathFileNode, '', 'utf8');
        console.log(`Файл ${pathFileNode} создан.`);        
        writeToFileSync(pathFileNode, node) 
        nodes.push(node);
    } else{
        let nodesFromFile = readFile(pathFileNode);
        node = nodesFromFile[0];
        nodes.push(node);
    }

    const tokens = readFile("tokens.txt");    
    const proxies = readFile("proxy.txt");
    let proxyIndex = 0;


    try {
        log.info(`Processing run with total ${tokens.length} accounts`);
        await Promise.all(tokens.map(async (token, index) => {

            const proxy = proxies.length > 0 ? proxies[proxyIndex] : null;
            if (proxies.length > 0) {
                proxyIndex = (proxyIndex + 1) % proxies.length;
            }

            log.info("Trying to get user nodes for account", `#${index + 1}`); 

            await registerNode(token, proxy, node)

            await confirmUser(token, proxy);

            setInterval(async () => {
                const users = await getUserInfo(token);
                log.info(`User info for account #${index + 1}:`, { Active_Nodes: 1, users });
            }, 11 * 60 * 1000); // Get user info every 11 minutes

            await Promise.all(nodes.map(node => {
                log.info(`Trying to open new connection for account #${index + 1} using proxy:`, proxy || "No Proxy");
                const client = new WebSocketClient(token, proxy, node);
                client.connect();

                setInterval(() => {
                    client.disconnect();
                }, 10 * 60 * 1000); // Auto reconnect node every 10 minutes 
            }));

            await Promise.all(nodes.map(node => {
                                
                setInterval(() => {
                    log.info("Heartbit 1 minute");
                }, 1 * 60 * 1000); // Auto reconnect node every 10 minutes 
            }));



            await checkQuests(token, proxy);
            setInterval(async () => {
                try {
                    await checkQuests(token, proxy);
                } catch (error) {
                    log.error(`Error checking quests for account #${index + 1}:`, error.message);
                }
            }, 24 * 60 * 60 * 1000); // Check quests every 24 hours

            const users = await getUserInfo(token, proxy);
            log.info(`User info for account #${index + 1}:`, { Active_Nodes: 1, users });
        }));

        log.info("All accounts connections established - Just leave it running.");
    } catch (error) {
        log.error("Error in WebSocket connections:", error.message);
    }
}

main();
