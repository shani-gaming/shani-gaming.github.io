const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function createYesterdaySnapshot() {
  console.log('Creating yesterday snapshot without Thallyium and Osmondo...\n');

  // Get all current members
  const snapshot = await db.collection('guild-members').get();

  if (snapshot.empty) {
    console.log('No members found in database.');
    return;
  }

  // Filter out Thallyium and Osmondo
  const yesterdayMembers = [];
  const excludedMembers = ['Thallyium-archimonde', 'Osmondo-hyjal'];

  snapshot.forEach(doc => {
    const memberId = doc.id;
    if (!excludedMembers.includes(memberId)) {
      const member = doc.data();
      yesterdayMembers.push({
        name: member.name,
        realm: member.realm,
        level: member.level,
        classId: member.classId,
        class: member.class,
        rank: member.rank
      });
    } else {
      console.log(`Excluded: ${memberId}`);
    }
  });

  // Create snapshot for yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().split('T')[0];

  await db.collection('guild-roster-snapshots').doc(yesterdayKey).set({
    timestamp: yesterday.getTime(),
    memberCount: yesterdayMembers.length,
    members: yesterdayMembers
  });

  console.log(`\n✓ Created snapshot for ${yesterdayKey}`);
  console.log(`  Members: ${yesterdayMembers.length}`);
  console.log(`  Excluded: Thallyium, Osmondo`);
  console.log('\nNow run the syncGuildRoster function to detect them as new members!');
}

createYesterdaySnapshot()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
