import { S3Client, PutBucketPolicyCommand } from '@aws-sdk/client-s3';
import 'dotenv/config';

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.AWS_REGION;
const ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;

if (!BUCKET || !REGION || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('Error: S3_BUCKET, AWS_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY environment variables must be set.');
  process.exit(1);
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

async function makeFramesPublic() {
  console.log(`🔓 Making frames publicly accessible in bucket: ${BUCKET}`);
  
  const bucketPolicy = {
    Version: '2012-10-17',
    Statement: [
      {
        Sid: 'PublicReadFrames',
        Effect: 'Allow',
        Principal: '*',
        Action: 's3:GetObject',
        Resource: `arn:aws:s3:::${BUCKET}/frames/*`
      }
    ]
  };

  try {
    await s3.send(new PutBucketPolicyCommand({
      Bucket: BUCKET,
      Policy: JSON.stringify(bucketPolicy)
    }));
    
    console.log('✅ Bucket policy updated successfully!');
    console.log('📋 Policy details:');
    console.log('   - Public read access granted for: frames/*');
    console.log('   - No authentication required');
    console.log('   - No expiration time');
    console.log('   - Direct S3 URLs will work');
    
  } catch (error) {
    console.error('❌ Error updating bucket policy:', error);
  }
}

makeFramesPublic();
