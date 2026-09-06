import { create } from 'zustand';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  runTransaction, 
  collection, 
  addDoc, 
  serverTimestamp, 
  arrayUnion, 
  arrayRemove 
} from 'firebase/firestore';
import { auth, db } from '../firebase';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  walletBalance: number;
  rewardPoints: number;
  addresses: Array<{
    id: string;
    label: string;
    address: string;
    lat: number;
    lng: number;
  }>;
  welcomeBonusClaimed: boolean;
  createdAt: any;
  fcmToken?: string;
}

interface AuthStore {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  initialized: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  quickPhoneLogin: (name: string, phone: string) => void;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  addAddress: (label: string, address: string, lat: number, lng: number) => Promise<void>;
  deleteAddress: (addressId: string) => Promise<void>;
  deductWalletBalance: (amount: number, orderId: string) => Promise<void>;
  addWalletBalance: (amount: number, reason: string) => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // Sync profile document with Firestore and credit ₹50 welcome bonus atomically
  const syncProfile = async (firebaseUser: User) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    
    try {
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userDocRef);
        
        if (!userDoc.exists()) {
          // New User Registration
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || localStorage.getItem('moms_magic_user_name') || 'Guest User',
            email: firebaseUser.email || '',
            phone: firebaseUser.phoneNumber || localStorage.getItem('moms_magic_user_phone') || '',
            walletBalance: 0,
            rewardPoints: 0,
            addresses: [],
            welcomeBonusClaimed: false,
            createdAt: new Date().toISOString()
          };

