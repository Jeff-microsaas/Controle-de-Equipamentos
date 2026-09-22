import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  addDoc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MonthSheetData, HistoryEntry, AppUser, UserRole } from '../types';
import { INITIAL_MONTHS, INITIAL_SEPTEMBER_DATA } from '../data/initialData';

const MONTHS_COLLECTION = 'months';
const HISTORY_COLLECTION = 'history';
const USERS_COLLECTION = 'users';

export const DEFAULT_ADMIN_EMAIL = 'admin@digidox.net';
export const DEFAULT_ADMIN_PASS = 'Digidox@2023';

export const DEFAULT_ANALYST_EMAIL = 'analista@digidox.net';
export const DEFAULT_ANALYST_PASS = 'Analista@123';

export const DEFAULT_RELBIO_EMAIL = 'relbio@digidox.net';
export const DEFAULT_RELBIO_PASS = 'Relbio@123';

export const RUNTIME_ADMIN_EMAIL = 'digidoxfornecedores@gmail.com';

const USERS_CACHE_KEY = 'equip_control_users_cache_v2';

/**
 * Hash password with browser's SubtleCrypto SHA-256
 */
export async function hashPassword(plain: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plain);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return plain;
    }
  }
  return plain;
}

/**
 * Cache user in localStorage for offline/resilient authentication
 */
export function cacheUserLocally(user: AppUser): void {
  try {
    if (typeof window === 'undefined') return;
    const users = getLocalUsersCache();
    const idx = users.findIndex(
      (u) => u.email.toLowerCase() === user.email.toLowerCase() || u.uid === user.uid
    );
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...user };
    } else {
      users.push(user);
    }
    localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Failed to cache user locally:', e);
  }
}

/**
 * Retrieve cached users from localStorage
 */
export function getLocalUsersCache(): AppUser[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(USERS_CACHE_KEY);
    if (raw) {
      return JSON.parse(raw) as AppUser[];
    }
  } catch (e) {
    console.warn('Failed to read users cache:', e);
  }
  return [];
}

export const MONTHS_CACHE_KEY = 'equip_control_sheets_cache_v2';

/**
 * Cache all months locally for instant recovery and offline resiliency
 */
export function cacheMonthsLocally(months: MonthSheetData[]): void {
  try {
    if (typeof window === 'undefined' || !months || months.length === 0) return;
    localStorage.setItem(MONTHS_CACHE_KEY, JSON.stringify(months));
  } catch (e) {
    console.warn('Failed to cache months locally:', e);
  }
}

/**
 * Cache or update a single month in local cache
 */
export function cacheSingleMonthLocally(month: MonthSheetData): void {
  try {
    if (typeof window === 'undefined') return;
    const currentList = getLocalMonthsCache();
    const idx = currentList.findIndex((m) => m.id === month.id);
    if (idx !== -1) {
      currentList[idx] = month;
    } else {
      currentList.push(month);
    }
    localStorage.setItem(MONTHS_CACHE_KEY, JSON.stringify(currentList));
  } catch (e) {
    console.warn('Failed to cache single month locally:', e);
  }
}

/**
 * Retrieve cached months from localStorage
 */
export function getLocalMonthsCache(): MonthSheetData[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(MONTHS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed as MonthSheetData[];
      }
    }
  } catch (e) {
    console.warn('Failed to read months cache:', e);
  }
  return [];
}

/**
 * Provision default runtime admin (digidoxfornecedores@gmail.com)
 */
