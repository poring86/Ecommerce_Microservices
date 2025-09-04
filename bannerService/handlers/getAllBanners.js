//Import required AWS SDK modules to interact with DynamoDb

const {DynamoDBClient, ScanCommand} = require('@aws-sdk/client-dynamodb');

//Initialize the DynamoDB Client with AWS Region

const dynamoDbClient = new DynamoDBClient({region: 'us-east-1'});

//Lambda Function to retrieve all Banners from DynamoDb table

exports.getAllBanners = async ()=>{
    try {
        //Retrieve the DynamoDB table name from the environment varaibles
        const tableName = process.env.DYNAMO_TABLE;

        //Create a scanCommand to fetch all items (banners) from the table
        const scanCommand = new ScanCommand({
            TableName: tableName,
        });

        //Execute the scan command to fetch banner items

        const {Items} = await dynamoDbClient.send(scanCommand);

        //if no items are found , return an empty list
        if(!Items || Items.length===0){
            return {
                statusCode: 404,
                body: JSON.stringify({message:"No banners found"}),
            };
        }
        //Format the Retrieved items into a readable JSON response
        const banners = Items.map(item =>({
            imageUrl: item.imageUrl.S, //extracting imageUrl
        }));

        //Return the list of banners  in the response

        return {
            statusCode: 200,
            body: JSON.stringify(banners),
        };
    } catch (error) {
        return {
            statusCode:500,
            body:JSON.stringify({error:error.message}),
        };
    }
}