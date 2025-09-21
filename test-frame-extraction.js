import FormData from 'form-data';
import fs from 'fs';

async function testFrameExtraction() {
  try {
    console.log('🧪 Testing video frame extraction...');
    
    // Check if we have a test video file
    const testVideoPath = 'IMG_4171.MOV';
    if (!fs.existsSync(testVideoPath)) {
      console.log('❌ Test video file not found. Creating a simple test...');
      
      // Create a minimal test with curl instead
      console.log('📝 Testing with curl command...');
      console.log('Run this command to test:');
      console.log(`curl -X POST https://video-frame-service-production.up.railway.app/api/frames \\`);
      console.log(`  -F "video=@${testVideoPath}" \\`);
      console.log(`  -F "intervalSeconds=2" \\`);
      console.log(`  -F "format=jpg" \\`);
      console.log(`  -F "quality=2"`);
      return;
    }
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath));
    formData.append('intervalSeconds', '2');
    formData.append('format', 'jpg');
    formData.append('quality', '2');
    
    console.log('📤 Sending request to Railway...');
    const response = await fetch('https://video-frame-service-production.up.railway.app/api/frames', {
      method: 'POST',
      body: formData,
      headers: formData.getHeaders()
    });
    
    if (!response.ok) {
      console.error('❌ Request failed:', response.status, response.statusText);
      const errorText = await response.text();
      console.error('Error details:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Frame extraction successful!');
    console.log('📊 Result:', {
      jobId: result.jobId,
      count: result.count,
      sampleFrameUrl: result.frames?.[0]?.substring(0, 100) + '...'
    });
    
    // Test if the first frame URL is accessible
    if (result.frames && result.frames.length > 0) {
      console.log('🔗 Testing first frame URL...');
      const frameResponse = await fetch(result.frames[0]);
      console.log('Frame URL status:', frameResponse.status);
      
      if (frameResponse.ok) {
        console.log('✅ Frame URL is accessible!');
      } else {
        console.log('❌ Frame URL is not accessible:', frameResponse.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFrameExtraction();