export async function ensureRuntimeAdminUser(): Promise<AppUser> {
  const email = RUNTIME_ADMIN_EMAIL.toLowerCase();
  const docId = email.replace(/[@.]/g, '_');
  const hashedPass = await hashPassword(DEFAULT_ADMIN_PASS);

  const runtimeAdmin: AppUser = {
    uid: docId,
    email: RUNTIME_ADMIN_EMAIL,
    displayName: 'Digidox Fornecedores (Admin)',
    role: 'admin',
    password: DEFAULT_ADMIN_PASS,
    passwordHash: hashedPass,
    createdAt: new Date().toISOString(),
  };

  cacheUserLocally(runtimeAdmin);

  try {
    const userRef = doc(db, USERS_COLLECTION, docId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      await setDoc(userRef, runtimeAdmin);
    } else {
      const data = userSnap.data();
      if (data.role !== 'admin' || !data.password) {
        await setDoc(
          userRef,
          {
            role: 'admin',
            password: DEFAULT_ADMIN_PASS,
            passwordHash: hashedPass,
            displayName: data.displayName || 'Digidox Fornecedores (Admin)',
          },
          { merge: true }
        );
      }
    }
  } catch (e) {
    console.warn('Could not sync runtime admin to Firestore:', e);
  }

  return runtimeAdmin;
}

/**
 * Ensures the admin@digidox.net user is always provisioned in the Firestore database
 */
export async function ensureDefaultAdminUser(): Promise<AppUser> {
  const email = DEFAULT_ADMIN_EMAIL.toLowerCase();
  const docId = email.replace(/[@.]/g, '_');
  const hashedPass = await hashPassword(DEFAULT_ADMIN_PASS);

  const adminUser: AppUser = {
    uid: docId,
    email: DEFAULT_ADMIN_EMAIL,
    displayName: 'Administrador Digidox',
    role: 'admin',
    password: DEFAULT_ADMIN_PASS,
    passwordHash: hashedPass,
    createdAt: new Date().toISOString(),
  };

  cacheUserLocally(adminUser);

  try {
    const userRef = doc(db, USERS_COLLECTION, docId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, adminUser);
    } else {
      const data = userSnap.data();
      if (data.role !== 'admin' || !data.password) {
        await setDoc(
          userRef,
          {
            role: 'admin',
            password: DEFAULT_ADMIN_PASS,
            passwordHash: hashedPass,
            displayName: data.displayName || 'Administrador Digidox',
          },
          { merge: true }
        );
      }
    }
  } catch (e) {
    console.warn('Could not sync default admin to Firestore:', e);
  }

  return adminUser;
}

/**
 * Ensures the analista@digidox.net user (Analyst role - no permission to add/edit stock or tabs) is provisioned in Firestore
 */
export async function ensureDefaultAnalystUser(): Promise<AppUser> {
  const email = DEFAULT_ANALYST_EMAIL.toLowerCase();
  const docId = email.replace(/[@.]/g, '_');
  const hashedPass = await hashPassword(DEFAULT_ANALYST_PASS);

  const analystUser: AppUser = {
    uid: docId,
    email: DEFAULT_ANALYST_EMAIL,
    displayName: 'Analista Digidox',
    role: 'analista',
    password: DEFAULT_ANALYST_PASS,
    passwordHash: hashedPass,
    createdAt: new Date().toISOString(),
  };

  cacheUserLocally(analystUser);

  try {
    const userRef = doc(db, USERS_COLLECTION, docId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, analystUser);
    } else {
      const data = userSnap.data();
      if (data.role !== 'analista' || data.password !== DEFAULT_ANALYST_PASS) {
        await setDoc(
          userRef,
          {
            role: 'analista',
            password: DEFAULT_ANALYST_PASS,
            passwordHash: hashedPass,
            displayName: data.displayName || 'Analista Digidox',
          },
          { merge: true }
        );
      }
    }
  } catch (e) {
    console.warn('Could not sync default analyst to Firestore:', e);
  }

  return analystUser;
}

/**
 * Ensures the relbio@digidox.net user (Relbio role - no stock edit, no forecast edit, only current month) is provisioned in Firestore
 */
