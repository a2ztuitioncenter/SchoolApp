import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = 'auth';

export const authStorage = {
  async get() {
    const raw = await AsyncStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  },
  async set(payload) {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  },
  async clear() {
    await AsyncStorage.removeItem(AUTH_KEY);
  }
};
