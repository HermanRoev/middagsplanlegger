import js from "@eslint/js"
import tseslint from "typescript-eslint"
import react from "eslint-plugin-react"
import reactHooks from "eslint-plugin-react-hooks"
import next from "@next/eslint-plugin-next"

export default [
	{
		ignores: [
			"**/.next/**",
			"**/node_modules/**",
			"**/dist/**",
			"**/coverage/**",
			"mobile/**",
			".eslintrc.cjs",
		],
	},
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				ecmaFeatures: { jsx: true },
			},
		},
		plugins: {
			react,
			"react-hooks": reactHooks,
			"@next/next": next,
		},
		settings: {
			react: { version: "detect" },
		},
		rules: {
			"react/react-in-jsx-scope": "off",
			"react/prop-types": "off",
			...next.configs.recommended.rules,
		},
	},
]
