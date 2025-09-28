//Import necessary AWS SDK modules for interacting with DynamoDb
const {DynamoDBClient, PutItemCommand} = require('@aws-sdk/client-dynamodb');


//Initialize a dynamodb client with our AWS Region
const dynamoDbClient = new DynamoDBClient({region:"us-east-1"});

//Lambda funcion to process orders from SQS

exports.processOrder = async (event) =>{
    try {
        
           //Loop through each record in the SQS event
           for(const record of event.Records){
            //Parse order data from the message body
            const orderData = JSON.parse(record.body);

            //Destructure order data into individual varaibles
            const {id, productId, quantity, email, status, createdAt} = orderData;

            //send a command to DynamoDb to insert the order item
            await dynamoDbClient.send(new PutItemCommand({
                TableName: process.env.DYNAMO_TABLE,
                Item: {
                    id: {S:id},
                    productId: {S:productId},
                    quantity: {N: quantity.toString()},
                    email: {S:email},
                    status: {S:status},//current status of the order
                    createdAt: {S:createdAt},
   }

            }));
           }

           //return a cuess response after processing all records
           return {
            statusCode: 200,
            body: JSON.stringify({message:" Order(s) processed succesfully"}),
           };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({error:error.message}),
           };
    }
}