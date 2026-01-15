const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Use Europe region to match Firestore location (eur3)
const europeRegion = functions.region('europe-west1');

// Helper: Check if user is admin
async function isAdmin(uid) {
    const creatorDoc = await db.collection('creators').doc(uid).get();
    return creatorDoc.exists && creatorDoc.data().isAdmin === true;
}

// Helper: Update creator deck count
async function updateCreatorDeckCount(creatorId) {
    const snapshot = await db.collection('decks')
        .where('creatorId', '==', creatorId)
        .get();
    await db.collection('creators').doc(creatorId).update({
        deckCount: snapshot.size
    });
}

/**
 * Create a new creator (admin only)
 * Creates Firebase Auth user + Firestore document
 */
exports.createCreator = europeRegion.https.onCall(async (data, context) => {
    // Verify caller is authenticated
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    // Verify caller is admin
    if (!(await isAdmin(context.auth.uid))) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can create creators');
    }

    const { email, password, name } = data;

    if (!email || !password || !name) {
        throw new functions.https.HttpsError('invalid-argument', 'Email, password and name are required');
    }

    try {
        // Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: name
        });

        // Create Firestore document with uid as document ID
        await db.collection('creators').doc(userRecord.uid).set({
            name: name,
            email: email,
            deckCount: 0,
            isAdmin: false,
            createdAt: new Date().toISOString()
        });

        return { success: true, uid: userRecord.uid };
    } catch (error) {
        console.error('Error creating creator:', error);
        // Return more specific error messages
        if (error.code === 'auth/email-already-exists') {
            throw new functions.https.HttpsError('already-exists', 'E-postadressen används redan');
        } else if (error.code === 'auth/invalid-email') {
            throw new functions.https.HttpsError('invalid-argument', 'Ogiltig e-postadress');
        } else if (error.code === 'auth/weak-password') {
            throw new functions.https.HttpsError('invalid-argument', 'Lösenordet är för svagt');
        }
        throw new functions.https.HttpsError('internal', error.message || error.code || 'Unknown error');
    }
});

/**
 * Delete a creator (admin only)
 * Deletes Firebase Auth user + Firestore document
 */
exports.deleteCreator = europeRegion.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    if (!(await isAdmin(context.auth.uid))) {
        throw new functions.https.HttpsError('permission-denied', 'Only admins can delete creators');
    }

    const { creatorId } = data;

    if (!creatorId) {
        throw new functions.https.HttpsError('invalid-argument', 'Creator ID is required');
    }

    // Prevent deleting yourself
    if (creatorId === context.auth.uid) {
        throw new functions.https.HttpsError('invalid-argument', 'Cannot delete yourself');
    }

    try {
        // Delete Firebase Auth user (may not exist for legacy creators)
        try {
            await admin.auth().deleteUser(creatorId);
        } catch (authError) {
            // Ignore if user doesn't exist in Auth (legacy creator)
            if (authError.code !== 'auth/user-not-found') {
                throw authError;
            }
            console.log('Auth user not found, deleting Firestore document only');
        }

        // Delete Firestore document
        await db.collection('creators').doc(creatorId).delete();

        return { success: true };
    } catch (error) {
        console.error('Error deleting creator:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Save (create or update) a deck
 * Verifies ownership for updates
 */
exports.saveDeck = europeRegion.https.onCall(async (data, context) => {
    console.log('saveDeck called with data:', JSON.stringify(data));
    console.log('Auth context:', context.auth ? `uid=${context.auth.uid}` : 'not authenticated');

    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { deckId, deckData, isEdit } = data;
    const uid = context.auth.uid;

    console.log('Processing deck:', deckId, 'isEdit:', isEdit, 'uid:', uid);

    if (!deckId || !deckData) {
        throw new functions.https.HttpsError('invalid-argument', 'Deck ID and data are required');
    }

    // Validate deck ID format for new decks
    if (!isEdit && !/^[a-z0-9-]+$/.test(deckId)) {
        throw new functions.https.HttpsError('invalid-argument', 'Deck ID can only contain lowercase letters, numbers and hyphens');
    }

    // Get creator info
    const creatorDoc = await db.collection('creators').doc(uid).get();
    if (!creatorDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Creator profile not found');
    }
    const creatorData = creatorDoc.data();

    // For new decks, check ID doesn't exist
    if (!isEdit) {
        const existingDeck = await db.collection('decks').doc(deckId).get();
        if (existingDeck.exists) {
            throw new functions.https.HttpsError('already-exists', 'A deck with this ID already exists');
        }
    }

    // For edits, verify ownership
    if (isEdit) {
        const existingDeck = await db.collection('decks').doc(deckId).get();
        if (!existingDeck.exists) {
            throw new functions.https.HttpsError('not-found', 'Deck not found');
        }
        if (existingDeck.data().creatorId !== uid) {
            throw new functions.https.HttpsError('permission-denied', 'You can only edit your own decks');
        }
    }

    // Build deck object
    const deck = {
        name: deckData.name,
        subtitle: deckData.subtitle || '',
        icon: deckData.icon || '🃏',
        backgroundColor: deckData.backgroundColor,
        textColor: deckData.textColor,
        public: deckData.public !== false,
        cards: deckData.cards || [],
        creatorId: uid,
        creatorName: creatorData.name,
        updatedAt: new Date().toISOString()
    };

    if (!isEdit) {
        deck.createdAt = new Date().toISOString();
    }

    try {
        console.log('Saving deck to Firestore...');
        await db.collection('decks').doc(deckId).set(deck, { merge: true });
        console.log('Deck saved, updating deck count...');
        await updateCreatorDeckCount(uid);
        console.log('Done!');
        return { success: true, deckId };
    } catch (error) {
        console.error('Error saving deck:', error);
        console.error('Error stack:', error.stack);
        throw new functions.https.HttpsError('internal', error.message || 'Unknown error saving deck');
    }
});

/**
 * Delete a deck
 * Verifies ownership or admin status
 */
exports.deleteDeck = europeRegion.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }

    const { deckId } = data;
    const uid = context.auth.uid;

    if (!deckId) {
        throw new functions.https.HttpsError('invalid-argument', 'Deck ID is required');
    }

    // Get deck to check ownership
    const deckDoc = await db.collection('decks').doc(deckId).get();
    if (!deckDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Deck not found');
    }

    const deckOwnerId = deckDoc.data().creatorId;
    const userIsAdmin = await isAdmin(uid);

    // Check if user can delete (owner or admin)
    if (deckOwnerId !== uid && !userIsAdmin) {
        throw new functions.https.HttpsError('permission-denied', 'You can only delete your own decks');
    }

    try {
        await db.collection('decks').doc(deckId).delete();

        // Update the deck owner's deck count
        if (deckOwnerId) {
            await updateCreatorDeckCount(deckOwnerId);
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting deck:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
