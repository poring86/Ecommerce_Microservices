//Import required AWS SDK modules to interact with DynamoDB

const {DynamoDBClient, PutItemCommand} = require('@aws-sdk/client-dynamodb');

//Import UUID generator to create unique order IDs

const uuid = async () => (await import('uuid')).v4;

//Import axios for making HTTP REQUESTS
const axios = require('axios');
const {SQSClient, SendMessageCommand} = require('@aws-sdk/client-sqs');
//Create new SQS client instance , specifying the AWS Region
const sqsClient = new SQSClient({region:'us-east-1'});

//Lambda function to handle order placement 
exports.placeOrder = async (event) =>{
    try {
        //Parse the request body to extract order details
        const {id, quantity, email} = JSON.parse(event.body);

        //Validate that all required fields are provided
        if(!id || !quantity || !email){
            return {
                statusCode: 400, //Bad request
                body: JSON.stringify({error: "fields are required"}), 
            };
        }
        //Fetch the list of approved products from an external  Product Service API
      const productResponse =  await axios.get(
            `https://yfz8c07q9h.execute-api.us-east-1.amazonaws.com/approve-products`
        );
       //Extract approved products from the API response 
       const approvedProducts = productResponse.data.products || [];
       
       //Find the product request in the order from the approved products list
      const product = approvedProducts.find(p => p.id?.S ===id);
      //p represent each product in the approvedProducts  array
      //p.id is the product's id

      //if the product is not found or not approved , return an error response

      if(!product){
        return {
            statusCode: 404, //Not found
            body: JSON.stringify({error:'Product not found or not approved'}),
        };
      }

      //check if there is sufficient stock available
      const availableStock = parseInt(product.quantity?.N || "0");//Convert stock to an integer
      if(availableStock<quantity){
        return {
            statusCode: 400,//Bad request
            body: JSON.stringify({error:"Insufficient stock available"}),
        };
      }

      //Generate a unique order ID using the UUID

      const orderId = uuid();
      //create order payload
      const orderPayload = {
        id:orderId,
        productId: id,
        quantity,
        email,
        status:"pending",
        createdAt: new Date().toISOString(),
      };

      //send order to SQS
      await sqsClient.send(
        new SendMessageCommand({
          QueueUrl: process.env.SQS_QUEUE_URL,
          MessageBody: JSON.stringify(orderPayload),
        })
      );

      //return a success response with the order ID

      return {
        statusCode: 201, //created
        body: JSON.stringify({message: "order placed succesfully", orderId}),
      };


    } catch (error) {
        return {
        statusCode: 500, //Internal Server Error
        body: JSON.stringify({error: error.message}),
      };
 
    }
}