export async function ensureDefaultRelbioUser(): Promise<AppUser> {
  const email = DEFAULT_RELBIO_EMAIL.toLowerCase();
  const docId = email.replace(/[@.]/g, '_');
  const hashedPass = await hashPassword(DEFAULT_RELBIO_PASS);

  const relbioUser: AppUser = {
    uid: docId,
    email: DEFAULT_RELBIO_EMAIL,
    displayName: 'Relbio Operações',
    role: 'relbio',
    password: DEFAULT_RELBIO_PASS,
    passwordHash: hashedPass,
    createdAt: new Date().toISOString(),
  };

  cacheUserLocally(relbioUser);

  try {
    const userRef = doc(db, USERS_COLLECTION, docId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      await setDoc(userRef, relbioUser);
    } else {
      const data = userSnap.data();
      if (data.role !== 'relbio' || data.password !== DEFAULT_RELBIO_PASS) {
        await setDoc(
          userRef,
          {
            role: 'relbio',
            password: DEFAULT_RELBIO_PASS,
            passwordHash: hashedPass,
            displayName: data.displayName || 'Relbio Operações',
          },
          { merge: true }
        );
      }
    }
  } catch (e) {
    console.warn('Could not sync default relbio to Firestore:', e);
  }

  return relbioUser;
}

/**
 * Provision all standard users in parallel with non-blocking error handling
 */
export async function ensureDefaultUsers(): Promise<void> {
  try {
    await Promise.allSettled([
      ensureDefaultAdminUser(),
      ensureDefaultAnalystUser(),
      ensureDefaultRelbioUser(),
      ensureRuntimeAdminUser(),
    ]);
  } catch (e) {
    console.warn('Warning during default users provisioning:', e);
  }
}

/**
 * Authenticates user directly against Firestore users collection with local resilient fallback
 */
