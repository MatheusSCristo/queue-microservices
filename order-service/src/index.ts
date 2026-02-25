import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';

dotenv.config();

const app = express();
app.use(express.json());

const region = process.env.AWS_REGION;
if (!region) {
  throw new Error('AWS_REGION não definido');
}

const snsClient = new SNSClient({ region });

app.get('/', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'order-service' });
});

app.post('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const { customerName, amount } = req.body;

    if (!customerName || !amount) {
      res.status(400).json({ error: 'Os campos customerName e amount são obrigatórios.' });
      return;
    }

    const order = {
      orderId: crypto.randomUUID(),
      customerName,
      amount,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    console.log(`[Order Service] Processando novo pedido: ${order.orderId}`);

    const command = new PublishCommand({
      TopicArn: process.env.SNS_ORDER_CREATED_TOPIC_ARN,
      Message: JSON.stringify(order),
    });

    await snsClient.send(command);

    console.log(`[Order Service] Pedido publicado no SNS com sucesso.`);

    res.status(202).json({
      message: 'Pedido recebido e encaminhado para processamento.',
      orderId: order.orderId
    });

  } catch (error) {
    console.error('[Order Service] Falha ao publicar evento no SNS:', error);
    res.status(500).json({ error: 'Erro interno no servidor ao processar o pedido.' });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`[Order Service] Servidor inicializado e escutando na porta ${PORT}`);
});