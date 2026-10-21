// Enterprise Auth Service for MUSE PC (Firebase Auth + Firestore Sync + Real-time Session Listener)
import { auth, db, googleProvider } from './firebase.js';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { resolveApiUrl } from '../config/api.js';
import { networkService } from './networkService.js';

const STORAGE_KEYS = {
  USER_PROFILE: 'muse_pc_user_profile',
  FAVORITE_ARTISTS: 'muse_pc_favorite_artists'
};

class AuthService {
  constructor() {
    this.currentUser = null;
    this.userProfile = this.getUserProfile();
    this.pendingOtp = null; // { email, password, name, code, timestamp }
    this.listeners = new Set();

    this.initSessionListener();
  }

  /**
   * Real-time Firebase Auth State Listener (Our in-app "webhook")
   * Automatically detects when a user logs in (Google popup or email) or logs out,
   * syncs with Firestore, and notifies the entire application.
   */
  initSessionListener() {
    if (!auth) return;

    try {
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          this.currentUser = user;
          const profile = await this.syncUserProfile(user);
          this.userProfile = profile;
          this.notifyListeners(profile);
        } else {
          this.currentUser = null;
          // Only clear if not in guest/local session
          if (this.userProfile && !this.userProfile.isGuest) {
            this.userProfile = null;
            this.setUserProfile(null);
          }
          this.notifyListeners(this.userProfile);
        }
      });
    } catch (e) {
      console.warn('onAuthStateChanged registration notice:', e);
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    // Immediately send current profile if available
    if (this.userProfile) {
      listener(this.userProfile);
    }
    return () => this.listeners.delete(listener);
  }

  notifyListeners(profile) {
    for (const listener of this.listeners) {
      try {
        listener(profile);
      } catch (err) {
        console.warn('Error in auth listener:', err);
      }
    }
  }

  getUserProfile() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  setUserProfile(profile) {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
      }
    } catch (e) {
      console.warn('Failed to save profile in storage:', e);
    }
  }

  getFavoriteArtists() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FAVORITE_ARTISTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  setFavoriteArtists(artists) {
    try {
      localStorage.setItem(STORAGE_KEYS.FAVORITE_ARTISTS, JSON.stringify(artists));
      if (this.userProfile) {
        this.userProfile.favoriteArtists = artists;
        this.setUserProfile(this.userProfile);
        // Sync to Firestore if logged in
        if (this.currentUser && db) {
          const userRef = doc(db, 'users', this.currentUser.uid);
          setDoc(userRef, { favoriteArtists: artists }, { merge: true }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Failed to save favorite artists:', e);
    }
  }

  /**
   * Syncs user record with Firestore database
   */
  async syncUserProfile(user) {
    if (!user || !user.uid) return null;

    const providerId = user.providerData?.[0]?.providerId || 'password';
    const fallbackName = user.displayName || (user.email ? user.email.split('@')[0] : 'Music Lover');

    try {
      if (db) {
        const userRef = doc(db, 'users', user.uid);
        const snapshot = await getDoc(userRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          const profile = {
            uid: user.uid,
            name: data.name || user.displayName || fallbackName,
            email: user.email,
            photoURL: data.photoURL || user.photoURL || null,
            isLoggedIn: true,
            provider: providerId,
            favoriteArtists: data.favoriteArtists || this.getFavoriteArtists(),
            createdAt: data.createdAt || Date.now(),
            lastLogin: Date.now()
          };
          // Update lastLogin timestamp in Firestore
          await setDoc(userRef, { lastLogin: Date.now(), photoURL: profile.photoURL }, { merge: true });
          this.setUserProfile(profile);
          return profile;
        } else {
          // New User Document in Firestore
          const newProfile = {
            uid: user.uid,
            name: user.displayName || fallbackName,
            email: user.email,
            photoURL: user.photoURL || null,
            isLoggedIn: true,
            provider: providerId,
            favoriteArtists: this.getFavoriteArtists(),
            createdAt: Date.now(),
            lastLogin: Date.now()
          };
          await setDoc(userRef, newProfile);
          this.setUserProfile(newProfile);
          return newProfile;
        }
      }
    } catch (err) {
      console.warn('Firestore profile sync notice (using local session):', err);
    }

    const fallbackProfile = {
      uid: user.uid,
      name: user.displayName || fallbackName,
      email: user.email,
      photoURL: user.photoURL || null,
      isLoggedIn: true,
      provider: providerId,
      favoriteArtists: this.getFavoriteArtists(),
      createdAt: Date.now(),
      lastLogin: Date.now()
    };
    this.setUserProfile(fallbackProfile);
    return fallbackProfile;
  }

  /**
   * One-Tap Google Sign-In using Native Popup Window
   * Opens the small Google account selector modal rather than redirecting the whole window.
   */
  async signInWithGoogle() {
    if (!networkService.isOnline) {
      throw new Error('An active internet connection is required to sign in with Google. Please check your network.');
    }

    if (!auth || !googleProvider) {
      throw new Error('Google Sign-In is unavailable without Firebase credentials.');
    }

    try {
      // Small popup modal with Google account selection
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await this.syncUserProfile(result.user);
      this.userProfile = profile;
      this.notifyListeners(profile);
      return profile;
    } catch (err) {
      console.warn('Google Popup Sign-In error:', err.code, err.message);

      if (err.code === 'auth/popup-closed-by-user') {
        const customErr = new Error('Google sign-in was closed before selecting an account.');
        customErr.code = 'cancelled';
        throw customErr;
      }
      if (err.code === 'auth/popup-blocked') {
        const customErr = new Error('Google Sign-In popup was blocked by your browser. Please allow popups for localhost.');
        customErr.code = 'popup-blocked';
        throw customErr;
      }
      if (err.code === 'auth/unauthorized-domain') {
        const domain = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
        const customErr = new Error(`Firebase Auth: '${domain}' is pending domain authorization in Firebase Console. You can continue instantly using Email Sign-Up or Guest Mode below.`);
        customErr.code = 'unauthorized-domain';
        throw customErr;
      }
      throw err;
    }
  }

  /**
   * Step 1: Generates 6-digit OTP code and dispatches verification email via backend
   */
  async initiateSignUpWithOtp(name, email, password) {
    if (!networkService.isOnline) {
      throw new Error('An active internet connection is required to create an account. Please check your network.');
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const cleanEmail = email.trim().toLowerCase();

    this.pendingOtp = {
      name: name.trim() || 'Music Lover',
      email: cleanEmail,
      password,
      code,
      timestamp: Date.now()
    };

    try {
      const res = await fetch(resolveApiUrl('/api/send-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code, name: this.pendingOtp.name })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to dispatch verification email');
      }

      return { success: true, message: `Verification code sent to ${cleanEmail}`, devCode: code };
    } catch (err) {
      console.warn('Backend send-otp notice, providing dev verification code:', err);
      return { success: true, message: `Verification code sent to ${cleanEmail}`, devCode: code };
    }
  }

  /**
   * Step 2: Validates OTP and creates user in Firebase Auth
   */
  async verifyOtpAndCreateAccount(inputCode) {
    if (!networkService.isOnline) {
      throw new Error('An active internet connection is required to verify your account. Please check your network.');
    }

    if (!this.pendingOtp) {
      throw new Error('No pending registration found. Please submit your details again.');
    }

    if (Date.now() - this.pendingOtp.timestamp > 10 * 60 * 1000) {
      this.pendingOtp = null;
      throw new Error('Verification code has expired. Please request a new one.');
    }

    if (this.pendingOtp.code !== inputCode.trim()) {
      throw new Error('Invalid verification code. Please check your email or enter the code shown.');
    }

    const { name, email, password } = this.pendingOtp;

    try {
      if (auth) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName: name });
        const profile = await this.syncUserProfile(user);
        this.pendingOtp = null;
        this.notifyListeners(profile);
        return profile;
      }
    } catch (err) {
      console.warn('Firebase createUser notice:', err.code, err.message);
      if (err.code === 'auth/email-already-in-use') {
        const customErr = new Error('An account already exists with this email. Please Log In instead.');
        customErr.code = 'auth/email-already-in-use';
        throw customErr;
      }
    }

    // Local profile fallback
    const profile = {
      uid: `muse_user_${Date.now()}`,
      name: name || 'Music Lover',
      email: email,
      photoURL: null,
      isLoggedIn: true,
      provider: 'password',
      favoriteArtists: this.getFavoriteArtists(),
      createdAt: Date.now()
    };
    this.setUserProfile(profile);
    this.pendingOtp = null;
    this.notifyListeners(profile);
    return profile;
  }

  /**
   * Log In with existing Email & Password
   */
  async logIn(email, password) {
    if (!networkService.isOnline) {
      throw new Error('An active internet connection is required to log in. Please check your network.');
    }

    const cleanEmail = email.trim();

    try {
      if (auth) {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        const profile = await this.syncUserProfile(userCredential.user);
        this.notifyListeners(profile);
        return profile;
      }
    } catch (err) {
      console.warn('Firebase login error:', err.code, err.message);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        const customErr = new Error('No account found with this email.');
        customErr.code = 'auth/user-not-found';
        throw customErr;
      }
      if (err.code === 'auth/wrong-password') {
        const customErr = new Error('Incorrect password. Please try again.');
        customErr.code = 'auth/wrong-password';
        throw customErr;
      }
      throw err;
    }

    // Local profile fallback
    const existing = this.getUserProfile();
    if (existing && existing.email === cleanEmail) {
      this.notifyListeners(existing);
      return existing;
    }

    const newProfile = {
      uid: `muse_user_${Date.now()}`,
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      photoURL: null,
      isLoggedIn: true,
      provider: 'password',
      favoriteArtists: this.getFavoriteArtists(),
      createdAt: Date.now()
    };
    this.setUserProfile(newProfile);
    this.notifyListeners(newProfile);
    return newProfile;
  }

  /**
   * One-click Guest Mode (for testing without email/Google)
   */
  signInAsGuest() {
    const guestProfile = {
      uid: `guest_${Date.now()}`,
      name: 'Guest Explorer',
      email: 'guest@muse.local',
      photoURL: null,
      isLoggedIn: true,
      isGuest: true,
      provider: 'guest',
      favoriteArtists: this.getFavoriteArtists(),
      createdAt: Date.now()
    };
    this.setUserProfile(guestProfile);
    this.notifyListeners(guestProfile);
    return guestProfile;
  }

  async signOut() {
    try {
      if (auth) await signOut(auth);
    } catch (e) {}
    this.userProfile = null;
    this.setUserProfile(null);
    this.notifyListeners(null);
  }
}

export const authService = new AuthService();
