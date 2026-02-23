import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { DeleteMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import dotenv from 'dotenv';
import { Consumer } from 'sqs-consumer';

dotenv.config();

// Inicializa os clientes da AWS
const region = process.env.AWS_REGION;

if (!region) {
  throw new Error("AWS_REGION não está definida");
}

const credentials = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
};

const snsClient = new SNSClient({ region, credentials });
const sqsClient = new SQSClient({ region, credentials });

console.log('[Payment Service] Inicializando worker...');

const app = Consumer.create({
  queueUrl: process.env.SQS_PAYMENT_QUEUE_URL as string,
  sqs: sqsClient,
  handleMessage: async (message) => {
    try {
      if (!message.Body) return;

      const snsPayload = JSON.parse(message.Body);
      const order = JSON.parse(snsPayload.Message);

      console.log(`\n[Payment Service] Processando pagamento do pedido: ${order.orderId}`);
      console.log(`[Payment Service] Valor: R$ ${order.amount}`);

      const isApproved = Math.random() > 0.2;
      order.status = isApproved ? 'APPROVED' : 'REJECTED';

      console.log(`[Payment Service] Status do pagamento: ${order.status}`);

      const publishCommand = new PublishCommand({
        TopicArn: process.env.SNS_PAYMENT_RESULT_TOPIC_ARN,
        Message: JSON.stringify(order),
      });
      await snsClient.send(publishCommand);
      console.log(`[Payment Service] Resultado publicado no SNS (PaymentResultTopic)`);
      console.log('[Payment Service] Tentando deletar manualmente para capturar o erro...');

      if (!message.ReceiptHandle) {
        throw new Error("O ReceiptHandle veio vazio do SQS!");
      }

      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: process.env.SQS_PAYMENT_QUEUE_URL as string,
        ReceiptHandle: message.ReceiptHandle
      }));

      console.log('[Payment Service] 🗑️ Deletado com sucesso pela chamada manual!');

      return undefined;
    } catch (error) {
      console.error('[Payment Service] Erro ao processar mensagem:', error);
      throw error;
    }
  }
});

app.on('error', (err) => {
  console.error('[Payment Service] Erro no SQS:', err.message);
});

app.on('processing_error', (err) => {
  console.error('[Payment Service] Erro de processamento:', err.message);
});

app.start();
console.log('[Payment Service] Escutando a fila PaymentQueue com sucesso. Aguardando mensagens...');