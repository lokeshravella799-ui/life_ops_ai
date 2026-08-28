const workflowEngine = require('../src/orchestrator/workflowEngine');
const db = require('../src/config/supabase');

async function testTravelGoal() {
  console.log('Testing dynamic goal execution for: "i wanted to travel to america tell me plans"...\n');

  // Create a test user in local store
  const user = await db.createAuthUser('traveler@lifeops.ai', 'Password123!', {
    full_name: 'Alex Traveler'
  });

  const result = await workflowEngine.orchestrateGoal({
    userId: user.id,
    goalText: 'i wanted to travel to america tell me plans',
    category: 'TRAVEL',
    targetDays: 10,
    dailyHours: 3
  });

  console.log('\n=================== VERIFICATION RESULT ===================');
  console.log('Workflow Title:', result.workflow.title);
  console.log('Category:', result.workflow.result_data.category);
  console.log('Verification Status:', result.verification.status);
  console.log('Verification Score:', result.verification.score);
  console.log('Total Tasks Generated:', result.tasks.length);
  console.log('Generated Tasks:');
  result.tasks.forEach(t => {
    console.log(`- [Day ${t.day_number}] [${t.priority}] ${t.title}`);
  });
  console.log('===========================================================\n');
}

testTravelGoal().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
