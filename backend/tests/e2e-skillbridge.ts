import { runMarketResearchAgent } from '../src/agents/marketResearch.agent.ts';
import { runCompetitorAnalysisAgent } from '../src/agents/competitorAnalysis.agent.ts';
import { env } from '../src/config/env.ts';

async function testSkillBridge() {
  console.log('Testing SkillBridge E2E integration with Tavily...');
  console.log(`TAVILY_API_KEY Configured: ${!!env.TAVILY_API_KEY}`);

  const project = {
    name: 'SkillBridge',
    startupIdea: 'AI-powered platform connecting college students with short-term internships, freelance projects, and practical work opportunities from startups, MSMEs, agencies and local businesses.',
    proposedSolution: 'AI matches students with opportunities based on skills, interests, education, location and availability while helping businesses find suitable student talent.',
    targetCustomers: 'College students aged 18–25, startups, MSMEs, local businesses and agencies.',
    location: { country: 'India', scope: 'Maharashtra', locations: ['Maharashtra', 'Tier-2 cities', 'Tier-3 cities'] },
    analysisDepth: 'standard' as const
  };

  const analysisId = '6ac53506335ba8e2e77139fa'; // mock mongo id

  try {
    console.log('\n--- Running Market Research Agent ---');
    const marketResult = await runMarketResearchAgent(project, analysisId);
    console.log(`Market Score: ${marketResult.score}`);
    console.log(`Research Available: ${marketResult.isResearchAvailable}`);
    console.log(`Number of Verified Sources: ${marketResult.sources.length}`);
    marketResult.sources.forEach((s, i) => console.log(`  Source ${i+1}: ${s.title} (${s.url})`));

    console.log('\n--- Running Competitor Agent ---');
    const compResult = await runCompetitorAnalysisAgent(project, analysisId);
    console.log(`Competitor Score: ${compResult.score}`);
    console.log(`Number of Verified Sources: ${compResult.sources.length}`);
    compResult.sources.forEach((s, i) => console.log(`  Source ${i+1}: ${s.title} (${s.url})`));

    console.log('\nE2E SkillBridge Test Completed.');
  } catch (err) {
    console.error('Error during E2E test:', err);
  }
}

testSkillBridge();
