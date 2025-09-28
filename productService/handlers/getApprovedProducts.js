//Import required AWS SDK modules to interact with DynamoDB

const {DynamoDBClient, ScanCommand} = require('@aws-sdk/client-dynamodb');

//Initialize the Dynamodb client with AWS Region

const dynamoDbClient = new DynamoDBClient({region:'us-east-1'});

//Function to fetch all products where isApproved is true

exports.getApprovedProducts = async () =>{
    try {

        const tableName = process.env. DYNAMO_TABLE;

        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: "isApproved = :trueVal",
            ExpressionAttributeValues: {
                ":trueVal": {BOOL: true}
            }
        });

      const {Items} =  await dynamoDbClient.send(scanCommand);

      return {
        statusCode:200,
        body: JSON.stringify({products:Items || []}),
      };
    } catch (error) {
        return {
            statusCode:500,
            body: JSON.stringify({error: error.message}),
          };
    }
};