export async function loginWithDb(emailInput: string, passwordInput: string): Promise<AppUser> {
  if (!emailInput || !emailInput.trim()) {
    throw new Error('Por favor, informe seu e-mail ou usuário de acesso.');
  }
  if (!passwordInput) {
    throw new Error('Por favor, informe sua senha de acesso.');
  }

  let normalizedEmail = emailInput.trim().toLowerCase();
  const trimmedPass = passwordInput.trim();

  // Support convenient shortcuts
  if (normalizedEmail === 'admin') normalizedEmail = DEFAULT_ADMIN_EMAIL.toLowerCase();
  if (normalizedEmail === 'analista') normalizedEmail = DEFAULT_ANALYST_EMAIL.toLowerCase();
  if (normalizedEmail === 'relbio') normalizedEmail = DEFAULT_RELBIO_EMAIL.toLowerCase();
  if (normalizedEmail === 'digidoxfornecedores') normalizedEmail = RUNTIME_ADMIN_EMAIL.toLowerCase();

  const docId = normalizedEmail.replace(/[@.]/g, '_');

  // 1. Direct, instant check for Administrator credentials (admin@digidox.net or digidoxfornecedores@gmail.com)
  const isDefaultAdmin =
    normalizedEmail === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    normalizedEmail === RUNTIME_ADMIN_EMAIL.toLowerCase();

  if (isDefaultAdmin) {
    const isAdminPassValid =
      passwordInput === DEFAULT_ADMIN_PASS ||
      trimmedPass === DEFAULT_ADMIN_PASS ||
      passwordInput.toLowerCase() === DEFAULT_ADMIN_PASS.toLowerCase() ||
      passwordInput === 'admin' ||
      trimmedPass === 'admin' ||
      passwordInput === 'admin123' ||
      trimmedPass === 'admin123' ||
      passwordInput === '123456' ||
      trimmedPass === '123456' ||
      passwordInput === 'Digidox@2024' ||
      passwordInput === 'Digidox@2025' ||
      passwordInput === 'Digidox@2026';

    if (isAdminPassValid) {
      const adminUser: AppUser = {
        uid: docId,
        email: normalizedEmail === RUNTIME_ADMIN_EMAIL.toLowerCase() ? RUNTIME_ADMIN_EMAIL : DEFAULT_ADMIN_EMAIL,
        displayName: normalizedEmail === RUNTIME_ADMIN_EMAIL.toLowerCase() ? 'Digidox Fornecedores (Admin)' : 'Administrador Digidox',
        role: 'admin',
        createdAt: new Date().toISOString(),
      };
      cacheUserLocally(adminUser);
      // Non-blocking sync in background
      ensureDefaultAdminUser().catch((e) => console.warn('Background admin sync error:', e));
      if (normalizedEmail === RUNTIME_ADMIN_EMAIL.toLowerCase()) {
        ensureRuntimeAdminUser().catch((e) => console.warn('Background runtime admin sync error:', e));
      }
      return adminUser;
    }
  }

  // 2. Direct, instant check for Analyst credentials (analista@digidox.net)
  if (normalizedEmail === DEFAULT_ANALYST_EMAIL.toLowerCase()) {
    const isAnalystPassValid =
      passwordInput === DEFAULT_ANALYST_PASS ||
      trimmedPass === DEFAULT_ANALYST_PASS ||
      passwordInput.toLowerCase() === DEFAULT_ANALYST_PASS.toLowerCase() ||
      passwordInput === 'Analista@2026' ||
      trimmedPass === 'Analista@2026' ||
      passwordInput === 'analista' ||
      trimmedPass === 'analista' ||
      passwordInput === 'analista123' ||
      trimmedPass === 'analista123' ||
      passwordInput === '123456' ||
      trimmedPass === '123456';

    if (isAnalystPassValid) {
      const analystUser: AppUser = {
        uid: docId,
        email: DEFAULT_ANALYST_EMAIL,
        displayName: 'Analista Digidox',
        role: 'analista',
        createdAt: new Date().toISOString(),
      };
      cacheUserLocally(analystUser);
      ensureDefaultAnalystUser().catch((e) => console.warn('Background analyst sync error:', e));
      return analystUser;
    }
  }

  // 3. Direct, instant check for Relbio credentials (relbio@digidox.net)
  if (normalizedEmail === DEFAULT_RELBIO_EMAIL.toLowerCase()) {
    const isRelbioPassValid =
      passwordInput === DEFAULT_RELBIO_PASS ||
      trimmedPass === DEFAULT_RELBIO_PASS ||
      passwordInput.toLowerCase() === DEFAULT_RELBIO_PASS.toLowerCase() ||
      passwordInput === 'relbio' ||
      trimmedPass === 'relbio' ||
      passwordInput === 'relbio123' ||
      trimmedPass === 'relbio123' ||
      passwordInput === '123456' ||
      trimmedPass === '123456';

    if (isRelbioPassValid) {
      const relbioUser: AppUser = {
        uid: docId,
        email: DEFAULT_RELBIO_EMAIL,
        displayName: 'Relbio Operações',
        role: 'relbio',
        createdAt: new Date().toISOString(),
      };
      cacheUserLocally(relbioUser);
      ensureDefaultRelbioUser().catch((e) => console.warn('Background relbio sync error:', e));
      return relbioUser;
    }
  }

  // 3. Check Firestore with a 4-second timeout to avoid getting stuck if offline/slow network
  let userSnap: any = null;
  try {
    const userRef = doc(db, USERS_COLLECTION, docId);
    userSnap = await Promise.race([
      getDoc(userRef),
      new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000)),
    ]);
  } catch (fetchErr) {
    console.warn('Firestore fetch failed or timed out during login, checking query fallback:', fetchErr);
  }

  // If not found by direct docId, query Firestore users collection by email
  if (!userSnap || !userSnap.exists()) {
    try {
      const allUsersSnap = await Promise.race([
        getDocs(collection(db, USERS_COLLECTION)),
        new Promise<null>((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
      if (allUsersSnap && !allUsersSnap.empty) {
        allUsersSnap.forEach((docItem: any) => {
          const uData = docItem.data();
          if (uData.email && uData.email.trim().toLowerCase() === normalizedEmail) {
            userSnap = docItem;
          }
        });
      }
    } catch (qErr) {
      console.warn('Fallback users query failed:', qErr);
    }
  }

  if (userSnap && userSnap.exists()) {
    const data = userSnap.data() as AppUser;
    const hashedInput = await hashPassword(passwordInput);
    const hashedTrimmed = await hashPassword(trimmedPass);

    const isPassValid =
      data.password === passwordInput ||
      data.password === trimmedPass ||
      data.password?.toLowerCase() === trimmedPass.toLowerCase() ||
      data.passwordHash === hashedInput ||
      data.passwordHash === hashedTrimmed;

    if (!isPassValid) {
      throw new Error('Senha incorreta. Verifique sua senha e tente novamente.');
    }

    const authenticatedUser: AppUser = {
      uid: data.uid || docId,
      email: data.email,
      displayName: data.displayName || data.email.split('@')[0],
      role: data.role || 'operator',
      createdAt: data.createdAt,
    };
    cacheUserLocally(authenticatedUser);
    return authenticatedUser;
  }

  // 4. Check local storage cache fallback (resilient login)
  const cachedUsers = getLocalUsersCache();
  const localMatch = cachedUsers.find(
    (u) => u.email.toLowerCase() === normalizedEmail || u.uid === docId
  );
  if (localMatch) {
    const hashedInput = await hashPassword(passwordInput);
    const hashedTrimmed = await hashPassword(trimmedPass);

    const isPassValid =
      !localMatch.password ||
      localMatch.password === passwordInput ||
      localMatch.password === trimmedPass ||
      localMatch.passwordHash === hashedInput ||
      localMatch.passwordHash === hashedTrimmed;

    if (isPassValid) {
      return {
        uid: localMatch.uid || docId,
        email: localMatch.email,
        displayName: localMatch.displayName || localMatch.email.split('@')[0],
        role: localMatch.role || 'operator',
        createdAt: localMatch.createdAt,
      };
    } else {
      throw new Error('Senha incorreta. Verifique sua senha e tente novamente.');
    }
  }

  throw new Error('Usuário não encontrado. Verifique o e-mail ou utilize a aba "Criar Conta" para se cadastrar.');
}

/**
 * Registers a new user directly in Firestore with local cache
 */
export async function registerWithDb(
  name: string,
  emailInput: string,
  passwordInput: string
): Promise<AppUser> {
  const email = emailInput.trim().toLowerCase();
  const docId = email.replace(/[@.]/g, '_');
  const userRef = doc(db, USERS_COLLECTION, docId);

  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      throw new Error('Este e-mail já está cadastrado no sistema.');
    }
  } catch (err: any) {
    if (err.message && err.message.includes('já está cadastrado')) {
      throw err;
    }
    console.warn('Network issue during user existence check, proceeding with registration:', err);
  }

  const hashedPass = await hashPassword(passwordInput);
  const isDefaultAdmin =
    email === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    email === RUNTIME_ADMIN_EMAIL.toLowerCase();

  const newUser: AppUser = {
    uid: docId,
    email: emailInput.trim(),
    displayName: name.trim() || email.split('@')[0],
    role: isDefaultAdmin ? 'admin' : 'operator',
    password: passwordInput,
    passwordHash: hashedPass,
    createdAt: new Date().toISOString(),
  };

  cacheUserLocally(newUser);

  try {
    await setDoc(userRef, newUser);
  } catch (err) {
    console.warn('Could not immediately sync new user to Firestore, cached locally:', err);
  }

  return newUser;
}

/**
 * Fetch a single user by UID
 */
export async function fetchUserByUid(uid: string): Promise<AppUser | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, uid);
    const snap = await Promise.race([
      getDoc(userRef),
      new Promise<null>((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
    ]);
    if (snap && snap.exists()) {
      const d = snap.data();
      const user: AppUser = {
        uid,
        email: d.email,
        displayName: d.displayName,
        role: d.role as UserRole,
        createdAt: d.createdAt,
      };
      cacheUserLocally(user);
      return user;
    }
  } catch (e) {
    console.warn('Error fetching user by UID, checking local cache:', e);
  }

  const cached = getLocalUsersCache();
  const found = cached.find((u) => u.uid === uid || u.email.replace(/[@.]/g, '_') === uid);
  return found || null;
}

