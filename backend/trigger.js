async function testAPI() {
  console.log('Sending URL to the API...');
  
  // 1. Send the POST request to your Express server
  const response = await fetch('http://localhost:5000/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      url: 'https://psalms-luxe-laundry.vercel.app/', 
      device: 'desktop' // Try changing this to 'tablet' or 'mobile' later!
    })
  });
  
  const data = await response.json();
  console.log('API accepted the job:', data);
  const jobId = data.jobId;

  console.log('\nChecking status...');
  
  // 2. Ask the API for an update every 2 seconds
  const timer = setInterval(async () => {
    const statusRes = await fetch(`http://localhost:5000/job-status/${jobId}`);
    const statusData = await statusRes.json();
    
    console.log(`State: ${statusData.state} | Progress: ${statusData.progress || 0}%`);
    
    // 3. Stop checking if it is finished or failed
    if (statusData.state === 'completed') {
      console.log('\nSuccess! Video is ready at:');
      console.log(statusData.result.videoUrl);
      clearInterval(timer);
    } else if (statusData.state === 'failed') {
      console.log('\nJob failed!');
      clearInterval(timer);
    }
  }, 2000);
}

testAPI();