//Import necessary AWS SDK modules for interacting with DynamoDb
const {DynamoDBClient, PutItemCommand} = require('@aws-sdk/client-dynamodb');


//Initialize a dynamodb client with our AWS Region
const dynamoDbClient = new DynamoDBClient({region:"us-east-1"});

//Lambda funcion to process orders from SQS

exports.processOrder = async (event) =>{
    try {
        console.log("Evento recebido da SQS:", JSON.stringify(event, null, 2));
        
        if (!event.Records || event.Records.length === 0) {
            console.log("Nenhum record encontrado no evento");
            return { statusCode: 200, body: JSON.stringify({ message: "Sem mensagens para processar" }) };
        }

        for(const record of event.Records){
            console.log("Mensagem recebida:", record.body);
            
            const orderData = JSON.parse(record.body);
            console.log("OrderData parseado:", orderData);

            const {id, productId, quantity, email, status, createdAt} = orderData;

            await dynamoDbClient.send(new PutItemCommand({
                TableName: process.env.DYNAMO_TABLE,
                Item: {
                    id: {S:id},
                    productId: {S:productId},
                    quantity: {N: quantity.toString()},
                    email: {S:email},
                    status: {S:status},
                    createdAt: {S:createdAt},
                }
            }));

            console.log(`Pedido ${id} salvo no DynamoDB com sucesso`);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({message:"Order(s) processed successfully"}),
        };
    } catch (error) {
        console.error("Erro ao processar order:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({error:error.message}),
        };
    }
}
