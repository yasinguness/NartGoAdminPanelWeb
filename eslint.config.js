import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unusedImports from 'eslint-plugin-unused-imports'
import tseslint from 'typescript-eslint'

// globals@>=14 paketinde "AudioWorkletGlobalScope " gibi sondaki boşluklu anahtarlar
// var; eslint 8.57 flat-config doğrulayıcısı bunda patlıyor (lint tamamen kırık).
// Anahtarları trim'leyerek sanitize et — npm run lint'i de onarır.
const browserGlobals = Object.fromEntries(
  Object.entries(globals.browser).map(([key, value]) => [key.trim(), value]),
)

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: browserGlobals,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'unused-imports': unusedImports,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Kullanılmayan import'ları otomatik temizle (--fix). Sadece import'lar;
      // değişken/parametre kaldırma yan etkili olabilir, manuel ele alınır.
      'unused-imports/no-unused-imports': 'error',
      // tsc noUnusedLocals zaten yakalıyor — lint tarafında gürültü yapmasın.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
)
