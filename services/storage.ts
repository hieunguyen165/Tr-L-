import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch,
  serverTimestamp,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { KeywordTrack, Project, Transaction, MonthlyBudget, Account, User } from '../types';

// Collections
const COL_PROJECTS = 'projects';
const COL_KEYWORDS = 'keywords';
const COL_TRANSACTIONS = 'transactions';
const COL_ACCOUNTS = 'accounts';
const COL_BUDGETS = 'budgets';
const COL_USERS = 'users';

// Helper to get current user ID
const getUserId = () => {
  if (!auth.currentUser) throw new Error("User not authenticated");
  return auth.currentUser.uid;
};

// --- DATA MIGRATION (Local -> Firebase) ---
export const migrateLocalDataToFirebase = async () => {
  const userId = auth.currentUser?.uid;
  if (!userId) return;

  // Check if we have local data to migrate
  const localProjectsStr = localStorage.getItem('seo_rank_tracker_projects');
  if (!localProjectsStr) return; // No local data or already migrated/cleared

  const batch = writeBatch(db);
  let operationCount = 0;

  try {
    // 1. Migrate Projects
    const projects: Project[] = JSON.parse(localProjectsStr);
    projects.forEach(p => {
      const ref = doc(collection(db, COL_PROJECTS));
      batch.set(ref, { ...p, userId, id: ref.id }); // Use new ID or keep old? Best to let Firestore gen ID but map it. 
      // Simplified: We just upload as new documents.
      operationCount++;
    });

    // 2. Migrate Keywords
    const keywordsStr = localStorage.getItem('seo_rank_tracker_data');
    if (keywordsStr) {
      const keywords: KeywordTrack[] = JSON.parse(keywordsStr);
      keywords.forEach(k => {
        const ref = doc(collection(db, COL_KEYWORDS));
        batch.set(ref, { ...k, userId, id: ref.id });
        operationCount++;
      });
    }

    // 3. Migrate Finance
    const txStr = localStorage.getItem('finance_transactions');
    if (txStr) {
      const txs: Transaction[] = JSON.parse(txStr);
      txs.forEach(t => {
        const ref = doc(collection(db, COL_TRANSACTIONS));
        batch.set(ref, { ...t, userId, id: ref.id });
        operationCount++;
      });
    }

    const accStr = localStorage.getItem('finance_accounts');
    if (accStr) {
      const accs: Account[] = JSON.parse(accStr);
      accs.forEach(a => {
        const ref = doc(collection(db, COL_ACCOUNTS));
        batch.set(ref, { ...a, userId, id: ref.id });
        operationCount++;
      });
    }

    if (operationCount > 0) {
      await batch.commit();
      console.log(`Migrated ${operationCount} items to Firebase.`);
      // Clear local storage to prevent duplicate migrations
      localStorage.removeItem('seo_rank_tracker_projects');
      localStorage.removeItem('seo_rank_tracker_data');
      localStorage.removeItem('finance_transactions');
      localStorage.removeItem('finance_accounts');
      localStorage.removeItem('finance_budgets');
      alert("Đã đồng bộ dữ liệu cũ từ máy lên Cloud thành công!");
    }
  } catch (e) {
    console.error("Migration failed", e);
  }
};

// --- REALTIME LISTENERS ---

export const listenToProjects = (callback: (projects: Project[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, COL_PROJECTS), where("userId", "==", auth.currentUser.uid));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Project));
    // Client-side sort if needed, or add orderBy to query (requires index)
    callback(data.sort((a,b) => b.createdAt - a.createdAt));
  });
};

export const listenToKeywords = (callback: (keywords: KeywordTrack[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, COL_KEYWORDS), where("userId", "==", auth.currentUser.uid));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as KeywordTrack));
    callback(data);
  });
};

export const listenToTransactions = (callback: (txs: Transaction[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, COL_TRANSACTIONS), where("userId", "==", auth.currentUser.uid));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
    callback(data.sort((a,b) => b.timestamp - a.timestamp));
  });
};

export const listenToAccounts = (callback: (accs: Account[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, COL_ACCOUNTS), where("userId", "==", auth.currentUser.uid));
  return onSnapshot(q, (snapshot) => {
    let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Account));
    if (data.length === 0) {
        // Seed default accounts if empty
        // createDefaultAccounts(); // Implementation optional, handled in UI usually
    }
    callback(data);
  });
};

export const listenToBudgets = (callback: (budgets: MonthlyBudget[]) => void) => {
  if (!auth.currentUser) return () => {};
  const q = query(collection(db, COL_BUDGETS), where("userId", "==", auth.currentUser.uid));
  return onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ ...doc.data() } as MonthlyBudget));
    callback(data);
  });
};


// --- CRUD OPERATIONS ---

