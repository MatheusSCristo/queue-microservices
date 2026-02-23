import { DeleteMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';
import { Consumer } from 'sqs-consumer';

dotenv.config();

const region = process.env.AWS_REGION;

if (!region) {
  throw new Error("AWS_REGION não está definida");
}

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
};

const sqsClient = new SQSClient({ region, credentials });
const cachePedidos = new Set<string>();

console.log('[Notification Service] Inicializando worker...');

const app = Consumer.create({
  queueUrl: process.env.SQS_NOTIFICATION_QUEUE_URL as string,
  sqs: sqsClient,
  batchSize: 1,
  handleMessage: async (message) => {
    try {
      if (!message.Body) return;

      const snsPayload = JSON.parse(message.Body);
      const order = JSON.parse(snsPayload.Message);

      if (cachePedidos.has(order.orderId)) {
        console.log(`[Notification Service] 🛡️ Ignorando duplicata: ${order.orderId}`);
        // Deleta a mensagem repetida da fila
        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: process.env.SQS_NOTIFICATION_QUEUE_URL!,
          ReceiptHandle: message.ReceiptHandle!
        }));
        return;
      }
      console.log(order)
      cachePedidos.add(order.orderId);

      console.log(`\n[Notification Service] Processando notificação para o pedido: ${order.orderId}`);

      if (order.status === 'APPROVED') {
        console.log(`[Notification Service] ✅ E-mail enviado: "Olá ${order.customerName}, seu pagamento de R$ ${order.amount} foi APROVADO."`);
      } else {
        console.log(`[Notification Service] ❌ E-mail enviado: "Olá ${order.customerName}, seu pagamento de R$ ${order.amount} foi RECUSADO."`);
      }

      if (!message.ReceiptHandle) {
        throw new Error("O ReceiptHandle veio vazio do SQS!");
      }

      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: process.env.SQS_NOTIFICATION_QUEUE_URL as string,
        ReceiptHandle: message.ReceiptHandle
      }));

      console.log('[Notification Service] 🗑️ Mensagem deletada da fila com sucesso!');

      return undefined;
    } catch (error) {
      console.error('[Notification Service] Erro ao processar mensagem:', error);
      throw error;
    }
  }
});

app.on('error', (err) => {
  console.error('[Notification Service] Erro no SQS:', err.message);
});

app.on('processing_error', (err) => {
  console.error('[Notification Service] Erro de processamento:', err.message);
});

app.start();
console.log('[Notification Service] Escutando a fila NotificationQueue com sucesso. Aguardando mensagens...');