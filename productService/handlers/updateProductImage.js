//Import necessary AWS SDK modules for DynamoDB

const {DynamoDBClient, UpdateItemCommand, ScanCommand} = require('@aws-sdk/client-dynamodb');


//Initilize the dynamoDB client with the specified AWS Region

const dynamoDbClient = new DynamoDBClient({region:"us-east-1"});

exports.updateProductImage = async (event)=>{
    try {
        //Retrieve the table name from environment varaibles
        const tableName = process.env.DYNAMO_TABLE
        //Extract the first record from the event
        const record = event.Records[0];

        //Get the s3 Bucket name from the event record
        const bucketName = record.s3.bucket.name;

        //extract the file name directly from the s3 event record
        const fileName = record.s3.object.key;

        //construct the public url for the uploaded image
        const imageUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;

         //Fine the ID using fileName
         const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: "fileName = :fileName",
            ExpressionAttributeValues: {
                ":fileName": {S: fileName}
            }
         });

        const scanResult = await dynamoDbClient.send(scanCommand);
        if(!scanResult.Items || scanResult.Items.length ===0){
            return {
                statusCode: 404,
                body: JSON.stringify({message:"Product not found"}),
            };
        }

        const productId = scanResult.Items[0].id.S; //Get the correct ID
        //Prepare the DynamoDB update command 

        const updateItemCommand = new UpdateItemCommand({
           TableName: tableName,
           Key:{id: {S: productId}},
           UpdateExpression: "SET imageUrl = :imageUrl",//update only the image url field
           ExpressionAttributeValues: {
            ":imageUrl": {S:imageUrl},//Assign the new image url
           },
        });
        //Excute the update command to modify the item in dynamoDB

        await dynamoDbClient.send(updateItemCommand);

        return {
            statusCode: 200,
            body: JSON.stringify({message:"image Url updated successfully"}),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({message:error.message}),
        };
    }
}