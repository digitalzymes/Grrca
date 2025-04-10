const autocannon = require('autocannon');

// Replace with your actual blog ID from the database for the single blog test
const blogId = '67ed1874a65c86c70f2937e7';

// Test cases
const tests = [
  {
    title: 'GET all blogs',
    url: 'https://grrca.vercel.app/api/blogs',
    method: 'GET',
  },
  {
    title: 'GET single blog',
    url: `https://grrca.vercel.app/api/blogs/${blogId}`,
    method: 'GET',
  }
];

// Function to run benchmark
async function runBenchmark(test) {
  console.log(`\nRunning benchmark: ${test.title}\n`);

  const instance = autocannon({
    url: test.url,
    method: test.method,
    connections: 100, // concurrent connections
    duration: 10, // test duration in seconds
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (result) => {
    console.log(`\nBenchmark finished: ${test.title}`);
    console.log(result);
  });
}

// Run all tests sequentially
(async () => {
  for (const test of tests) {
    await runBenchmark(test);
  }
})();
