//Importing required s3 modules from AWS SDK
//These are needed to interact with S3 and generate pre-signed Urls
const {S3Client, PutObjectCommand} = require('@aws-sdk/client-s3')
const {getSignedUrl} = require('@aws-sdk/s3-request-presigner');

//Creating an  S3 client instance  with the specified AWS region

const s3Client = new S3Client({region: "us-east-1"});

//Lambda function to generate a pre-signed URl for S3 file  upload
//the Url Allows clients  to securely upload a file to S3 bucket without exposting aws credentials

exports.getUploadUrl = async (event) =>{
    try {
        //Extracting S3 bucket name  from environment  variables
        //The bucket where the file will be uploaded
        const bucketName = process.env.BUCKET_NAME;

        //Parsing the incomming event body to get fileName and fileType
        //FileName: name of the file to  be uploaded
        //FileType: Mime type of the file example png/jpg/jpeg

        const {fileName, fileType} = JSON.parse(event.body);

        //Validating that both fileName and fileType are provided
        //if either is missing , return a 400 bad request 
        if(!fileName || !fileType){
            return{
                statusCode: 400,
                body: JSON.stringify({error:"fileName and fileType are required"}),
            };
        }

        //Creating an S3 PutObjectCommand with bucket, key(fileName), and content  type
        //this defines the S3 object that will be created/updated by the file uploade
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