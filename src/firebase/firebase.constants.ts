export const FIREBASE_APP = Symbol('FIREBASE_APP');
export const FIRESTORE = Symbol('FIRESTORE');
export const FIREBASE_AUTH = Symbol('FIREBASE_AUTH');

// 三 Bucket 架構 Storage Tokens
export const STORAGE_TEMP = Symbol('STORAGE_TEMP');       // 暫存 Bucket（前端上傳）
export const STORAGE_MAIN = Symbol('STORAGE_MAIN');       // 正式 Bucket（Eventarc 觸發源）
export const STORAGE_EVENTARC = Symbol('STORAGE_EVENTARC'); // Eventarc Bucket（縮圖產物）
