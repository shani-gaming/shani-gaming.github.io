const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp();
const db = getFirestore();

async function addTestMembers() {
  const now = Date.now();
  const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);
  const fiveDaysAgo = now - (5 * 24 * 60 * 60 * 1000);
  const tenDaysAgo = now - (10 * 24 * 60 * 60 * 1000);

  const testMembers = [
    {
      name: 'Aramis',
      realm: 'hyjal',
      level: 80,
      classId: 1,
      class: 'Warrior',
      rank: 5,
      joinedAt: twoDaysAgo,
      lastSeen: now
    },
    {
      name: 'Celestria',
      realm: 'hyjal',
      level: 80,
      classId: 5,
      class: 'Priest',
      rank: 5,
      joinedAt: fiveDaysAgo,
      lastSeen: now
    },
    {
      name: 'Thornblade',
      realm: 'hyjal',
      level: 80,
      classId: 11,
      class: 'Druid',
      rank: 5,
      joinedAt: tenDaysAgo,
      lastSeen: now
    }
  ];

  for (const member of testMembers) {
    const memberKey = `${member.name}-${member.realm}`;
    await db.collection('guild-members').doc(memberKey).set(member);
    console.log(`Added test member: ${member.name} (joined ${Math.floor((now - member.joinedAt) / (24 * 60 * 60 * 1000))} days ago)`);
  }

  console.log('\nTest data added successfully!');
  console.log('You can now check the homepage to see the "Bienvenue" widget with these members.');
}

addTestMembers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error adding test data:', error);
    process.exit(1);
  });
