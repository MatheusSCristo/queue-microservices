import type { SQSEvent, SQSHandler } from 'aws-lambda';

export const handler: SQSHandler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const snsPayload = JSON.parse(record.body);
      const order = JSON.parse(snsPayload.Message);

      console.log(`[Notification Service] Processando notificação para o pedido: ${order.orderId}`);

      if (order.status === 'APPROVED') {
        console.log(`[Notification Service] ✅ E-mail enviado: "Olá ${order.customerName}, seu pagamento de R$ ${order.amount} foi APROVADO."`);
      } else {
        console.log(`[Notification Service] ❌ E-mail enviado: "Olá ${order.customerName}, seu pagamento de R$ ${order.amount} foi RECUSADO."`);
      }

      console.log(`[Notification Service] Mensagem processada com sucesso`);
    } catch (error) {
      console.error(`[Notification Service] Erro ao processar notificação do pedido: ${error}`);
      throw error;
    }
  }
};
