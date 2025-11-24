
import mqtt from 'mqtt';
import { User, DailyStatus, Message, CalendarEvent } from '../types';

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

  console.log(`Connecting to MQTT broker...`);

  client = mqtt.connect(BROKER_URL, {
    clientId,
    keepalive: 120, // Increased to 120s to prevent timeouts during background throttling
    clean: true,
    reconnectPeriod: 2000,
    connectTimeout: 30 * 1000,
    reschedulePings: true, // Helps when browser wakes up from sleep
    protocolVersion: 4
  });

  client.on('connect', () => {
    console.log('MQTT Connected');
    // Subscribe to all relevant topics including specific event IDs
    const topic = `bunkmate/${currentClassCode}/#`;
    client?.subscribe(topic, (err) => {
      if (!err) {
        publishHeartbeat(user);
      }
    });
  });

  client.on('message', (topic: string, payload: any) => {
    try {
      const messageStr = payload.toString();
      const data = JSON.parse(messageStr);
      listeners.forEach(l => l(topic, data));
    } catch (e) {
      // Ignore parse errors from malformed packets
    }
  });

  client.on('error', (err) => {
    // Suppress keepalive timeout errors from console to avoid noise
    if (err.message === 'Keepalive timeout') {
        console.log('MQTT Keepalive timeout, reconnecting...');
    } else {
        console.error('MQTT Error:', err);
    }
  });
  
  client.on('reconnect', () => {
      // Silent reconnect
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

export const publishEvent = (event: CalendarEvent) => {
    if (!client || !currentClassCode) return;
    // Use unique topic per event so Retain works for multiple items (Agenda)
    const topic = `bunkmate/${currentClassCode}/event/${event.id}`;
    client.publish(topic, JSON.stringify(event), { qos: 1, retain: true });
}
