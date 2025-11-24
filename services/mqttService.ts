import mqtt from 'mqtt';
import { User, DailyStatus, Message } from '../types';

const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';

let client: mqtt.MqttClient | null = null;
let currentClassCode: string = '';

type MessageHandler = (topic: string, message: any) => void;
const listeners: MessageHandler[] = [];

export const connectMQTT = (user: User, onMessage: MessageHandler) => {
  if (client) {
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
    const topic = `bunkmate/${currentClassCode}/#`;
    client?.subscribe(topic, (err) => {
      if (err) {
        console.error('Subscription error:', err);
      } else {
        console.log(`Subscribed to ${topic}`);
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
  client.publish(topic, JSON.stringify(status), { qos: 1, retain: true });
};

export const publishMessage = (message: Message) => {
  if (!client || !currentClassCode) return;
  const topic = `bunkmate/${currentClassCode}/message`;
  client.publish(topic, JSON.stringify(message), { qos: 1 }); 
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

export const publishTyping = (user: User, isTyping: boolean) => {
  if (!client || !currentClassCode) return;
  const topic = `bunkmate/${currentClassCode}/typing`;
  client.publish(topic, JSON.stringify({ userId: user.id, userName: user.name, isTyping, timestamp: Date.now() }), { qos: 0 });
}

export const publishReaction = (messageId: string, emoji: string, userId: string) => {
    if (!client || !currentClassCode) return;
    const topic = `bunkmate/${currentClassCode}/reaction`;
    client.publish(topic, JSON.stringify({ messageId, emoji, userId }), { qos: 1 });
}

export const publishReadReceipt = (messageId: string, userId: string) => {
    if (!client || !currentClassCode) return;
    const topic = `bunkmate/${currentClassCode}/read`;
    client.publish(topic, JSON.stringify({ messageId, userId }), { qos: 0 });
}

export const publishPollVote = (messageId: string, optionId: string, userId: string) => {
    if (!client || !currentClassCode) return;
    const topic = `bunkmate/${currentClassCode}/poll-vote`;
    client.publish(topic, JSON.stringify({ messageId, optionId, userId }), { qos: 1 });
}