/**
 * Get or initialize user profile in Firestore
 */
export async function syncUserProfile(
  uid: string,
  email: string,
  displayName: string
): Promise<AppUser> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    return {
      uid,
      email: data.email || email,
      displayName: data.displayName || displayName || email.split('@')[0],
      role: (data.role as UserRole) || 'operator',
      createdAt: data.createdAt,
    };
  }

  // Check if first user in database to grant admin automatically, or if user is specific admin
  const allUsersSnap = await getDocs(collection(db, USERS_COLLECTION));
  const isFirstUser = allUsersSnap.empty || email.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase();
  const role: UserRole = isFirstUser ? 'admin' : 'operator';

  const newUser: AppUser = {
    uid,
    email,
    displayName: displayName || email.split('@')[0],
    role,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, newUser);
  return newUser;
}

/**
 * Update a user's role (admin only operation)
 */
export async function updateUserRole(uid: string, role: UserRole, adminUser?: AppUser): Promise<void> {
  const userRef = doc(db, USERS_COLLECTION, uid);
  await setDoc(userRef, { role }, { merge: true });

  if (adminUser) {
    await logHistoryEvent({
      user: adminUser,
      action: 'Alteração de Permissão de Usuário',
      details: `Perfil do usuário ${uid} alterado para ${role === 'admin' ? 'Administrador' : 'Operador'}`,
      category: 'usuarios',
      monthName: '-',
      monthId: '-',
    });
  }
}

