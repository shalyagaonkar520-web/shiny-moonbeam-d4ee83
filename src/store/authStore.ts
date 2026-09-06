import { create } from 'zustand';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
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
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
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
          // New User Registration - Setup welcome profile and welcome bonus
          const newProfile: UserProfile = {
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Guest User',
            email: firebaseUser.email || '',
            phone: firebaseUser.phoneNumber || '',
            walletBalance: 50, // ₹50 welcome bonus
            rewardPoints: 0,
            addresses: [],
            welcomeBonusClaimed: true,
            createdAt: new Date().toISOString()
          };

          transaction.set(userDocRef, newProfile);

          // Add transaction log
          const transRef = doc(collection(db, 'walletTransactions'));
          transaction.set(transRef, {
            userId: firebaseUser.uid,
            amount: 50,
            type: 'welcome_bonus',
            description: 'One-time welcome bonus credited! 🎁',
            createdAt: new Date().toISOString()
          });

          set({ profile: newProfile });
        } else {
          // Existing User - Retrieve profile
          const data = userDoc.data() as UserProfile;
          set({ profile: data });
        }
      });
    } catch (error) {
      console.error('Error syncing profile document:', error);
      // Fallback read if transaction fails
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        set({ profile: docSnap.data() as UserProfile });
      }
    }
  };

  // Listen to Auth State
  onAuthStateChanged(auth, async (firebaseUser) => {
    set({ loading: true });
    if (firebaseUser) {
      // Set default local phone number to sync with legacy session data
      if (firebaseUser.phoneNumber) {
        localStorage.setItem('moms_magic_user_phone', firebaseUser.phoneNumber);
      }
      set({ user: firebaseUser });
      await syncProfile(firebaseUser);
    } else {
      set({ user: null, profile: null });
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
        await signInWithPopup(auth, provider);
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
        await signInWithEmailAndPassword(auth, email, password);
      } catch (error) {
        console.error('Email login error:', error);
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    signUpWithEmail: async (email, password, name) => {
      set({ loading: true });
      try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        // Manually trigger sync since displayName changes
        await syncProfile(credential.user);
      } catch (error) {
        console.error('Email sign up error:', error);
        throw error;
      } finally {
        set({ loading: false });
      }
    },

    logout: async () => {
      set({ loading: true });
      try {
        await signOut(auth);
        localStorage.removeItem('moms_magic_user_phone');
        set({ user: null, profile: null });
      } catch (error) {
        console.error('Logout error:', error);
      } finally {
        set({ loading: false });
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