          transaction.set(userDocRef, newProfile);
          set({ profile: newProfile });
        } else {
          // Existing User - Retrieve profile
          const data = userDoc.data() as UserProfile;
          set({ profile: data });
        }
      });
    } catch (error) {
      console.warn('Error syncing profile document via transaction, attempting fallback read:', error);
      // Fallback read if transaction fails
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          set({ profile: docSnap.data() as UserProfile });
          return;
        }
      } catch (readErr) {
        console.warn('Fallback Firestore read failed:', readErr);
      }
      
      // Resilient fallback: ensure user profile is always populated so app is never blocked
      const fallbackProfile: UserProfile = {
        uid: firebaseUser.uid,
        name: firebaseUser.displayName || localStorage.getItem('moms_magic_user_name') || 'Customer',
        email: firebaseUser.email || '',
        phone: firebaseUser.phoneNumber || localStorage.getItem('moms_magic_user_phone') || '',
        walletBalance: 0,
        rewardPoints: 0,
        addresses: [],
        welcomeBonusClaimed: false,
        createdAt: new Date().toISOString()
      };
      set({ profile: fallbackProfile });
    }
  };

  // Listen to Auth State
  onAuthStateChanged(auth, async (firebaseUser) => {
    set({ loading: true });
    if (firebaseUser) {
      if (firebaseUser.phoneNumber) {
        localStorage.setItem('moms_magic_user_phone', firebaseUser.phoneNumber);
      }
      if (firebaseUser.displayName) {
        localStorage.setItem('moms_magic_user_name', firebaseUser.displayName);
      }
      set({ user: firebaseUser });
      await syncProfile(firebaseUser);
    } else {
      // Check if local guest session exists in localStorage
      const localName = localStorage.getItem('moms_magic_user_name');
      const localPhone = localStorage.getItem('moms_magic_user_phone');
      if (localName || localPhone) {
        const localProfile: UserProfile = {
          uid: 'local_' + (localPhone?.replace(/\D/g, '') || 'user'),
          name: localName || 'Guest User',
          email: localStorage.getItem('moms_magic_user_email') || '',
          phone: localPhone || '',
          walletBalance: 0,
          rewardPoints: 0,
          addresses: [],
          welcomeBonusClaimed: false,
          createdAt: new Date().toISOString()
        };
        set({ user: null, profile: localProfile });
      } else {
        set({ user: null, profile: null });
      }
    }
    set({ loading: false, initialized: true });
  });

  return {
    user: null,
    profile: null,
    loading: true,
    initialized: false,

    loginWithGoogle: async () => {
      set({ loading: true });
      try {
        const provider = new GoogleAuthProvider();
        const res = await signInWithPopup(auth, provider);
        if (res.user.displayName) {
          localStorage.setItem('moms_magic_user_name', res.user.displayName);
        }
        if (res.user.phoneNumber) {
          localStorage.setItem('moms_magic_user_phone', res.user.phoneNumber);
        }
      } catch (error) {
        console.error('Google sign-in error:', error);
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    loginWithEmail: async (email, password) => {
      set({ loading: true });
      try {
        const res = await signInWithEmailAndPassword(auth, email, password);
        if (res.user.displayName) {
          localStorage.setItem('moms_magic_user_name', res.user.displayName);
        }
      } catch (error) {
        console.error('Email login error:', error);
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    signUpWithEmail: async (email, password, name, phone) => {
      set({ loading: true });
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        localStorage.setItem('moms_magic_user_name', name);
        if (phone) {
          localStorage.setItem('moms_magic_user_phone', phone);
        }
        await syncProfile(credential.user);
      } catch (error) {
        console.error('Email sign up error:', error);
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    quickPhoneLogin: (name, phone) => {
      const cleanName = name.trim() || 'Guest Customer';
      const cleanPhone = phone.trim();
      localStorage.setItem('moms_magic_user_name', cleanName);
      if (cleanPhone) localStorage.setItem('moms_magic_user_phone', cleanPhone);

      const localProfile: UserProfile = {
        uid: 'local_' + (cleanPhone.replace(/\D/g, '') || Date.now().toString()),
        name: cleanName,
        email: '',
        phone: cleanPhone,
        walletBalance: 0,
        rewardPoints: 0,
        addresses: [],
        welcomeBonusClaimed: false,
        createdAt: new Date().toISOString()
      };
      set({ profile: localProfile, user: null, loading: false });
    },

    resetPassword: async (email) => {
      await sendPasswordResetEmail(auth, email.trim());
    },

    logout: async () => {
      set({ loading: true });
      try {
        await signOut(auth);
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        localStorage.removeItem('moms_magic_user_phone');
        localStorage.removeItem('moms_magic_user_name');
        localStorage.removeItem('moms_magic_user_email');
        set({ user: null, profile: null, loading: false });
      }
    },

    deleteAccount: async () => {
      const { user } = get();
      set({ loading: true });
      try {
        if (user) {
          const userDocRef = doc(db, 'users', user.uid);
          await deleteDoc(userDocRef).catch(() => {});
          await user.delete().catch(() => {});
        }
      } catch (err) {
        console.warn('Error deleting user from Firebase Auth:', err);
      } finally {
        localStorage.removeItem('moms_magic_user_phone');
        localStorage.removeItem('moms_magic_orders');
        localStorage.removeItem('moms_magic_admin_token');
        localStorage.removeItem('moms_magic_pwa_installed_logged');
        await signOut(auth).catch(() => {});
        set({ user: null, profile: null, loading: false });
      }
    },

    addAddress: async (label, address, lat, lng) => {
      const { user, profile } = get();
      if (!user || !profile) return;

      const addressId = Date.now().toString();
      const newAddress = { id: addressId, label, address, lat, lng };
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        addresses: arrayUnion(newAddress)
      });

      // Update state locally
      set({
        profile: {
          ...profile,
          addresses: [...profile.addresses, newAddress]
        }
      });
    },

    deleteAddress: async (addressId) => {
      const { user, profile } = get();
      if (!user || !profile) return;

      const addressToDelete = profile.addresses.find(a => a.id === addressId);
      if (!addressToDelete) return;

      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        addresses: arrayRemove(addressToDelete)
      });

      // Update state locally
      set({
        profile: {
          ...profile,
          addresses: profile.addresses.filter(a => a.id !== addressId)
        }
      });
    },

    deductWalletBalance: async (amount, orderId) => {
      const { user, profile } = get();
      if (!user || !profile) return;

      const newBalance = Math.max(0, profile.walletBalance - amount);
      const userDocRef = doc(db, 'users', user.uid);
      
      await updateDoc(userDocRef, {
        walletBalance: newBalance
      });

      // Create transaction record
      await addDoc(collection(db, 'walletTransactions'), {
        userId: user.uid,
        amount: -amount,
        type: 'order_payment',
        orderId,
        description: `Order #${orderId.slice(0, 8)} payment discount 🍽️`,
        createdAt: new Date().toISOString()
      });

      set({
        profile: {
          ...profile,
          walletBalance: newBalance
        }
      });
    },

    addWalletBalance: async (amount, reason) => {
      const { user, profile } = get();
      if (!user || !profile) return;

      const newBalance = profile.walletBalance + amount;
      const userDocRef = doc(db, 'users', user.uid);

      await updateDoc(userDocRef, {
        walletBalance: newBalance
      });

      // Create transaction record
      await addDoc(collection(db, 'walletTransactions'), {
        userId: user.uid,
        amount: amount,
        type: 'admin_adjustment',
        description: reason,
        createdAt: new Date().toISOString()
      });

      set({
        profile: {
          ...profile,
          walletBalance: newBalance
        }
      });
    }
  };
});