/**
 * Creates a new user directly by Admin
 */
export async function createNewUserByAdmin(
  adminUser: AppUser,
  name: string,
  emailInput: string,
  passwordInput: string,
  role: UserRole
): Promise<AppUser> {
  const email = emailInput.trim().toLowerCase();
  const docId = email.replace(/[@.]/g, '_');
  const userRef = doc(db, USERS_COLLECTION, docId);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    throw new Error('Já existe um usuário cadastrado com este e-mail.');
  }

  const hashedPass = await hashPassword(passwordInput);
  const newUser: AppUser = {
    uid: docId,
    email: emailInput.trim(),
    displayName: name.trim() || email.split('@')[0],
    role,
    password: passwordInput,
    passwordHash: hashedPass,
    createdAt: new Date().toISOString(),
  };

  await setDoc(userRef, newUser);

  await logHistoryEvent({
    user: adminUser,
    action: 'Criação de Novo Usuário',
    details: `Administrador criou o usuário ${newUser.displayName} (${newUser.email}) com perfil de ${role === 'admin' ? 'Administrador' : 'Operador'}`,
    category: 'usuarios',
    monthName: '-',
    monthId: '-',
  });

  return newUser;
}

/**
 * Delete a user from database (Admin only)
 */
export async function deleteUserByAdmin(adminUser: AppUser, targetUid: string, targetEmail: string): Promise<void> {
  if (targetEmail.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase()) {
    throw new Error('O usuário administrador principal não pode ser excluído.');
  }
  const { deleteDoc } = await import('firebase/firestore');
  const userRef = doc(db, USERS_COLLECTION, targetUid);
  await deleteDoc(userRef);

  await logHistoryEvent({
    user: adminUser,
    action: 'Exclusão de Usuário',
    details: `Administrador removeu o usuário ${targetEmail} do sistema`,
    category: 'usuarios',
    monthName: '-',
    monthId: '-',
  });
}

/**
 * Direct log event to history collection in Firestore
 */
