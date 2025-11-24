import mqtt from 'mqtt';
import { User, DailyStatus, Message } from '../types';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

let client: mqtt.MqttClient | null = null;
let currentClassCode: string = '';

type MessageHandler = (topic: string, message: any) => void;
const listeners: MessageHandler[] = [];

export const connectMQTT = (user: User, onMessage: MessageHandler) => {
  if (client) {
    // If trying to connect with same user/code, do nothing
    if (currentClassCode === user.classCode && client.connected) return;
    client.end();
  }

  currentClassCode = user.classCode;
  listeners.push(onMessage);

  const clientId = 'bunkmate_' + Math.random().toString(16).substring(2, 8);

  console.log(`Connecting to MQTT broker at ${BROKER_URL} as ${clientId}...`);

  client = mqtt.connect(BROKER_URL, {
    clientId,
    keepalive: 60,
    clean: true,
    reconnectPeriod: 5000,
    connectTimeout: 30 * 1000,
  });

  client.on('connect', () => {
    console.log('MQTT Connected');
    // Subscribe to all topics for this class code
    const topic = `bunkmate/${currentClassCode}/#`;
    client?.subscribe(topic, (err) => {
      if (err) {
        console.error('Subscription error:', err);
      } else {
        console.log(`Subscribed to ${topic}`);
        // Announce presence immediately
        publishHeartbeat(user);
      }
    });
  });

  client.on('message', (topic: string, payload: Buffer) => {
    try {
      const messageStr = payload.toString();
      const data = JSON.parse(messageStr);
      listeners.forEach(l => l(topic, data));
    } catch (e) {
      console.error('Failed to parse MQTT message', e);
    }
  });

  client.on('error', (err) => {
    console.error('MQTT Error:', err);
  });
  
  client.on('reconnect', () => {
      console.log('MQTT Reconnecting...');
  });
};

export const disconnectMQTT = () => {
  if (client) {
    client.end();
    client = null;
    listeners.length = 0;
  }
};

export const publishStatus = (status: DailyStatus) => {
  if (!client || !currentClassCode) return;
  const topic = `bunkmate/${currentClassCode}/status`;
  client.publish(topic, JSON.stringify(status), { qos: 0, retain: true });
};

export const publishMessage = (message: Message) => {
  if (!client || !currentClassCode) return;
  const topic = `bunkmate/${currentClassCode}/message`;
  client.publish(topic, JSON.stringify(message), { qos: 0 }); // Messages are ephemeral
};

export const publishHeartbeat = (user: User) => {
  if (!client || !currentClassCode) return;
  const topic = `bunkmate/${currentClassCode}/heartbeat`;
  const heartbeatPayload = {
    id: user.id,
    name: user.name,
    avatar: user.avatar,
    classCode: user.classCode,
    lastSeen: Date.now()
  };
  client.publish(topic, JSON.stringify(heartbeatPayload), { qos: 0 });
};