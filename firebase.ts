import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

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
export const COLLECTION_NAME = "edu_track_ai";

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
 * Non-destructive Multi-Device Save:
 * Fetches existing remote lessons and assessments before saving, merging them so
 * lessons and evaluations performed on different devices (phones, tablets, other PCs)
 * are NEVER clobbered or lost!
 */
export async function saveStateToFirestore(state: any, options: { mergeWithRemote?: boolean } = { mergeWithRemote: true }): Promise<{ success: boolean; mergedLessons?: any[]; mergedAssessments?: any[] }> {
  if (!state) return { success: false };

  try {
    let finalLessons: any[] = state.lessons || [];
    let finalAssessments: any[] = state.assessments || [];

    if (options.mergeWithRemote) {
      try {
        const lessonsDocRef = doc(db, COLLECTION_NAME, "lessons");
        const manifestDocRef = doc(db, COLLECTION_NAME, "assessments_manifest");
        const [remoteLessonsSnap, manifestSnap] = await Promise.all([
          getDoc(lessonsDocRef),
          getDoc(manifestDocRef)
        ]);

        // 1. Merge Lessons across devices
        if (remoteLessonsSnap.exists()) {
          const remoteLessons: any[] = remoteLessonsSnap.data()?.lessons || [];
          const lessonMap = new Map<string, any>();
          
          // Seed with remote lessons (preserves lessons created on other devices)
          remoteLessons.forEach(l => {
            if (l && l.id) lessonMap.set(l.id, l);
          });
          
          // Apply local lessons
          finalLessons.forEach(l => {
            if (l && l.id) {
              const existing = lessonMap.get(l.id);
              if (!existing) {
                lessonMap.set(l.id, l);
              } else {
                lessonMap.set(l.id, { ...existing, ...l });
              }
            }
          });
          finalLessons = Array.from(lessonMap.values());
        }

        // 2. Merge Assessments across devices
        if (manifestSnap.exists()) {
          const chunkCount = manifestSnap.data()?.chunkCount || 0;
          if (chunkCount > 0) {
            const chunkPromises: Promise<any>[] = [];
            for (let i = 0; i < chunkCount; i++) {
              chunkPromises.push(getDoc(doc(db, COLLECTION_NAME, `assessments_part_${i}`)));
            }
            const chunkSnaps = await Promise.all(chunkPromises);
            const remoteAssessments: any[] = [];
            for (const snap of chunkSnaps) {
              if (snap.exists() && Array.isArray(snap.data()?.list)) {
                remoteAssessments.push(...snap.data().list);
              }
            }

            if (remoteAssessments.length > 0) {
              const assessMap = new Map<string, any>();
              // Keep all remote assessments from other lessons/devices
              remoteAssessments.forEach(a => {
                if (a && a.id) assessMap.set(a.id, a);
                else if (a && a.lessonId && a.studentId) assessMap.set(`${a.lessonId}_${a.studentId}`, a);
              });
              // Apply local assessments
              finalAssessments.forEach(a => {
                if (a && a.id) assessMap.set(a.id, a);
                else if (a && a.lessonId && a.studentId) assessMap.set(`${a.lessonId}_${a.studentId}`, a);
              });
              finalAssessments = Array.from(assessMap.values());
            }
          }
        }
      } catch (mergeErr) {
        console.warn("Could not merge with remote Firestore before save, continuing with local snapshot:", mergeErr);
      }
    }

    const chunks: any[][] = [];
    for (let i = 0; i < finalAssessments.length; i += ASSESSMENTS_CHUNK_SIZE) {
      chunks.push(finalAssessments.slice(i, i + ASSESSMENTS_CHUNK_SIZE));
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

    // 2. Lessons document (Cross-Device Merged)
    const lessonsDocRef = doc(db, COLLECTION_NAME, "lessons");
    const lessonsPromise = setDoc(lessonsDocRef, {
      lessons: finalLessons,
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
      totalCount: finalAssessments.length,
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

    return {
      success: true,
      mergedLessons: finalLessons,
      mergedAssessments: finalAssessments
    };
  } catch (error) {
    console.error("Could not save chunked state to Firestore:", error);
    return { success: false };
  }
}

/**
 * Setup Real-time Multi-Device Sync:
 * Listens for lessons updates made on other devices and triggers callback.
 */
export function setupRealtimeSync(onLessonsUpdate: (remoteLessons: any[]) => void): () => void {
  try {
    const lessonsDocRef = doc(db, COLLECTION_NAME, "lessons");
    const unsubscribe = onSnapshot(lessonsDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data && Array.isArray(data.lessons)) {
          onLessonsUpdate(data.lessons);
        }
      }
    }, (error) => {
      console.warn("Firestore realtime sync listener warning:", error);
    });
    return unsubscribe;
  } catch (e) {
    console.warn("Could not initialize Firestore realtime sync:", e);
    return () => {};
  }
}

