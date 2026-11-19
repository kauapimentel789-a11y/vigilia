import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
  },
  {
    files: ['src/ui/**/*.{ts,tsx}', 'src/main.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
  {
    // Regra de fronteira: o motor é TypeScript puro e nunca conhece a interface.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react/*', 'react-dom', 'react-dom/*'],
              message: 'O motor (src/engine) não pode depender do React.',
            },
            {
              group: ['**/ui', '**/ui/**'],
              message: 'O motor (src/engine) não pode importar código da interface (src/ui).',
            },
            {
              group: ['**/content', '**/content/**'],
              message:
                'O motor (src/engine) não pode importar o conteúdo (src/content). Receba as definições como parâmetro.',
            },
          ],
        },
      ],
    },
  },
);
