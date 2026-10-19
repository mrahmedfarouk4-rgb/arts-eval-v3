/**
 * تعريفات أنواع صور Expo
 * (تمنع TypeScript من الشكوى عند استيراد ملفات الصور)
 */

declare module '*.png' {
  const content: number;
  export default content;
}

declare module '*.jpg' {
  const content: number;
  export default content;
}

declare module '*.jpeg' {
  const content: number;
  export default content;
}

declare module '*.gif' {
  const content: number;
  export default content;
}

declare module '*.webp' {
  const content: number;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.ttf' {
  const content: number;
  export default content;
}

declare module '*.otf' {
  const content: number;
  export default content;
}

declare module '*.json' {
  const content: any;
  export default content;
}
