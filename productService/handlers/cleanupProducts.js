const {DynamoDBClient, ScanCommand, DeleteItemCommand} = require('@aws-sdk/client-dynamodb');
const {SNSClient, PublishCommand} = require('@aws-sdk/client-sns');

const dynamoDbClient  = new DynamoDBClient({region:"us-east-1"});
const snsClient = new SNSClient({region:'us-east-1'});

exports.cleanupProducts = async () =>{
    try {

        const tableName = process.env.DYNAMO_TABLE;
        const snsTopicArn = process.env.SNS_TOPIC_ARN;

        const oneHourAgo = new Date(Date.now() -60 *60*1000).toISOString();

        const scanCommand = new ScanCommand({
            TableName: tableName,
            FilterExpression: "createdAt < :oneHourAgo AND attribute_not_exists(imageUrl)",
            ExpressionAttributeValues:{
                ":oneHourAgo": {S: oneHourAgo}// Bind the the timestamp for filtering
            } 
        });

        //Execute the scan command to retrieve matching  items from the database
        const {Items} = await dynamoDbClient.send(scanCommand);

        //if no items are found, return a sucesss response indicating  no clean up was needed
        if(!Items || Items.length===0){
            return {
                statusCode:200,
                body: JSON.stringify({message: "No products found for cleanup"}),
            };
        }

        //intialize a counter to track the number of deleted products
        let deletedCount = 0;

        //Iterate over each outdated products and delete it from the database
        for(const item of Items){
            //Create a delete command  using the category unique identifier(fileName)
            const deleteCommand = new DeleteItemCommand({
                TableName: tableName,
                Key: {id: {S: item.id.S}}//Delete using  the primary key
            });

            //Execute the deleted operation
            await dynamoDbClient.send(deleteCommand);
            deletedCount++; //Increament the count of deleted items
        }
        
    
        //send an SNS noticafication after deleting products
        const snsMessage =  `Cleanup completed. Deleted ${deletedCount} outdated products`;
     
        await snsClient.send(
            new PublishCommand({
                TopicArn: snsTopicArn,
                Message: snsMessage,
                Subject: "Product cleanup Notification",
            })
        );

        //return a success response with the total number of deleted products
        return {
            statusCode:200,
            body: JSON.stringify({message: "Clean up completed", deletedCount}),
        };
    } catch (error) {
        return {
            statusCode:500,
            body: JSON.stringify({error:error.message}),
        };
    }
}