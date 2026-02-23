const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function makeAdmin(email) {
    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;

        // Set the Custom Auth Claim
        await admin.auth().setCustomUserClaims(uid, {
            admin: true
        });

        console.log(`Successfully granted Admin Custom Claim to user ${email} (${uid})!`);
        console.log('NOTE: The user may need to log out and log back in to refresh their token.');
    } catch (error) {
        console.log('Error making user admin:', error);
    } finally {
        process.exit(0);
    }
}

// Get email from command line args
const targetEmail = process.argv[2];

if (!targetEmail) {
    console.log('Please provide an email address as an argument.');
    console.log('Usage: node make-admin.js <email>');
    process.exit(1);
}

makeAdmin(targetEmail);
