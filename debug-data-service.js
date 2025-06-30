// Simple test to verify data service functions work
// This can be run in the browser console

async function testDataService() {
  try {
    console.log('Testing fetchAllSellers...');
    const sellers = await window.fetchAllSellers();
    console.log('Sellers result:', sellers);

    console.log('Testing fetchFarmerRevenueData...');
    const revenue = await window.fetchFarmerRevenueData();
    console.log('Revenue result:', revenue);

    console.log('Testing fetchActivityLogs...');
    const logs = await window.fetchActivityLogs();
    console.log('Activity logs result:', logs);

  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testDataService();