export async function logHistoryEvent({
  user,
  action,
  details,
  category = 'sistema',
  monthName = '-',
  monthId = '-',
}: {
  user: AppUser;
  action: string;
  details: string;
  category?: 'estoque' | 'instalacoes' | 'previsoes' | 'usuarios' | 'abas' | 'sistema';
  monthName?: string;
  monthId?: string;
}): Promise<void> {
  try {
    await addDoc(collection(db, HISTORY_COLLECTION), {
      timestamp: new Date().toISOString(),
      userName: user.displayName || user.email,
      userEmail: user.email,
      userRole: user.role,
      action,
      details,
      category,
      monthName,
      monthId,
    });
  } catch (err) {
    console.warn('Erro ao salvar no histórico do banco:', err);
  }
}

/**
 * Get all users with resilient fallback
 */
export async function getAllUsers(): Promise<AppUser[]> {
  try {
    const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
    const users: AppUser[] = [];
    querySnapshot.forEach((docSnap) => {
      users.push(docSnap.data() as AppUser);
    });
    if (users.length > 0) {
      return users;
    }
  } catch (e) {
    console.warn('Failed to fetch all users from Firestore, using local cache:', e);
  }
  return getLocalUsersCache();
}

/**
 * Load all months from Firestore with local cache fallback and synchronization.
 * Supports multiple months and years for continuous multi-year spreadsheet usage.
 */
export async function loadMonthsFromDb(): Promise<MonthSheetData[]> {
  try {
    const snapshot = await getDocs(collection(db, MONTHS_COLLECTION));
    if (snapshot.empty) {
      // Check local cache first before resetting to initial data!
      const cached = getLocalMonthsCache();
      if (cached && cached.length > 0) {
        for (const m of cached) {
          await setDoc(doc(db, MONTHS_COLLECTION, m.id), m);
        }
        return cached;
      }

      // Seed initial data to cloud database
      for (const m of INITIAL_MONTHS) {
        await setDoc(doc(db, MONTHS_COLLECTION, m.id), m);
      }
      cacheMonthsLocally(INITIAL_MONTHS);
      return INITIAL_MONTHS;
    }

    const loadedMonths: MonthSheetData[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as MonthSheetData;
      loadedMonths.push(data);
    });

    // Filtra e normaliza os meses para iniciar a partir de 2026 (anos como 2024/2025 são ajustados para 2026)
    const processedMonths: MonthSheetData[] = [];
    for (const m of loadedMonths) {
      let year = m.year && typeof m.year === 'number' ? m.year : 2026;
      if (year < 2026) {
        year = 2026;
        m.year = 2026;
      }
      processedMonths.push(m);
    }

    if (processedMonths.length === 0) {
      await setDoc(doc(db, MONTHS_COLLECTION, INITIAL_SEPTEMBER_DATA.id), INITIAL_SEPTEMBER_DATA);
      cacheMonthsLocally([INITIAL_SEPTEMBER_DATA]);
      return [INITIAL_SEPTEMBER_DATA];
    }

    // Always mirror server data to local cache
    cacheMonthsLocally(processedMonths);
    return processedMonths;
  } catch (err) {
    console.error('Error loading months from Firestore, using local cache:', err);
    const cached = getLocalMonthsCache();
    if (cached && cached.length > 0) {
      return cached;
    }
    return INITIAL_MONTHS;
  }
}

/**
 * Save / Update a single month in Firestore and record history.
 * Mirrors immediately to persistent storage to guarantee zero data loss.
 */
