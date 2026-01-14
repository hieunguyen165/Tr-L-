import { KeywordTrack, Project, User, Transaction, MonthlyBudget, Account } from '../types';

const STORAGE_KEY_KEYWORDS = 'seo_rank_tracker_data';
const STORAGE_KEY_PROJECTS = 'seo_rank_tracker_projects';
const STORAGE_KEY_USERS = 'seo_rank_tracker_users';
const STORAGE_KEY_TRANSACTIONS = 'finance_transactions';
const STORAGE_KEY_BUDGETS = 'finance_budgets';
const STORAGE_KEY_ACCOUNTS = 'finance_accounts';

// --- PROJECTS ---
export const saveProjects = (projects: Project[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error("Failed to save projects", e);
  }
};

export const loadProjects = (): Project[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PROJECTS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load projects", e);
    return [];
  }
};

export const createNewProject = (name: string, domain: string): Project => {
  return {
    id: crypto.randomUUID(),
    name,
    domain,
    createdAt: Date.now()
  };
};

// --- KEYWORDS ---
export const saveKeywords = (keywords: KeywordTrack[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_KEYWORDS, JSON.stringify(keywords));
  } catch (e) {
    console.error("Failed to save keywords", e);
  }
};

export const loadKeywords = (): KeywordTrack[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_KEYWORDS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load keywords", e);
    return [];
  }
};

export const createNewKeyword = (keyword: string, domain: string, projectId: string): KeywordTrack => {
  return {
    id: crypto.randomUUID(),
    projectId,
    keyword,
    domain,
    currentRank: 0,
    lastChecked: null,
    history: [],
    isUpdating: false
  };
};

// --- USER MANAGEMENT ---

const ROOT_ADMIN: User = {
  id: 'root-admin',
  username: 'Xuanhieufi',
  password: 'Thienhy99', // Default password
  fullName: 'Xuân Hiếu (Admin)',
  role: 'admin',
  createdAt: Date.now()
};

export const loadUsers = (): User[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_USERS);
    let users: User[] = data ? JSON.parse(data) : [];
    
    // Ensure Root Admin always exists
    const rootExists = users.find(u => u.username === ROOT_ADMIN.username);
    if (!rootExists) {
      users = [ROOT_ADMIN, ...users];
      saveUsers(users); // Persist initial seed
    } else {
       // Optional: Ensure root password is reset to default if needed or keep persistence
       // For this logic, we respect the stored data if it exists.
    }
    return users;
  } catch (e) {
    console.error("Failed to load users", e);
    return [ROOT_ADMIN];
  }
};

export const saveUsers = (users: User[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save users", e);
  }
};

export const addUser = (user: Omit<User, 'id' | 'createdAt'>): User => {
  const users = loadUsers();
  if (users.some(u => u.username === user.username)) {
    throw new Error('Tên đăng nhập đã tồn tại');
  }

  const newUser: User = {
    ...user,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  };

  const updatedUsers = [...users, newUser];
  saveUsers(updatedUsers);
  return newUser;
};

export const deleteUser = (userId: string) => {
  const users = loadUsers();
  // Prevent deleting the root admin or yourself (handled in UI usually)
  const userToDelete = users.find(u => u.id === userId);
  if (userToDelete?.username === ROOT_ADMIN.username) {
     throw new Error('Không thể xóa tài khoản Admin gốc');
  }

  const updatedUsers = users.filter(u => u.id !== userId);
  saveUsers(updatedUsers);
};

export const authenticateUser = (username: string, password: string): User | null => {
  const users = loadUsers();
  const found = users.find(u => u.username === username && u.password === password);
  return found || null;
};

// --- FINANCE ---

export const saveTransactions = (transactions: Transaction[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(transactions));
  } catch (e) {
    console.error("Failed to save transactions", e);
  }
};

export const loadTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveBudgets = (budgets: MonthlyBudget[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_BUDGETS, JSON.stringify(budgets));
  } catch (e) {
    console.error("Failed to save budgets", e);
  }
};

export const loadBudgets = (): MonthlyBudget[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_BUDGETS);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveAccounts = (accounts: Account[]) => {
  try {
    localStorage.setItem(STORAGE_KEY_ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error("Failed to save accounts", e);
  }
};

export const loadAccounts = (): Account[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ACCOUNTS);
    if (!data) {
      // Default accounts seeding if empty
      const defaults: Account[] = [
        { id: 'cash-default', name: 'Tiền mặt', type: 'cash', balance: 0, color: '#10b981' }, // Green
        { id: 'bank-default', name: 'Ngân hàng chính', type: 'bank', balance: 0, color: '#3b82f6' } // Blue
      ];
      return defaults;
    }
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};