const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function checkMembers() {
  console.log('Checking for members in guild-members collection...\n');

  // Check for Thallyium and Osmondo
  const membersToCheck = ['thallyium', 'osmondo'];

  // Get all documents in guild-members collection
  const snapshot = await db.collection('guild-members').get();

  if (snapshot.empty) {
    console.log('No members found in the database.');
    return;
  }

  console.log(`Total members in database: ${snapshot.size}\n`);
  console.log('Recent members (joined in last 14 days):\n');

  const fourteenDaysAgo = Date.now() - (14 * 24 * 60 * 60 * 1000);
  let recentCount = 0;

  snapshot.forEach(doc => {
    const member = doc.data();
    const memberKey = doc.id;

    // Check if this is one of the members we're looking for
    const isTarget = membersToCheck.some(name => memberKey.toLowerCase().includes(name));

    if (member.joinedAt >= fourteenDaysAgo || isTarget) {
      const daysAgo = Math.floor((Date.now() - member.joinedAt) / (24 * 60 * 60 * 1000));
      const marker = isTarget ? ' ⭐' : '';

      console.log(`${marker} ${member.name} (${member.class})`);
      console.log(`   Key: ${memberKey}`);
      console.log(`   Joined: ${new Date(member.joinedAt).toLocaleString('fr-FR')} (${daysAgo} days ago)`);
      console.log(`   Realm: ${member.realm}, Level: ${member.level}, Rank: ${member.rank}\n`);

      recentCount++;
    }
  });

  if (recentCount === 0) {
    console.log('No members joined in the last 14 days.\n');
  }

  // Specifically check for the two players
  console.log('\n--- Specific checks ---');
  for (const name of membersToCheck) {
    const found = [];
    snapshot.forEach(doc => {
      if (doc.id.toLowerCase().includes(name)) {
        found.push({ key: doc.id, data: doc.data() });
      }
    });

    if (found.length > 0) {
      console.log(`✓ ${name.charAt(0).toUpperCase() + name.slice(1)} found (${found.length} match(es))`);
      found.forEach(m => console.log(`  - ${m.key}`));
    } else {
      console.log(`✗ ${name.charAt(0).toUpperCase() + name.slice(1)} NOT found`);
    }
  }
}

checkMembers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error checking members:', error);
    process.exit(1);
  });
