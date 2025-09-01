//Importing required s3 modules from AWS SDK
//These are needed to interact with S3 and generate pre-signed Urls
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')
const {getSignedUrl} = require('@aws-sdk/s3-request-presigner');
const {DynamoDBClient, PutItemCommand} = require('@aws-sdk/client-dynamodb');
const {v4: uuid} = require("uuid");

//Creating an  S3 client instance  with the specified AWS region

const s3Client = new S3Client({region: "us-east-1"});
const dyanamoDbClient = new DynamoDBClient({region:"us-east-1"});

//Lambda function to generate a pre-signed URl for S3 file  upload
//the Url Allows clients  to securely upload a file to S3 bucket without exposting aws credentials

exports.getUploadUrl = async (event) =>{
    try {
        //Extracting S3 bucket name  from environment  variables
        //The bucket where the file will be uploaded
        const bucketName = process.env.BUCKET_NAME;

        //Extract email from Cognito JWT Claims

        const email = event.requestContext.authorizer.jwt.claims.email;

        //Parsing the incomming event body to get fileName and fileType
        //FileName: name of the file to  be uploaded
        //FileType: Mime type of the file example png/jpg/jpeg

        const {fileName, fileType,productName, productPrice, description, quantity,category} = JSON.parse(event.body);

        //Validating that both fileName and fileType are provided
        //if either is missing , return a 400 bad request 
        if(!fileName || !fileType  || !productName || !productPrice
            || !description || !quantity || !category
        ) {
            return{
                statusCode: 400,
                body: JSON.stringify({error:"all fields are required"}),
            };
        }

        //Creating an S3 PutObjectCommand with bucket, key(fileName), and content  type
        //this defines the S3 object that will be created/updated by the file upload

        const command = new PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            ContentType: fileType,
        });

        //Generating a pre-signed url that expires in 3600 seconds(1hour)
        //this url allows the client to upload the file directly to s3

        const signedUrl = await getSignedUrl(s3Client, command,{expiresIn:3600});
        
        //returning the generated pre-signed url in the response
        //client uses this url to perform the actual  file upload 

        //Save category Details in dynamoDb(Only fileName and categoryName)
        const productId = uuid();
        const putItemCommand = new PutItemCommand({
            TableName: process.env.DYNAMO_TABLE,
            Item: {
                id: {S: productId},
                fileName: { S: fileName },
                productName: { S: productName },
                category: { S: category },
                productPrice: {N: productPrice.toString()},
                description: {S: description},
                quantity: {N: quantity.toString()},
                email: {S: email},
                isApproved: {BOOL: false},
                createdAt: { S: new Date().toISOString() },
            }
        });
        
        await dyanamoDbClient.send(putItemCommand);

        return{
            statusCode:200,
            body:JSON.stringify({uploadUrl:signedUrl}),
        };
     
    } catch (error) {
        return{
            statusCode:500,
            body:JSON.stringify({error:error.message}),
        };
    }
}