// Projects
export const addProject = async (name: string, domain: string) => {
  const userId = getUserId();
  await addDoc(collection(db, COL_PROJECTS), {
    name, domain, userId, createdAt: Date.now()
  });
};

export const deleteProject = async (id: string) => {
  await deleteDoc(doc(db, COL_PROJECTS, id));
  // Cleanup keywords associated? In a real app yes, here we rely on manual cleanup or cloud functions
  // For now, let's query and delete them client side (not efficient but works for small scale)
  const q = query(collection(db, COL_KEYWORDS), where("projectId", "==", id));
  const snap = await getDocs(q);
  const batch = writeBatch(db);
  snap.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

// Keywords
export const addKeyword = async (keyword: string, domain: string, projectId: string) => {
  const userId = getUserId();
  const newKw: Omit<KeywordTrack, 'id'> & { userId: string } = {
    projectId,
    keyword,
    domain,
    userId,
    currentRank: 0,
    lastChecked: null,
    history: [],
    isUpdating: false
  };
  const ref = await addDoc(collection(db, COL_KEYWORDS), newKw);
  return { ...newKw, id: ref.id };
};

export const updateKeyword = async (id: string, data: Partial<KeywordTrack>) => {
  await updateDoc(doc(db, COL_KEYWORDS, id), data);
};

export const deleteKeyword = async (id: string) => {
  await deleteDoc(doc(db, COL_KEYWORDS, id));
};

// Finance
export const addTransaction = async (tx: Transaction) => {
  const userId = getUserId();
  // Ensure we strip ID if it's auto-generated locally, but firestore handles ID
  const { id, ...data } = tx;
  await addDoc(collection(db, COL_TRANSACTIONS), { ...data, userId });
};

export const deleteTransaction = async (id: string) => {
  await deleteDoc(doc(db, COL_TRANSACTIONS, id));
};

export const updateAccount = async (account: Account) => {
  const { id, ...data } = account;
  if (id.includes('default') && !data.color) { 
      // It's a fresh save of a default account, allow add
      const userId = getUserId();
      await addDoc(collection(db, COL_ACCOUNTS), { ...data, userId });
  } else {
      await updateDoc(doc(db, COL_ACCOUNTS, id), data as any);
  }
};

export const addAccount = async (account: Account) => {
    const userId = getUserId();
    const { id, ...data } = account; 
    await addDoc(collection(db, COL_ACCOUNTS), { ...data, userId });
};

export const deleteAccount = async (id: string) => {
    await deleteDoc(doc(db, COL_ACCOUNTS, id));
};

export const saveBudget = async (budget: MonthlyBudget) => {
    const userId = getUserId();
    // Check if budget exists for this month
    const q = query(collection(db, COL_BUDGETS), where("userId", "==", userId), where("month", "==", budget.month));
    const snap = await getDocs(q);
    
    if (!snap.empty) {
        await updateDoc(snap.docs[0].ref, { limit: budget.limit });
    } else {
        await addDoc(collection(db, COL_BUDGETS), { ...budget, userId });
    }
};

// --- USER MANAGEMENT ---

export const getUsers = async (): Promise<User[]> => {
  const q = query(collection(db, COL_USERS));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const addUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
  // Simple record creation in Firestore. 
  // Note: Passwords stored here for demo compatibility, see types.ts warning.
  await addDoc(collection(db, COL_USERS), {
    ...userData,
    createdAt: Date.now()
  });
};

export const deleteUser = async (id: string) => {
  await deleteDoc(doc(db, COL_USERS, id));
};

// --- USER PROFILE ---
export const loadUserProfile = () => {
    // Just return current auth user basic info
    if (!auth.currentUser) return null;
    return {
        id: auth.currentUser.uid,
        username: auth.currentUser.email || '',
        fullName: auth.currentUser.displayName || 'User',
        role: 'member', // Default, admin logic needs custom claims or specific doc
        createdAt: Date.now()
    } as User;
};

// --- EXPORT/IMPORT ---
export const exportAllData = async (): Promise<string> => {
   try {
     const userId = getUserId();
     const fetchData = async (col: string) => {
        const q = query(collection(db, col), where("userId", "==", userId));
        const snap = await getDocs(q);
        return snap.docs.map(d => d.data());
     };

     const data = {
         projects: await fetchData(COL_PROJECTS),
         keywords: await fetchData(COL_KEYWORDS),
         transactions: await fetchData(COL_TRANSACTIONS),
         accounts: await fetchData(COL_ACCOUNTS),
         budgets: await fetchData(COL_BUDGETS),
         users: [], // Don't export users for privacy/security in this generic function
         exportedAt: Date.now()
     };
     
     return JSON.stringify(data, null, 2);
   } catch (error) {
     console.error("Export failed", error);
     return "";
   }
};

export const importAllData = (json: string) => {
    // Not implemented for Cloud mode to avoid data corruption conflicts
    return false;
};
