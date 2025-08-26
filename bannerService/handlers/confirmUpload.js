const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamoDbClient = new DynamoDBClient({ region: "us-east-1" });

exports.confirmUpload = async (event) => {
  try {
    const tableName = process.env.DYNAMO_TABLE;
    const bucketName = process.env.BUCKET_NAME;

    const record = event.Records[0];
    const fileName = record.s3.object.key;

    const imageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;

    const putItemCommand = new PutItemCommand({
      TableName: tableName,
      Item: {
        fileName: { S: fileName },
        imageUrl: { S: imageUrl },
        uploadedAt: { S: new Date().toISOString() },
      }
    });

    await dynamoDbClient.send(putItemCommand);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "File uploaded & confirmed" })
    };
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
