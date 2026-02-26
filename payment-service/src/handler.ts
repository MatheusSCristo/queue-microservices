import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import type { SQSEvent, SQSHandler } from 'aws-lambda';

const snsClient = new SNSClient({});

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const snsPayload = JSON.parse(record.body);
      const order = JSON.parse(snsPayload.Message);

      console.log(`[Payment Service] Processando pagamento do pedido: ${order.orderId}`);
      console.log(`[Payment Service] Valor: R$ ${order.amount}`);

      const isApproved = Math.random() > 0.2;
      order.status = isApproved ? 'APPROVED' : 'REJECTED';

      console.log(`[Payment Service] Status do pagamento: ${order.status}`);

      await snsClient.send(new PublishCommand({
        TopicArn: process.env.SNS_PAYMENT_RESULT_TOPIC_ARN,
        Message: JSON.stringify(order),
      }));
      console.log(`[Payment Service] Resultado publicado no SNS`);
    } catch (error) {
      console.error(`[Payment Service] Erro ao processar pagamento do pedido: ${error}`);
      throw error;
    }

  }
};
