import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// Configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyBdFuIVrTKDjPjcUHKzUk9cBXK3VwobItU",
  authDomain: "quanlylophoc-1fc26.firebaseapp.com",
  projectId: "quanlylophoc-1fc26",
  storageBucket: "quanlylophoc-1fc26.firebasestorage.app",
  messagingSenderId: "325807308272",
  appId: "1:325807308272:web:9d30a494ef44a25405b135"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Collection root for the application
const COLLECTION_NAME = "edu_track_ai";

// Legacy single-document reference kept for backward compatibility
export const STATE_DOC_REF = doc(db, COLLECTION_NAME, "app_state");

// Chunk size for assessments array (each document stays ~90 KB, far below the 1MB Firestore limit)
const ASSESSMENTS_CHUNK_SIZE = 300;

/**
 * Robust helper to load the full application state from Firestore.
 * Supports both multi-document chunked storage (new, unlimited scalability)
 * and legacy single-document storage (backward compatibility).
 */
export async function loadStateFromFirestore(): Promise<any | null> {
  try {
    // 1. Check if the new chunked meta document exists
    const metaDocRef = doc(db, COLLECTION_NAME, "meta");
    const lessonsDocRef = doc(db, COLLECTION_NAME, "lessons");
    const studentsDocRef = doc(db, COLLECTION_NAME, "students");
    const timelineDocRef = doc(db, COLLECTION_NAME, "timeline");
    const manifestDocRef = doc(db, COLLECTION_NAME, "assessments_manifest");

    const [metaSnap, lessonsSnap, studentsSnap, timelineSnap, manifestSnap] = await Promise.all([
      getDoc(metaDocRef),
      getDoc(lessonsDocRef),
      getDoc(studentsDocRef),
      getDoc(timelineDocRef),
      getDoc(manifestDocRef)
    ]);

    if (metaSnap.exists()) {
      const metaData = metaSnap.data() || {};
      const lessonsData = lessonsSnap.exists() ? lessonsSnap.data() : {};
      const studentsData = studentsSnap.exists() ? studentsSnap.data() : {};
      const timelineData = timelineSnap.exists() ? timelineSnap.data() : {};

      // Load all assessment chunks in parallel
      const chunkCount = manifestSnap.exists() ? (manifestSnap.data()?.chunkCount || 0) : 0;
      let allAssessments: any[] = [];

      if (chunkCount > 0) {
        const chunkPromises: Promise<any>[] = [];
        for (let i = 0; i < chunkCount; i++) {
          chunkPromises.push(getDoc(doc(db, COLLECTION_NAME, `assessments_part_${i}`)));
        }
        const chunkSnaps = await Promise.all(chunkPromises);
        for (const snap of chunkSnaps) {
          if (snap.exists()) {
            const list = snap.data()?.list;
            if (Array.isArray(list)) {
              allAssessments.push(...list);
            }
          }
        }
      }

      return {
        schoolYears: metaData.schoolYears || [],
        grades: metaData.grades || [],
        classes: metaData.classes || [],
        settings: metaData.settings || {},
        comments: metaData.comments || [],
        scores: metaData.scores || [],
        wheelRecords: metaData.wheelRecords || [],
        lessons: lessonsData.lessons || [],
        students: studentsData.students || [],
        timeline: timelineData.timeline || [],
        assessments: allAssessments
      };
    }

    // 2. Fallback to legacy single document if chunked meta is not yet created
    const legacySnap = await getDoc(STATE_DOC_REF);
    if (legacySnap.exists()) {
      return legacySnap.data();
    }
  } catch (error) {
    console.warn("Could not load state from Firestore, falling back to local storage:", error);
  }
  return null;
}

/**
 * Robust helper to save state to Firestore using multi-document chunking.
 * Completely avoids Firestore's 1MB document size limit by dividing large collections
 * (assessments, students, timeline, lessons, and meta) into separate, lightweight documents.
 */
export async function saveStateToFirestore(state: any): Promise<boolean> {
  if (!state) return false;

  try {
    const assessments: any[] = state.assessments || [];
    const chunks: any[][] = [];
    for (let i = 0; i < assessments.length; i += ASSESSMENTS_CHUNK_SIZE) {
      chunks.push(assessments.slice(i, i + ASSESSMENTS_CHUNK_SIZE));
    }

    const now = Date.now();

    // 1. Core metadata document
    const metaDocRef = doc(db, COLLECTION_NAME, "meta");
    const metaPromise = setDoc(metaDocRef, {
      schoolYears: state.schoolYears || [],
      grades: state.grades || [],
      classes: state.classes || [],
      settings: state.settings || {},
      comments: state.comments || [],
      scores: state.scores || [],
      wheelRecords: state.wheelRecords || [],
      updatedAt: now
    });

    // 2. Lessons document
    const lessonsDocRef = doc(db, COLLECTION_NAME, "lessons");
    const lessonsPromise = setDoc(lessonsDocRef, {
      lessons: state.lessons || [],
      updatedAt: now
    });

    // 3. Students document
    const studentsDocRef = doc(db, COLLECTION_NAME, "students");
    const studentsPromise = setDoc(studentsDocRef, {
      students: state.students || [],
      updatedAt: now
    });

    // 4. Timeline document
    const timelineDocRef = doc(db, COLLECTION_NAME, "timeline");
    const timelinePromise = setDoc(timelineDocRef, {
      timeline: state.timeline || [],
      updatedAt: now
    });

    // 5. Assessments manifest document
    const manifestDocRef = doc(db, COLLECTION_NAME, "assessments_manifest");
    const manifestPromise = setDoc(manifestDocRef, {
      chunkCount: chunks.length,
      totalCount: assessments.length,
      updatedAt: now
    });

    // 6. Assessment chunk documents
    const chunkPromises = chunks.map((chunk, index) =>
      setDoc(doc(db, COLLECTION_NAME, `assessments_part_${index}`), {
        index,
        list: chunk,
        count: chunk.length,
        updatedAt: now
      })
    );

    // Execute all chunked writes in parallel
    await Promise.all([
      metaPromise,
      lessonsPromise,
      studentsPromise,
      timelinePromise,
      manifestPromise,
      ...chunkPromises
    ]);

    return true;
  } catch (error) {
    console.error("Could not save chunked state to Firestore:", error);
    return false;
  }
}
