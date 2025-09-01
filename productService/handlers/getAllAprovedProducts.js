//Import required AWS SDK modules to interact with DynamoDB

const {DynamoDBClient, ScanCommand} = require('@aws-sdk/client-dynamodb');

//Initialize the Dynamodb client with AWS Region

const dynamoDbClient = new DynamoDBClient({region:'us-east-1'});

//Function to fetch all products where isApproved is true

exports.getApprovedProducts = async () =>{
    try {
        //Get the dynamoDb table name from the environment variables
        const tableName = process.env. DYNAMO_TABLE;

        //Define a ScanCommand to fetch all products where isApproved is true
        const scanCommand = new ScanCommand({
            TableName: tableName,//Specify the table to scan
            FilterExpression: "isApproved = :trueVal",
            ExpressionAttributeValues: {
                ":trueVal": {BOOL: true}
            }
        });

        //Execute the scan command and retriev matching items from the database
      const {Items} =  await dynamoDbClient.send(scanCommand);

      //return a success response with the retrieved products

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