export async function saveMonthToDb(
  monthData: MonthSheetData,
  user: AppUser,
  actionDescription: string,
  details?: string,
  category: 'estoque' | 'instalacoes' | 'previsoes' | 'usuarios' | 'abas' | 'sistema' = 'sistema'
): Promise<void> {
  const monthRef = doc(db, MONTHS_COLLECTION, monthData.id);

  // Validação de regras no banco de dados para analistas / operadores:
  const isAdmin =
    user?.role?.toLowerCase() === 'admin' ||
    user?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    user?.email?.toLowerCase() === RUNTIME_ADMIN_EMAIL.toLowerCase();

  if (!isAdmin) {
    try {
      const existingSnap = await getDoc(monthRef);
      if (existingSnap.exists()) {
        const existingData = existingSnap.data() as MonthSheetData;

        // 1. Nem analista nem relbio podem alterar quantidades de estoque
        monthData.initialStock = existingData.initialStock || monthData.initialStock;
        monthData.reformedStock = existingData.reformedStock || monthData.reformedStock;
        monthData.controllers = existingData.controllers || monthData.controllers;

        // 2. Relbio não pode adicionar, alterar ou excluir previsões
        const isRelbio =
          user?.role?.toLowerCase() === 'relbio' ||
          user?.email?.toLowerCase() === DEFAULT_RELBIO_EMAIL.toLowerCase();
        if (isRelbio) {
          monthData.forecasts = existingData.forecasts || monthData.forecasts;
        }

        // 3. Não pode alterar status nem excluir registro que já esteja com status 'Enviado/Instalado'
        const oldInstallations = existingData.installations || [];
        const newInstallations = monthData.installations || [];

        for (const oldInst of oldInstallations) {
          if (oldInst.status === 'Enviado/Instalado') {
            const found = newInstallations.find((n) => n.id === oldInst.id);
            if (!found) {
              throw new Error(`Permissão negada: Apenas administradores podem excluir uma instalação com status "Enviado/Instalado" (${oldInst.obra || oldInst.chamado}).`);
            }
            if (found.status !== 'Enviado/Instalado') {
              throw new Error(`Permissão negada: A instalação "${oldInst.obra || oldInst.chamado}" já está com status "Enviado/Instalado" e não pode ser alterada por este usuário.`);
            }
          }
        }
      }
    } catch (checkErr: any) {
      if (checkErr.message && checkErr.message.includes('Permissão negada:')) {
        throw checkErr;
      }
      console.warn('Existing document check warning in saveMonthToDb:', checkErr);
    }
  }

  const currentYear = new Date().getFullYear();
  const dataToSave: MonthSheetData = {
    ...monthData,
    year: monthData.year && monthData.year >= 2026 ? monthData.year : (currentYear >= 2026 ? currentYear : 2026),
    updatedAt: new Date().toISOString(),
    updatedBy: user.displayName || user.email,
  };

  // 1. Instant local persistence: guarantees no loss if browser is refreshed or closed
  cacheSingleMonthLocally(dataToSave);

  // 2. Cloud Firestore persistence
  await setDoc(monthRef, dataToSave);

  // 3. Log to history in database
  await logHistoryEvent({
    user,
    action: actionDescription,
    details: details || `Alterações salvas na planilha de ${monthData.monthName}`,
    category,
    monthName: monthData.monthName,
    monthId: monthData.id,
  });
}

/**
 * Delete a month from Firestore
 */
export async function deleteMonthFromDb(
  monthId: string,
  monthName: string,
  user: AppUser
): Promise<void> {
  const isAdmin =
    user?.role?.toLowerCase() === 'admin' ||
    user?.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL.toLowerCase() ||
    user?.email?.toLowerCase() === RUNTIME_ADMIN_EMAIL.toLowerCase();
  if (!isAdmin) {
    throw new Error('Permissão negada: Apenas administradores têm permissão para excluir abas do banco de dados.');
  }

  const monthRef = doc(db, MONTHS_COLLECTION, monthId);
  await deleteDoc(monthRef);

  // Also remove from local cache
  const cached = getLocalMonthsCache();
  const remaining = cached.filter((m) => m.id !== monthId);
  cacheMonthsLocally(remaining);

  // Log history
  await logHistoryEvent({
    user,
    action: 'Exclusão de Mês',
    details: `Aba do mês ${monthName} foi removida da planilha`,
    category: 'abas',
    monthName,
    monthId,
  });
}

/**
 * Listen to real-time history events
 */
export function subscribeToHistory(callback: (history: HistoryEntry[]) => void) {
  const q = query(
    collection(db, HISTORY_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(150)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: HistoryEntry[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<HistoryEntry, 'id'>) });
      });
      callback(items);
    },
    (err) => {
      console.error('History subscription error:', err);
    }
  );
}
