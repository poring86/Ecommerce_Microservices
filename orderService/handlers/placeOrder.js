// Import required AWS SDK modules to interact with DynamoDB
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

// Import axios for making HTTP requests
const axios = require('axios');

// UUID generator (corrigido!)
const uuid = async () => {
  const { v4 } = await import('uuid');
  return v4();
};

// Create new SQS client instance , specifying the AWS Region
const sqsClient = new SQSClient({ region: 'us-east-1' });

// Lambda function to handle order placement
exports.placeOrder = async (event) => {
  console.log("🔔 Evento recebido:", JSON.stringify(event, null, 2));

  try {
    // Parse the request body to extract order details
    const { id, quantity, email } = JSON.parse(event.body || "{}");
    console.log("📦 Dados do request:", { id, quantity, email });

    // Validate that all required fields are provided
    if (!id || !quantity || !email) {
      console.error("❌ Campos obrigatórios faltando");
      return {
        statusCode: 400, // Bad request
        body: JSON.stringify({ error: "fields are required" }),
      };
    }

    // Fetch the list of approved products from an external Product Service API
    console.log("🌍 Buscando produtos aprovados...");
    const productResponse = await axios.get(
      `https://yfz8c07q9h.execute-api.us-east-1.amazonaws.com/approve-products`
    );

    // Extract approved products from the API response
    const approvedProducts = productResponse.data.products || [];
    console.log("📋 Produtos aprovados recebidos:", approvedProducts);

    // Find the product request in the order from the approved products list
    const product = approvedProducts.find((p) => p.id?.S === id);
    console.log("🔍 Produto encontrado:", product);

    if (!product) {
      console.error("❌ Produto não encontrado ou não aprovado");
      return {
        statusCode: 404, // Not found
        body: JSON.stringify({ error: "Product not found or not approved" }),
      };
    }

    // Check if there is sufficient stock available
    const availableStock = parseInt(product.quantity?.N || "0");
    console.log("📦 Estoque disponível:", availableStock);

    if (availableStock < quantity) {
      console.error("❌ Estoque insuficiente");
      return {
        statusCode: 400, // Bad request
        body: JSON.stringify({ error: "Insufficient stock available" }),
      };
    }

    // Generate a unique order ID using the UUID
    const orderId = await uuid();
    console.log("🆔 OrderId gerado:", orderId);

    // Create order payload
    const orderPayload = {
      id: orderId,
      productId: id,
      quantity,
      email,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    console.log("📦 OrderPayload pronto:", orderPayload);

    // Send order to SQS
    console.log("📨 Enviando mensagem para fila SQS:", process.env.SQS_QUEUE_URL);
    await sqsClient.send(
      new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        MessageBody: JSON.stringify(orderPayload),
      })
    );

    console.log("✅ Order enviada para SQS com sucesso");

    // Return a success response with the order ID
    return {
      statusCode: 201, // created
      body: JSON.stringify({
        message: "Order placed successfully",
        orderId,
      }),
    };
  } catch (error) {
    console.error("💥 Erro no placeOrder:", error);
    return {
      statusCode: 500, // Internal Server Error
      body: JSON.stringify({ error: error.message }),
    };
  }
};
